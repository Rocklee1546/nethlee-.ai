import os
import re
import json
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import nltk
from nltk.stem import PorterStemmer, WordNetLemmatizer
from collections import Counter

# Ensure basic NLTK resources are available
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt', quiet=True)
try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords', quiet=True)
try:
    nltk.data.find('corpora/wordnet')
except LookupError:
    nltk.download('wordnet', quiet=True)
try:
    nltk.data.find('taggers/averaged_perceptron_tagger')
except LookupError:
    nltk.download('averaged_perceptron_tagger', quiet=True)

# Try importing SentenceTransformers and FAISS
SENTENCE_TRANSFORMERS_AVAILABLE = False
FAISS_AVAILABLE = False
model = None

try:
    from sentence_transformers import SentenceTransformer
    # Initialize with a small model
    model = SentenceTransformer('all-MiniLM-L6-v2')
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except Exception as e:
    print(f"SentenceTransformers not loaded: {e}. Falling back to TF-IDF dense embeddings.")

try:
    import faiss
    FAISS_AVAILABLE = True
except Exception as e:
    print(f"FAISS not loaded: {e}. Falling back to NumPy similarity search.")

# Basic Stopwords Fallback List
DEFAULT_STOPWORDS = set([
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', "aren't", 'as', 'at', 
    'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', "can't", 'cannot', 'could', 
    "couldn't", 'did', "didn't", 'do', 'does', "doesn't", 'doing', "don't", 'down', 'during', 'each', 'few', 'for', 
    'from', 'further', 'had', "hadn't", 'has', "hasn't", 'have', "haven't", 'having', 'he', "he'd", "he'll", "he's", 
    'her', 'here', "here's", 'hers', 'herself', 'him', 'himself', 'his', 'how', "how's", 'i', "i'd", "i'll", "i'm", 
    "i've", 'if', 'in', 'into', 'is', "isn't", 'it', "it's", 'its', 'itself', "let's", 'me', 'more', 'most', "mustn't", 
    'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 
    'ourselves', 'out', 'over', 'own', 'same', "shan't", 'she', "she'd", "she'll", "she's", 'should', "shouldn't", 
    'so', 'some', 'such', 'than', 'that', "that's", 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 
    "there's", 'these', 'they', "they'd", "they'll", "they're", "they've", 'this', 'those', 'through', 'to', 'too', 
    'under', 'until', 'up', 'very', 'was', "wasn't", 'we', "we'd", "we'll", "we're", "we've", 'were', "weren't", 
    'what', "what's", 'when', "when's", 'where', "where's", 'which', 'while', 'who', "who's", 'whom', 'why', 
    "why's", 'with', "won't", 'would', "wouldn't", 'you', "you'd", "you'll", "you're", "you've", 'your', 'yours', 
    'yourself', 'yourselves'
])

try:
    from nltk.corpus import stopwords
    STOPWORDS = set(stopwords.words('english'))
except Exception:
    STOPWORDS = DEFAULT_STOPWORDS

stemmer = PorterStemmer()
lemmatizer = WordNetLemmatizer()

def normalize_text(text):
    # Lowercase & remove special characters but retain basic sentence structure
    text = text.lower()
    text = re.sub(r'[^a-zA-Z0-9\s\.\,\?\!]', '', text)
    return text

def tokenize(text):
    try:
        return nltk.word_tokenize(text)
    except Exception:
        # Simple whitespace/punctuation fallback tokenization
        return re.findall(r'\b\w+\b', text)

def pos_tagging(tokens):
    try:
        return nltk.pos_tag(tokens)
    except Exception:
        # Custom basic rules fallback tagger for presentation
        tags = []
        for t in tokens:
            if re.match(r'^(the|a|an)$', t, re.I):
                tags.append((t, 'DT'))
            elif re.match(r'^(is|am|are|was|were|be|been|being|have|has|had)$', t, re.I):
                tags.append((t, 'VB'))
            elif re.match(r'^[a-z]+ing$', t, re.I):
                tags.append((t, 'VBG'))
            elif re.match(r'^[a-z]+ed$', t, re.I):
                tags.append((t, 'VBD'))
            elif re.match(r'^[a-z]+s$', t, re.I):
                tags.append((t, 'NNS'))
            else:
                tags.append((t, 'NN'))
        return tags

def named_entity_recognition(text):
    # Standard NER extraction using Regex rules for Names, Orgs, Locations, Tech stack keywords
    entities = []
    # Capitalized sequences (potential Orgs/Persons/Locations)
    cap_seqs = re.findall(r'\b[A-Z][a-zA-Z0-9]*(?:\s+[A-Z][a-zA-Z0-9]*)*\b', text)
    
    # Simple rule matching
    orgs_keywords = ['corp', 'corporation', 'inc', 'incorporated', 'llc', 'google', 'openai', 'nethlee', 'microsoft', 'apple']
    tech_keywords = ['react', 'python', 'flask', 'tailwind', 'sqlite', 'nlp', 'ai', 'framer motion', 'nltk', 'spacy', 'faiss']
    
    for seq in cap_seqs:
        low = seq.lower()
        if any(ok in low for ok in orgs_keywords):
            entities.append({'text': seq, 'label': 'ORGANIZATION'})
        elif any(tk in low for tk in tech_keywords):
            entities.append({'text': seq, 'label': 'TECHNOLOGY'})
        else:
            # Check length to classify
            if len(seq.split()) > 1:
                entities.append({'text': seq, 'label': 'ORGANIZATION'})
            else:
                entities.append({'text': seq, 'label': 'MISC'})
                
    # Unique entities list
    seen = set()
    unique_entities = []
    for ent in entities:
        key = (ent['text'].lower(), ent['label'])
        if key not in seen and len(ent['text']) > 2:
            seen.add(key)
            unique_entities.append(ent)
            
    return unique_entities

def lemmatize_and_stem(tokens):
    lemmatized = []
    stemmed = []
    for token in tokens:
        # Remove stopwords for stem/lem
        if token.lower() not in STOPWORDS and token.isalnum():
            # Try to lemmatize verb and noun
            lem = lemmatizer.lemmatize(token, pos='v')
            lem = lemmatizer.lemmatize(lem, pos='n')
            lemmatized.append(lem)
            stemmed.append(stemmer.stem(token))
    return lemmatized, stemmed

def extract_keywords(text, top_n=10):
    # Combine TF-IDF scoring and word frequencies to return key topics
    normalized = normalize_text(text)
    tokens = tokenize(normalized)
    cleaned = [t for t in tokens if t not in STOPWORDS and t.isalnum() and len(t) > 2]
    
    counter = Counter(cleaned)
    common = counter.most_common(top_n * 2)
    
    # Calculate simple word score (length + frequency)
    scored = []
    for word, count in common:
        score = count * (1.2 if len(word) > 5 else 1.0)
        scored.append((word, score))
        
    scored.sort(key=lambda x: x[1], reverse=True)
    return [w for w, s in scored[:top_n]]

# BM25 Class for ranking
class BM25:
    def __init__(self, corpus, k1=1.5, b=0.75):
        self.k1 = k1
        self.b = b
        self.corpus = corpus
        self.doc_lens = [len(doc.split()) for doc in corpus]
        self.avg_doc_len = sum(self.doc_lens) / len(self.doc_lens) if corpus else 1
        self.doc_count = len(corpus)
        
        self.vectorizer = TfidfVectorizer(use_idf=True, stop_words='english')
        if corpus:
            self.vectorizer.fit(corpus)
            self.idf = self.vectorizer.idf_
            self.vocabulary = self.vectorizer.vocabulary_
        else:
            self.idf = {}
            self.vocabulary = {}
            
    def score(self, query_tokens):
        scores = np.zeros(self.doc_count)
        for token in query_tokens:
            if token not in self.vocabulary:
                continue
            idx = self.vocabulary[token]
            idf_val = self.idf[idx]
            
            for doc_idx, doc in enumerate(self.corpus):
                # Count occurance
                freq = doc.lower().split().count(token.lower())
                numerator = freq * (self.k1 + 1)
                denominator = freq + self.k1 * (1 - self.b + self.b * (self.doc_lens[doc_idx] / self.avg_doc_len))
                scores[doc_idx] += idf_val * (numerator / denominator)
        return scores

# Main NLP Pipeline Execution
def process_website_data(chunks):
    # Analyze text statistics of chunks
    combined_text = " ".join(chunks)
    normalized = normalize_text(combined_text)
    tokens = tokenize(normalized)
    
    # Statistics
    vocab_size = len(set(tokens))
    
    # Named Entities
    entities = named_entity_recognition(combined_text)
    
    # Keywords
    keywords = extract_keywords(combined_text, top_n=15)
    
    # Part-Of-Speech counts
    tagged = pos_tagging(tokens[:1000])  # limit to first 1000 tokens for performance
    pos_counts = Counter([tag for word, tag in tagged])
    
    # Word frequency distribution
    word_freq = Counter([t for t in tokens if t not in STOPWORDS and t.isalnum()])
    
    return {
        'total_tokens': len(tokens),
        'vocab_size': vocab_size,
        'entities': entities,
        'keywords': keywords,
        'pos_distribution': dict(pos_counts.most_common(10)),
        'word_frequency': dict(word_freq.most_common(20))
    }

# Search and indexing index managers
class VectorStore:
    def __init__(self, chunks):
        self.chunks = chunks
        
        if not chunks:
            self.vectorizer = None
            self.matrix = None
            return
            
        # Prepare embeddings
        if SENTENCE_TRANSFORMERS_AVAILABLE:
            self.embeddings = model.encode(chunks, show_progress_bar=False)
            if FAISS_AVAILABLE:
                # FAISS indexing
                dimension = self.embeddings.shape[1]
                self.index = faiss.IndexFlatL2(dimension)
                self.index.add(self.embeddings.astype('float32'))
        else:
            # Fallback to TF-IDF dense matrix representation
            self.vectorizer = TfidfVectorizer(stop_words='english')
            self.matrix = self.vectorizer.fit_transform(chunks).toarray()
            
        # Initialize BM25 ranker
        self.bm25 = BM25(chunks)
        
    def search(self, query, top_k=3):
        if not self.chunks:
            return []
            
        scores = np.zeros(len(self.chunks))
        
        # 1. Vector Search
        if SENTENCE_TRANSFORMERS_AVAILABLE:
            query_emb = model.encode([query], show_progress_bar=False)
            if FAISS_AVAILABLE:
                # FAISS L2 search
                D, I = self.index.search(query_emb.astype('float32'), min(top_k * 2, len(self.chunks)))
                # Convert L2 distance to dynamic score (closer to 1 is better)
                for idx, dist in zip(I[0], D[0]):
                    if idx != -1:
                        # Convert to cosine-like score
                        scores[idx] += 0.5 * (1.0 / (1.0 + dist))
            else:
                # Manual Cosine Similarity using Numpy dense embeddings
                sims = cosine_similarity(query_emb, self.embeddings)[0]
                for idx, s in enumerate(sims):
                    scores[idx] += 0.5 * s
        else:
            # TF-IDF Cosine Similarity Search
            if self.vectorizer:
                try:
                    query_vec = self.vectorizer.transform([query]).toarray()
                    sims = cosine_similarity(query_vec, self.matrix)[0]
                    for idx, s in enumerate(sims):
                        scores[idx] += 0.5 * s
                except Exception:
                    pass
                    
        # 2. Add BM25 Lexical Score
        query_tokens = tokenize(normalize_text(query))
        bm25_scores = self.bm25.score(query_tokens)
        max_bm25 = np.max(bm25_scores) if np.max(bm25_scores) > 0 else 1.0
        normalized_bm25 = bm25_scores / max_bm25
        
        # Combined score
        for idx in range(len(self.chunks)):
            scores[idx] += 0.5 * normalized_bm25[idx]
            
        # Sort and return top chunks
        top_indices = np.argsort(scores)[::-1][:top_k]
        results = []
        for idx in top_indices:
            results.append({
                'chunk': self.chunks[idx],
                'score': float(scores[idx]),
                'index': int(idx)
            })
            
        return results
