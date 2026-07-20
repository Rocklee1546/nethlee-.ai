import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Globe, 
  Search, 
  Cpu, 
  Zap, 
  Database, 
  Shield, 
  ChevronRight, 
  ArrowRight,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import axios from 'axios';

const LandingPage = () => {
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleCrawlSubmit = async (e) => {
    e.preventDefault();
    if (!urlInput) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Initiate crawling on backend
      const res = await axios.post('http://localhost:5000/api/scrape', { url: urlInput });
      if (res.data.success) {
        navigate('/chat', { state: { initialWebsiteId: res.data.website_id } });
      } else {
        setError(res.data.message || 'Scraping failed.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error communicating with crawler server.');
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } }
  };

  return (
    <div className="relative min-h-screen text-white grid-bg overflow-x-hidden bg-bg-dark">
      {/* Floating Background Blobs */}
      <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-primary/20 blur-3xl animate-blob-1 pointer-events-none" />
      <div className="absolute top-40 right-20 w-80 h-80 rounded-full bg-secondary/20 blur-3xl animate-blob-2 pointer-events-none" />
      <div className="absolute bottom-20 left-1/3 w-96 h-96 rounded-full bg-accent/20 blur-3xl animate-blob-3 pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 py-20 relative z-10 flex flex-col items-center justify-center">
        {/* Header Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-3xl mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel border border-indigo-500/30 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-6 animate-pulse">
            <Sparkles size={14} /> Intelligent Web Q&A Assistant
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold font-sans leading-tight tracking-tight mb-6 bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Instant Knowledge From Any Website URL
          </h1>
          
          <p className="text-lg md:text-xl text-gray-400 font-sans leading-relaxed mb-8">
            NethLee AI scrapes web content on demand, parses it through a advanced NLP pipeline, and indexes it into a local vector database to answer your queries instantly.
          </p>
        </motion.div>

        {/* URL Input Form Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="w-full max-w-2xl p-6 glass-panel rounded-2xl border border-[rgba(255,255,255,0.08)] mb-16 shadow-2xl relative"
        >
          <form onSubmit={handleCrawlSubmit} className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Enter website URL (e.g. https://example.com)"
                className="w-full pl-12 pr-4 py-4 rounded-xl glass-input text-base"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="py-4 px-8 rounded-xl bg-gradient-to-r from-primary to-secondary hover:from-indigo-600 hover:to-purple-600 font-semibold text-white transition-all shadow-[0_4px_20px_rgba(99,102,241,0.4)] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Indexing...
                </>
              ) : (
                <>
                  Analyze URL
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
          
          {error && (
            <div className="mt-4 p-3 bg-danger/10 border border-danger/20 rounded-xl text-danger text-sm">
              {error}
            </div>
          )}
          
          <div className="mt-4 text-xs text-gray-500 text-center">
            * Breadth-first crawler scrapes up to 15 pages locally for analysis.
          </div>
        </motion.div>

        {/* Feature Section */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full mb-24"
        >
          {/* Card 1 */}
          <motion.div variants={itemVariants} className="glass-panel glass-panel-hover p-8 rounded-2xl flex flex-col">
            <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center text-primary border border-primary/20 mb-6">
              <Search size={24} />
            </div>
            <h3 className="text-xl font-bold font-sans mb-3 text-text-light">Advanced Crawling</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              BFS crawling logic parses internal anchor sub-links and downloads target content dynamically.
            </p>
          </motion.div>

          {/* Card 2 */}
          <motion.div variants={itemVariants} className="glass-panel glass-panel-hover p-8 rounded-2xl flex flex-col">
            <div className="h-12 w-12 rounded-xl bg-secondary/15 flex items-center justify-center text-secondary border border-secondary/20 mb-6">
              <Cpu size={24} />
            </div>
            <h3 className="text-xl font-bold font-sans mb-3 text-text-light">NLP Pipeline</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Performs HTML cleaning, Tokenization, Stemming, Lemmatization, POS Tagging, and Named Entity Recognition.
            </p>
          </motion.div>

          {/* Card 3 */}
          <motion.div variants={itemVariants} className="glass-panel glass-panel-hover p-8 rounded-2xl flex flex-col">
            <div className="h-12 w-12 rounded-xl bg-accent/15 flex items-center justify-center text-accent border border-accent/20 mb-6">
              <Database size={24} />
            </div>
            <h3 className="text-xl font-bold font-sans mb-3 text-text-light">Hybrid Vector Store</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Fuses vector similarity embeddings with BM25 lexical ranking to retrieve the most contextually relevant website chunks.
            </p>
          </motion.div>
        </motion.div>

        {/* Technology Stack Grid */}
        <div className="w-full mb-24 text-center">
          <h2 className="text-3xl font-bold font-sans mb-12 bg-gradient-to-r from-indigo-300 to-cyan-300 bg-clip-text text-transparent">
            Built on a State-of-the-Art Architecture
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { name: 'React & Tailwind v4', role: 'Frontend Layer' },
              { name: 'Flask API', role: 'Backend Router' },
              { name: 'NLTK & spaCy', role: 'NLP Processing' },
              { name: 'FAISS & Scikit-learn', role: 'Vector Search' }
            ].map((tech, idx) => (
              <div key={idx} className="p-5 glass-panel rounded-xl border border-[rgba(255,255,255,0.04)]">
                <div className="text-text-light font-bold text-base">{tech.name}</div>
                <div className="text-xs text-gray-500 mt-1">{tech.role}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="w-full border-t border-[rgba(255,255,255,0.08)] pt-8 flex flex-col md:flex-row items-center justify-between text-sm text-gray-500">
          <div>© {new Date().getFullYear()} NethLee AI. All rights reserved.</div>
          <div className="flex gap-6 mt-4 md:mt-0">
            <span className="hover:text-white cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-white cursor-pointer transition-colors">Terms of Service</span>
            <span className="hover:text-white cursor-pointer transition-colors">Documentation</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;
