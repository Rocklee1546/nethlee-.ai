import sqlite3
import os
import json
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'data', 'nethlee.db')

def get_db_connection():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create websites table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS websites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT UNIQUE,
        status TEXT,
        pages_count INTEGER DEFAULT 0,
        total_words INTEGER DEFAULT 0,
        chunks_count INTEGER DEFAULT 0,
        processing_time REAL DEFAULT 0.0,
        last_updated TEXT
    )
    ''')
    
    # Create documents table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        website_id INTEGER,
        url TEXT,
        content TEXT,
        clean_content TEXT,
        FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE
    )
    ''')
    
    # Create chunks table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS chunks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        website_id INTEGER,
        document_id INTEGER,
        chunk_index INTEGER,
        text TEXT,
        metadata TEXT,
        FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    )
    ''')
    
    # Create chat_history table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS chat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        website_id INTEGER,
        question TEXT,
        answer TEXT,
        timestamp TEXT,
        confidence_score REAL,
        sources TEXT,
        FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE
    )
    ''')
    
    # Create settings table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )
    ''')
    
    # Seed default settings
    cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', 'dark')")
    cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('language', 'en')")
    cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('animation_speed', 'normal')")
    
    conn.commit()
    conn.close()

# Websites functions
def add_website(url):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT OR REPLACE INTO websites (url, status, last_updated) VALUES (?, ?, ?)",
            (url, 'processing', datetime.now().isoformat())
        )
        conn.commit()
        website_id = cursor.lastrowid
        return website_id
    finally:
        conn.close()

def update_website_status(website_id, status, pages_count=0, total_words=0, chunks_count=0, processing_time=0.0):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            UPDATE websites 
            SET status = ?, pages_count = ?, total_words = ?, chunks_count = ?, processing_time = ?, last_updated = ?
            WHERE id = ?
        ''', (status, pages_count, total_words, chunks_count, processing_time, datetime.now().isoformat(), website_id))
        conn.commit()
    finally:
        conn.close()

def get_websites():
    conn = get_db_connection()
    try:
        rows = conn.execute("SELECT * FROM websites ORDER BY last_updated DESC").fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()

def delete_website(website_id):
    conn = get_db_connection()
    try:
        # Cascade deletes because of FKs (requires PRAGMA foreign_keys = ON)
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute("DELETE FROM websites WHERE id = ?", (website_id,))
        conn.commit()
    finally:
        conn.close()

# Documents and chunks
def add_document(website_id, url, content, clean_content):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO documents (website_id, url, content, clean_content) VALUES (?, ?, ?, ?)",
            (website_id, url, content, clean_content)
        )
        conn.commit()
        return cursor.lastrowid
    finally:
        conn.close()

def add_chunks(chunks_list):
    # list of tuples: (website_id, document_id, chunk_index, text, metadata_json)
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.executemany(
            "INSERT INTO chunks (website_id, document_id, chunk_index, text, metadata) VALUES (?, ?, ?, ?, ?)",
            chunks_list
        )
        conn.commit()
    finally:
        conn.close()

def get_chunks_for_website(website_id):
    conn = get_db_connection()
    try:
        rows = conn.execute("SELECT * FROM chunks WHERE website_id = ?", (website_id,)).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()

# Chat History functions
def add_chat_history(website_id, question, answer, confidence_score, sources):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO chat_history (website_id, question, answer, timestamp, confidence_score, sources)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (website_id, question, answer, datetime.now().isoformat(), confidence_score, json.dumps(sources)))
        conn.commit()
        return cursor.lastrowid
    finally:
        conn.close()

def get_chat_history(website_id=None):
    conn = get_db_connection()
    try:
        if website_id:
            rows = conn.execute('''
                SELECT c.*, w.url as website_url 
                FROM chat_history c 
                JOIN websites w ON c.website_id = w.id
                WHERE c.website_id = ? 
                ORDER BY c.timestamp DESC
            ''', (website_id,)).fetchall()
        else:
            rows = conn.execute('''
                SELECT c.*, w.url as website_url 
                FROM chat_history c 
                LEFT JOIN websites w ON c.website_id = w.id
                ORDER BY c.timestamp DESC
            ''').fetchall()
        
        result = []
        for r in rows:
            d = dict(r)
            d['sources'] = json.loads(d['sources']) if d['sources'] else []
            result.append(d)
        return result
    finally:
        conn.close()

def clear_chat_history():
    conn = get_db_connection()
    try:
        conn.execute("DELETE FROM chat_history")
        conn.commit()
    finally:
        conn.close()

def delete_chat_item(chat_id):
    conn = get_db_connection()
    try:
        conn.execute("DELETE FROM chat_history WHERE id = ?", (chat_id,))
        conn.commit()
    finally:
        conn.close()

# Settings
def get_settings():
    conn = get_db_connection()
    try:
        rows = conn.execute("SELECT key, value FROM settings").fetchall()
        return {r['key']: r['value'] for r in rows}
    finally:
        conn.close()

def update_setting(key, value):
    conn = get_db_connection()
    try:
        conn.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (key, str(value)))
        conn.commit()
    finally:
        conn.close()

# Initialize DB on import
init_db()
