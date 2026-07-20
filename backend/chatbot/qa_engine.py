import json
from database.db_manager import get_chunks_for_website, get_db_connection
from nlp.nlp_pipeline import VectorStore, tokenize, normalize_text

# In-memory cache for VectorStores to avoid recomputing embeddings on every chat query
VECTOR_STORES_CACHE = {}

def get_vector_store(website_id):
    if website_id in VECTOR_STORES_CACHE:
        return VECTOR_STORES_CACHE[website_id]
        
    chunks_data = get_chunks_for_website(website_id)
    chunks = [c['text'] for c in chunks_data]
    
    if not chunks:
        return None
        
    vstore = VectorStore(chunks)
    VECTOR_STORES_CACHE[website_id] = vstore
    return vstore

def clear_vector_store_cache(website_id=None):
    if website_id:
        VECTOR_STORES_CACHE.pop(website_id, None)
    else:
        VECTOR_STORES_CACHE.clear()

def find_sentences_with_keywords(text, keywords):
    # Split text into sentences
    sentences = re.split(r'(?<=[.!?])\s+', text)
    matches = []
    
    for sentence in sentences:
        score = 0
        s_lower = sentence.lower()
        for kw in keywords:
            if kw in s_lower:
                score += 1
        if score > 0:
            matches.append((sentence, score))
            
    # Sort by number of keyword matches
    matches.sort(key=lambda x: x[1], reverse=True)
    return [m[0] for m in matches]

import re

def synthesize_answer(query, search_results, website_url):
    if not search_results:
        return "I'm sorry, I couldn't find any relevant information on the scraped website to answer your question.", 0.0, []
        
    # Extract keywords from the query
    query_tokens = tokenize(normalize_text(query))
    query_words = [t for t in query_tokens if len(t) > 3]
    
    # Extract the top matching chunks
    top_chunks = [res['chunk'] for res in search_results]
    top_score = search_results[0]['score']
    
    # Synthesize answers by selecting the most informative sentences
    sentences_to_include = []
    seen_sentences = set()
    
    for chunk in top_chunks:
        # Get sentences from the chunk
        sentences = re.split(r'(?<=[.!?])\s+', chunk)
        for sentence in sentences:
            sentence = sentence.strip()
            if len(sentence) < 15:
                continue
                
            # Score sentence against query words
            score = sum(1 for word in query_words if word.lower() in sentence.lower())
            
            # Boost score if sentence contains question indicators/answers
            if any(term in sentence.lower() for term in ['is', 'are', 'created', 'built', 'provides', 'allows', 'designed']):
                score += 0.5
                
            if score > 0.5:
                # Deduplicate similar sentences
                simplified = re.sub(r'[^a-zA-Z]', '', sentence.lower())
                if simplified not in seen_sentences:
                    seen_sentences.add(simplified)
                    sentences_to_include.append((sentence, score))
                    
    # Sort by sentence relevance score
    sentences_to_include.sort(key=lambda x: x[1], reverse=True)
    
    # Take top sentences and structure them
    selected_sentences = [s[0] for s in sentences_to_include[:5]]
    
    # If no matching sentences, fallback to returning the top chunk's first few sentences
    if not selected_sentences:
        fallback_chunk = top_chunks[0]
        selected_sentences = re.split(r'(?<=[.!?])\s+', fallback_chunk)[:3]
        
    # Build markdown response
    answer_parts = []
    answer_parts.append(f"### Answer Summary\n")
    
    # Main summary sentence
    if selected_sentences:
        answer_parts.append(f"{selected_sentences[0]}\n")
    
    if len(selected_sentences) > 1:
        answer_parts.append(f"\n### Key Details & Findings\n")
        for idx, sentence in enumerate(selected_sentences[1:], 1):
            # Clean brackets or weird endings
            sentence = sentence.strip().rstrip(',')
            answer_parts.append(f"- **Point {idx}**: {sentence}")
            
    # Calculate confidence score (normalized between 0.1 and 0.99)
    # Cosine/BM25 combined score is typically between 0.1 and 1.2
    confidence = min(0.99, max(0.35, top_score * 0.85))
    confidence = round(confidence, 2)
    
    # Identify sources
    sources = []
    conn = get_db_connection()
    try:
        # Find urls corresponding to chunks
        for res in search_results:
            chunk_text = res['chunk']
            row = conn.execute('''
                SELECT d.url 
                FROM chunks c 
                JOIN documents d ON c.document_id = d.id 
                WHERE c.text = ?
                LIMIT 1
            ''', (chunk_text,)).fetchone()
            
            source_url = row['url'] if row else website_url
            if source_url not in sources:
                sources.append(source_url)
    except Exception:
        sources = [website_url]
    finally:
        conn.close()
        
    return "\n".join(answer_parts), confidence, sources

def answer_question(website_id, question):
    vstore = get_vector_store(website_id)
    
    # Fetch website base URL for sources
    conn = get_db_connection()
    row = conn.execute("SELECT url FROM websites WHERE id = ?", (website_id,)).fetchone()
    website_url = row['url'] if row else "Website Source"
    conn.close()
    
    if not vstore:
        return {
            'answer': "This website has not been indexed successfully yet. Please crawl or recrawl the website first.",
            'confidence': 0.0,
            'sources': []
        }
        
    # Search
    search_results = vstore.search(question, top_k=3)
    
    # Synthesize
    answer, confidence, sources = synthesize_answer(question, search_results, website_url)
    
    return {
        'answer': answer,
        'confidence': confidence,
        'sources': sources
    }
