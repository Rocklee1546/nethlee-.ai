import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin
import time
import re

def clean_html(html_content):
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Remove script and style elements
    for element in soup(["script", "style", "nav", "footer", "header", "aside"]):
        element.decompose()
        
    # Get text
    text = soup.get_text()
    
    # Break into lines and remove leading and trailing whitespace
    lines = (line.strip() for line in text.splitlines())
    # break multi-headlines into a line each
    chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
    # drop blank lines
    text = '\n'.join(chunk for chunk in chunks if chunk)
    
    return text

def get_links(html_content, base_url):
    soup = BeautifulSoup(html_content, 'html.parser')
    links = set()
    base_domain = urlparse(base_url).netloc
    
    for a_tag in soup.find_all('a', href=True):
        href = a_tag['href']
        full_url = urljoin(base_url, href)
        parsed_url = urlparse(full_url)
        
        # Only crawl within the same domain, ignore fragments/query params to avoid loops
        if parsed_url.netloc == base_domain:
            clean_url = f"{parsed_url.scheme}://{parsed_url.netloc}{parsed_url.path}"
            links.add(clean_url)
            
    return links

def chunk_text(text, chunk_size=800, overlap=150):
    words = text.split()
    chunks = []
    
    if len(words) == 0:
        return chunks
        
    # Standard chunking by word count
    words_per_chunk = chunk_size // 6  # estimate 6 chars per word
    overlap_words = overlap // 6
    
    if words_per_chunk <= overlap_words:
        words_per_chunk = 100
        overlap_words = 20
        
    step = words_per_chunk - overlap_words
    
    for i in range(0, len(words), step):
        chunk_words = words[i:i + words_per_chunk]
        chunk_text = " ".join(chunk_words)
        chunks.append(chunk_text)
        if i + words_per_chunk >= len(words):
            break
            
    return chunks

def crawl_website(seed_url, max_pages=15):
    start_time = time.time()
    visited = set()
    queue = [seed_url]
    
    crawled_data = []
    total_words = 0
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    
    while queue and len(visited) < max_pages:
        url = queue.pop(0)
        
        # Clean URL for duplication check
        parsed = urlparse(url)
        clean_url = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
        
        if clean_url in visited:
            continue
            
        visited.add(clean_url)
        
        try:
            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code != 200:
                continue
                
            content_type = response.headers.get('content-type', '')
            if 'text/html' not in content_type:
                continue
                
            raw_html = response.text
            cleaned_text = clean_html(raw_html)
            
            word_count = len(cleaned_text.split())
            total_words += word_count
            
            crawled_data.append({
                'url': clean_url,
                'raw_content': raw_html,
                'clean_content': cleaned_text,
                'word_count': word_count
            })
            
            # Find new links
            new_links = get_links(raw_html, clean_url)
            for link in new_links:
                if link not in visited and link not in queue:
                    queue.append(link)
                    
            # Brief pause to be respectful
            time.sleep(0.2)
            
        except Exception as e:
            print(f"Error crawling {url}: {e}")
            continue
            
    processing_time = round(time.time() - start_time, 2)
    return crawled_data, total_words, processing_time
