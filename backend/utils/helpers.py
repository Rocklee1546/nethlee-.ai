import csv
import io
import json
from datetime import datetime

# Try to import ReportLab for PDF generation
REPORTLAB_AVAILABLE = False
try:
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    REPORTLAB_AVAILABLE = True
except ImportError:
    pass

def generate_csv_report(website, nlp_stats, qa_history):
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Title / Metadata
    writer.writerow(["NETHLEE AI - WEBSITE ANALYSIS REPORT"])
    writer.writerow(["Website URL", website['url']])
    writer.writerow(["Crawl Date", website['last_updated']])
    writer.writerow(["Pages Crawled", website['pages_count']])
    writer.writerow(["Total Words", website['total_words']])
    writer.writerow(["Total Chunks", website['chunks_count']])
    writer.writerow([])
    
    # Keywords
    writer.writerow(["TOP EXTRACTED KEYWORDS"])
    writer.writerow(["Keyword", "Score (Rank)"])
    for idx, kw in enumerate(nlp_stats.get('keywords', []), 1):
        writer.writerow([kw, idx])
    writer.writerow([])
    
    # Entities
    writer.writerow(["NAMED ENTITIES DETECTED"])
    writer.writerow(["Entity Text", "Label"])
    for ent in nlp_stats.get('entities', []):
        writer.writerow([ent['text'], ent['label']])
    writer.writerow([])
    
    # Questions Asked
    writer.writerow(["CHATBOT QUESTION & ANSWER LOG"])
    writer.writerow(["Timestamp", "Question", "Answer", "Confidence Score"])
    for chat in qa_history:
        writer.writerow([chat['timestamp'], chat['question'], chat['answer'].replace('\n', ' '), chat['confidence_score']])
        
    return output.getvalue()

def generate_pdf_report(website, nlp_stats, qa_history):
    if not REPORTLAB_AVAILABLE:
        # Graceful fallback to text file formatted as report if PDF library is not available
        output = io.BytesIO()
        text = f"""NETHLEE AI - WEBSITE ANALYSIS REPORT
=====================================
URL: {website['url']}
Date: {website['last_updated']}
Pages Crawled: {website['pages_count']}
Total Words: {website['total_words']}
Total Chunks: {website['chunks_count']}

TOP EXTRACTED KEYWORDS:
{', '.join(nlp_stats.get('keywords', []))}

NAMED ENTITIES DETECTED:
"""
        for ent in nlp_stats.get('entities', [])[:15]:
            text += f"- {ent['text']} ({ent['label']})\n"
            
        text += "\nCHATBOT QUESTION & ANSWER LOG:\n"
        for idx, chat in enumerate(qa_history, 1):
            text += f"\nQ{idx}: {chat['question']}\nA: {chat['answer']}\nConfidence: {chat['confidence_score']}\n"
            
        output.write(text.encode('utf-8'))
        output.seek(0)
        return output.getvalue(), "text/plain", f"nethlee_report_{website['id']}.txt"
        
    # PDF generation using ReportLab
    pdf_buffer = io.BytesIO()
    doc = SimpleDocTemplate(pdf_buffer, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        textColor=colors.HexColor('#6366F1'),
        spaceAfter=15
    )
    
    section_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        textColor=colors.HexColor('#8B5CF6'),
        spaceBefore=12,
        spaceAfter=6
    )
    
    normal_style = styles['Normal']
    
    story = []
    
    # Document Header
    story.append(Paragraph("NethLee AI Website Report", title_style))
    story.append(Paragraph(f"<b>Generated On:</b> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", normal_style))
    story.append(Paragraph(f"<b>Source URL:</b> {website['url']}", normal_style))
    story.append(Spacer(1, 15))
    
    # Stats Table
    stats_data = [
        [Paragraph("<b>Metric</b>", normal_style), Paragraph("<b>Value</b>", normal_style)],
        ["Pages Crawled", str(website['pages_count'])],
        ["Total Words", f"{website['total_words']:,}"],
        ["Total Chunks Created", str(website['chunks_count'])],
        ["Crawl Status", website['status'].upper()],
        ["Processing Time", f"{website['processing_time']} sec"]
    ]
    t = Table(stats_data, colWidths=[200, 300])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F3F4F6')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('BOTTOMPADDING', (0,0), (-1,0), 6),
        ('GRID', (0,0), (-1,-1), 1, colors.HexColor('#E5E7EB')),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t)
    story.append(Spacer(1, 15))
    
    # Keywords Section
    story.append(Paragraph("Top Keywords Extracted", section_style))
    keywords_text = ", ".join(nlp_stats.get('keywords', []))
    story.append(Paragraph(keywords_text or "No keywords extracted", normal_style))
    story.append(Spacer(1, 15))
    
    # Entities Section
    story.append(Paragraph("Named Entities", section_style))
    entities = nlp_stats.get('entities', [])
    if entities:
        ent_rows = [[Paragraph("<b>Text</b>", normal_style), Paragraph("<b>Category</b>", normal_style)]]
        for ent in entities[:10]: # Top 10
            ent_rows.append([ent['text'], ent['label']])
        ent_table = Table(ent_rows, colWidths=[250, 250])
        ent_table.setStyle(TableStyle([
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E5E7EB')),
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F9FAFB')),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(ent_table)
    else:
        story.append(Paragraph("No named entities detected.", normal_style))
        
    story.append(Spacer(1, 15))
    
    # Q&A Section
    story.append(Paragraph("Recent Questions Answered", section_style))
    if qa_history:
        for idx, chat in enumerate(qa_history[:5], 1): # Top 5 QAs
            q_p = Paragraph(f"<b>Q{idx}: {chat['question']}</b>", normal_style)
            a_p = Paragraph(f"Answer: {chat['answer']}", normal_style)
            c_p = Paragraph(f"Confidence: {chat['confidence_score'] * 100}%", normal_style)
            story.append(q_p)
            story.append(a_p)
            story.append(c_p)
            story.append(Spacer(1, 8))
    else:
        story.append(Paragraph("No question history available for this website.", normal_style))
        
    doc.build(story)
    pdf_buffer.seek(0)
    return pdf_buffer.getvalue(), "application/pdf", f"nethlee_report_{website['id']}.pdf"
