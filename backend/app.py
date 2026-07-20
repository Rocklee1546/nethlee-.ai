import os
import sys
import json
from flask import Flask, request, jsonify, send_file, make_response
from flask_cors import CORS
from datetime import datetime

# Adjust Python path to resolve imports properly
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.db_manager import (
    add_website, update_website_status, get_websites, delete_website,
    add_document, add_chunks, get_db_connection, add_chat_history,
    get_chat_history, clear_chat_history, delete_chat_item,
    get_settings, update_setting
)
from scraper.scraper_manager import crawl_website, chunk_text
from nlp.nlp_pipeline import process_website_data
from chatbot.qa_engine import answer_question, clear_vector_store_cache
from utils.helpers import generate_csv_report, generate_pdf_report

app = Flask(__name__)
# Enable CORS for frontend connection (port 5173 or other local hosts)
CORS(app)

@app.route('/api/websites', methods=['GET'])
def list_websites():
    websites = get_websites()
    return jsonify(websites)

@app.route('/api/websites/<int:website_id>', methods=['DELETE'])
def remove_website(website_id):
    try:
        delete_website(website_id)
        # Clear vector cache
        clear_vector_store_cache(website_id)
        return jsonify({'success': True, 'message': 'Website deleted successfully'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/scrape', methods=['POST'])
def start_scrape():
    data = request.json
    url = data.get('url')
    
    if not url:
        return jsonify({'success': False, 'message': 'URL is required'}), 400
        
    # Validate scheme
    if not url.startswith('http://') and not url.startswith('https://'):
        url = 'https://' + url
        
    try:
        # 1. Register in database
        website_id = add_website(url)
        
        # 2. Run crawl (BFS up to 15 pages)
        pages, total_words, processing_time = crawl_website(url, max_pages=15)
        
        if not pages:
            update_website_status(website_id, 'failed')
            return jsonify({'success': False, 'message': 'Failed to crawl any page from the website'}), 500
            
        # 3. Store documents & chunks
        chunks_to_insert = []
        chunks_count = 0
        
        for doc_idx, page in enumerate(pages):
            doc_id = add_document(website_id, page['url'], page['raw_content'], page['clean_content'])
            
            # Chunk document
            page_chunks = chunk_text(page['clean_content'])
            for chunk_idx, text_chunk in enumerate(page_chunks):
                chunks_to_insert.append((
                    website_id,
                    doc_id,
                    chunk_idx,
                    text_chunk,
                    json.dumps({'url': page['url'], 'title': page['url'].split('/')[-1] or 'Home'})
                ))
                chunks_count += 1
                
        if chunks_to_insert:
            add_chunks(chunks_to_insert)
            
        # 4. Update website status in SQLite
        update_website_status(website_id, 'completed', len(pages), total_words, chunks_count, processing_time)
        
        # Clear cache for this site to force re-indexing on first chat query
        clear_vector_store_cache(website_id)
        
        return jsonify({
            'success': True,
            'website_id': website_id,
            'pages_crawled': len(pages),
            'total_words': total_words,
            'chunks_created': chunks_count,
            'processing_time': processing_time
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    website_id = data.get('website_id')
    question = data.get('question')
    
    if not website_id or not question:
        return jsonify({'success': False, 'message': 'Website ID and Question are required'}), 400
        
    try:
        # Run question-answering
        response = answer_question(website_id, question)
        
        # Store in chat history
        add_chat_history(
            website_id,
            question,
            response['answer'],
            response['confidence'],
            response['sources']
        )
        
        return jsonify(response)
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/chat/history', methods=['GET'])
def chat_history():
    website_id = request.args.get('website_id')
    if website_id:
        try:
            website_id = int(website_id)
        except ValueError:
            website_id = None
            
    history = get_chat_history(website_id)
    return jsonify(history)

@app.route('/api/chat/history', methods=['DELETE'])
def clear_history():
    try:
        clear_chat_history()
        return jsonify({'success': True, 'message': 'Chat history cleared'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/chat/history/<int:chat_id>', methods=['DELETE'])
def remove_chat_item(chat_id):
    try:
        delete_chat_item(chat_id)
        return jsonify({'success': True, 'message': 'History item deleted'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/dashboard/stats', methods=['GET'])
def get_dashboard_stats():
    conn = get_db_connection()
    try:
        websites = conn.execute("SELECT * FROM websites").fetchall()
        total_websites = len(websites)
        
        crawled_count = sum(1 for w in websites if w['status'] == 'completed')
        total_pages = sum(w['pages_count'] for w in websites)
        total_words = sum(w['total_words'] for w in websites)
        total_chunks = sum(w['chunks_count'] for w in websites)
        
        # Avg processing time
        avg_processing_time = 0.0
        if total_websites > 0:
            avg_processing_time = round(sum(w['processing_time'] for w in websites) / total_websites, 2)
            
        chats = conn.execute("SELECT * FROM chat_history").fetchall()
        total_questions = len(chats)
        
        # Calculate mock NLP accuracy / average confidence
        avg_confidence = 0.0
        if total_questions > 0:
            avg_confidence = round(sum(c['confidence_score'] for c in chats) / total_questions, 2)
        else:
            avg_confidence = 0.85 # default high level
            
        # Analytics charts
        # 1. Questions per day (last 7 days)
        # 2. Top websites visited/queried
        top_websites = conn.execute('''
            SELECT w.url, COUNT(c.id) as count 
            FROM chat_history c 
            JOIN websites w ON c.website_id = w.id 
            GROUP BY c.website_id 
            ORDER BY count DESC 
            LIMIT 5
        ''').fetchall()
        
        top_websites_list = [{'url': w['url'], 'queries': w['count']} for w in top_websites]
        
        return jsonify({
            'total_websites': total_websites,
            'crawled_completed': crawled_count,
            'total_pages': total_pages,
            'total_words': total_words,
            'total_chunks': total_chunks,
            'total_questions': total_questions,
            'average_response_time': avg_processing_time,
            'nlp_accuracy': avg_confidence,
            'top_websites': top_websites_list
        })
    finally:
        conn.close()

@app.route('/api/nlp/stats', methods=['GET'])
def get_nlp_stats():
    website_id = request.args.get('website_id')
    if not website_id:
        # Fallback to the latest website
        conn = get_db_connection()
        row = conn.execute("SELECT id FROM websites ORDER BY last_updated DESC LIMIT 1").fetchone()
        conn.close()
        if row:
            website_id = row['id']
        else:
            return jsonify({'success': False, 'message': 'No crawled websites found'}), 404
            
    try:
        chunks_data = get_chunks_for_website(website_id)
        chunks = [c['text'] for c in chunks_data]
        
        if not chunks:
            return jsonify({'success': False, 'message': 'No text content chunks found'}), 400
            
        nlp_data = process_website_data(chunks)
        return jsonify(nlp_data)
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/settings', methods=['GET', 'POST'])
def manage_settings():
    if request.method == 'GET':
        settings = get_settings()
        return jsonify(settings)
    else:
        data = request.json
        for k, v in data.items():
            update_setting(k, v)
        return jsonify({'success': True, 'message': 'Settings updated'})

@app.route('/api/reports/export', methods=['GET'])
def export_report():
    format_type = request.args.get('format', 'pdf').lower()
    
    if format_type == 'db':
        try:
            from database.db_manager import DB_PATH
            return send_file(DB_PATH, as_attachment=True, download_name="nethlee_backup.db")
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)}), 500
            
    website_id = request.args.get('website_id')
    if not website_id:
        return jsonify({'success': False, 'message': 'Website ID is required'}), 400
        
    conn = get_db_connection()
    website_row = conn.execute("SELECT * FROM websites WHERE id = ?", (website_id,)).fetchone()
    
    if not website_row:
        conn.close()
        return jsonify({'success': False, 'message': 'Website not found'}), 404
        
    website = dict(website_row)
    
    # Fetch chats
    chats_rows = conn.execute("SELECT * FROM chat_history WHERE website_id = ?", (website_id,)).fetchall()
    chats = [dict(c) for c in chats_rows]
    
    # Process text for keywords & entities
    chunks_data = get_chunks_for_website(website_id)
    chunks = [c['text'] for c in chunks_data]
    nlp_stats = process_website_data(chunks) if chunks else {}
    
    conn.close()
    
    if format_type == 'csv':
        csv_data = generate_csv_report(website, nlp_stats, chats)
        response = make_response(csv_data)
        response.headers["Content-Disposition"] = f"attachment; filename=nethlee_report_{website_id}.csv"
        response.headers["Content-type"] = "text/csv"
        return response
    else:
        pdf_data, content_type, filename = generate_pdf_report(website, nlp_stats, chats)
        response = make_response(pdf_data)
        response.headers["Content-Disposition"] = f"attachment; filename={filename}"
        response.headers["Content-type"] = content_type
        return response

if __name__ == '__main__':
    # Default Flask local dev server
    app.run(host='0.0.0.0', port=5000, debug=True)
