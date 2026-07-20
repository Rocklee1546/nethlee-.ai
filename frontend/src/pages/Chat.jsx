import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { 
  Send, 
  Trash2, 
  Copy, 
  Check, 
  ExternalLink, 
  Award, 
  Loader2, 
  Sparkles, 
  BookOpen, 
  PlusCircle,
  Clock,
  Compass
} from 'lucide-react';

const Chat = () => {
  const location = useLocation();
  const [websites, setWebsites] = useState([]);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [crawlingUrl, setCrawlingUrl] = useState('');
  const [crawlLoading, setCrawlLoading] = useState(false);
  const [crawlError, setCrawlError] = useState('');
  
  const messagesEndRef = useRef(null);

  // Suggested questions based on NLP
  const suggestedQuestions = [
    "What is the main purpose of this website?",
    "What core products, features, or services are discussed?",
    "Identify any technologies or platforms mentioned.",
    "Summarize the key information found on the homepage."
  ];

  useEffect(() => {
    fetchWebsites();
  }, []);

  useEffect(() => {
    if (selectedWebsiteId) {
      fetchChatHistory(selectedWebsiteId);
    } else {
      setMessages([]);
    }
  }, [selectedWebsiteId]);

  useEffect(() => {
    // If redirected from landing page with a website ID
    if (location.state?.initialWebsiteId && websites.length > 0) {
      const siteExists = websites.some(w => w.id === location.state.initialWebsiteId);
      if (siteExists) {
        setSelectedWebsiteId(location.state.initialWebsiteId);
        // Clear state to prevent looping on reload
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, websites]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchWebsites = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/websites');
      setWebsites(res.data);
      if (res.data.length > 0 && !selectedWebsiteId) {
        setSelectedWebsiteId(res.data[0].id);
      }
    } catch (err) {
      console.error("Error fetching websites:", err);
    }
  };

  const fetchChatHistory = async (siteId) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/chat/history?website_id=${siteId}`);
      const historyMessages = [];
      
      // Transform DB chat history rows to chat UI messages format
      res.data.reverse().forEach(chat => {
        historyMessages.push({
          id: `q-${chat.id}`,
          text: chat.question,
          sender: 'user',
          timestamp: chat.timestamp
        });
        historyMessages.push({
          id: `a-${chat.id}`,
          text: chat.answer,
          sender: 'bot',
          confidence: chat.confidence_score,
          sources: chat.sources,
          timestamp: chat.timestamp
        });
      });
      
      setMessages(historyMessages);
    } catch (err) {
      console.error("Error fetching chat history:", err);
    }
  };

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || !selectedWebsiteId) return;

    if (!textToSend) setInputMessage('');
    
    // Add user message to UI
    const userMsgId = Date.now().toString();
    setMessages(prev => [...prev, {
      id: userMsgId,
      text: text,
      sender: 'user',
      timestamp: new Date().toISOString()
    }]);

    setLoading(true);

    try {
      const res = await axios.post('http://localhost:5000/api/chat', {
        website_id: selectedWebsiteId,
        question: text
      });

      if (res.data) {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          text: res.data.answer,
          sender: 'bot',
          confidence: res.data.confidence,
          sources: res.data.sources,
          timestamp: new Date().toISOString()
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: "Error: Failed to fetch response from NLP server.",
        sender: 'bot',
        confidence: 0,
        sources: [],
        timestamp: new Date().toISOString(),
        isError: true
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleCrawlNew = async (e) => {
    e.preventDefault();
    if (!crawlingUrl) return;

    setCrawlLoading(true);
    setCrawlError('');

    try {
      const res = await axios.post('http://localhost:5000/api/scrape', { url: crawlingUrl });
      if (res.data.success) {
        setCrawlingUrl('');
        await fetchWebsites();
        setSelectedWebsiteId(res.data.website_id);
      } else {
        setCrawlError(res.data.message || 'Crawl failed');
      }
    } catch (err) {
      setCrawlError(err.response?.data?.message || 'Error executing crawl');
    } finally {
      setCrawlLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm("Are you sure you want to clear chat history for this website?")) return;
    try {
      await axios.delete('http://localhost:5000/api/chat/history');
      setMessages([]);
    } catch (err) {
      console.error("Error clearing history:", err);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Simple Markdown Renderer
  const renderMarkdown = (text) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Heading 3
      if (line.startsWith('### ')) {
        return <h3 key={idx} className="text-lg font-bold text-indigo-300 mt-4 mb-2">{line.replace('### ', '')}</h3>;
      }
      // Bullet list
      if (line.startsWith('- ')) {
        const item = line.replace('- ', '');
        // Check for strong bold formatting inside bullet
        const boldRegex = /\*\*(.*?)\*\*/g;
        const parts = [];
        let lastIndex = 0;
        let match;
        
        while ((match = boldRegex.exec(item)) !== null) {
          if (match.index > lastIndex) {
            parts.push(item.substring(lastIndex, match.index));
          }
          parts.push(<strong key={match.index} className="text-cyan-400 font-semibold">{match[1]}</strong>);
          lastIndex = boldRegex.lastIndex;
        }
        
        if (lastIndex < item.length) {
          parts.push(item.substring(lastIndex));
        }

        return <li key={idx} className="ml-5 list-disc text-sm text-gray-300 mb-1.5 leading-relaxed">{parts.length > 0 ? parts : item}</li>;
      }
      return <p key={idx} className="text-sm text-gray-300 leading-relaxed mb-2">{line}</p>;
    });
  };

  const activeWebsite = websites.find(w => w.id === selectedWebsiteId);

  return (
    <div className="flex h-screen bg-bg-dark text-white font-sans overflow-hidden">
      {/* Internal Crawl/Website Sidebar */}
      <div className="w-80 border-r border-[rgba(255,255,255,0.08)] bg-slate-950/60 flex flex-col h-full">
        {/* Scrape Input Widget */}
        <div className="p-4 border-b border-[rgba(255,255,255,0.08)]">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <PlusCircle size={14} /> Crawl New Website
          </h3>
          <form onSubmit={handleCrawlNew} className="flex flex-col gap-2">
            <input
              type="text"
              value={crawlingUrl}
              onChange={(e) => setCrawlingUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-3 py-2 text-sm rounded-lg glass-input"
              required
            />
            <button
              type="submit"
              disabled={crawlLoading}
              className="py-2 px-4 rounded-lg bg-primary hover:bg-indigo-600 font-semibold text-xs flex items-center justify-center gap-1.5 transition shadow-lg disabled:opacity-50"
            >
              {crawlLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Crawl Site'}
            </button>
          </form>
          {crawlError && (
            <div className="mt-2 text-[10px] text-danger bg-danger/5 p-2 rounded-lg border border-danger/10 truncate">
              {crawlError}
            </div>
          )}
        </div>

        {/* Website Selection List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <BookOpen size={14} /> Indexed Sources
          </h3>
          {websites.length === 0 ? (
            <div className="text-center text-xs text-gray-600 py-8">
              No websites indexed. Enter a URL above to start.
            </div>
          ) : (
            websites.map(site => (
              <button
                key={site.id}
                onClick={() => setSelectedWebsiteId(site.id)}
                className={`w-full text-left p-3 rounded-xl border transition-all duration-200 flex flex-col gap-1 ${
                  selectedWebsiteId === site.id
                    ? 'bg-gradient-to-r from-primary/10 to-secondary/10 border-primary text-white shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                    : 'bg-slate-900/30 border-[rgba(255,255,255,0.04)] hover:bg-slate-900/60 text-gray-400 hover:text-gray-200'
                }`}
              >
                <span className="text-xs font-bold font-sans truncate">{site.url}</span>
                <div className="flex items-center justify-between text-[9px] text-gray-500 w-full mt-1">
                  <span className="flex items-center gap-1"><Clock size={10} /> {site.pages_count} pages</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-success/10 text-success uppercase text-[8px] font-extrabold">{site.status}</span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Clear chat/actions footer */}
        {selectedWebsiteId && (
          <div className="p-4 border-t border-[rgba(255,255,255,0.08)]">
            <button
              onClick={handleClearHistory}
              className="w-full py-2.5 rounded-xl border border-danger/30 text-danger hover:bg-danger/10 transition-colors text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <Trash2 size={14} />
              Clear Conversation
            </button>
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full bg-bg-dark/40 relative">
        {/* Floating gradient circle */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />

        {/* Top Active Website Bar */}
        {activeWebsite && (
          <div className="h-16 px-6 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between bg-slate-950/20 z-10">
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Chatting with context</span>
              <span className="text-sm font-bold text-gray-200 truncate max-w-lg">{activeWebsite.url}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span className="glass-panel px-3 py-1.5 rounded-full border border-slate-700/30">
                {activeWebsite.chunks_count} Vectors Indexed
              </span>
            </div>
          </div>
        )}

        {/* Conversation Thread */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 z-10">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center max-w-xl mx-auto text-center space-y-6">
              <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-primary animate-pulse">
                <Sparkles size={32} />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold font-sans">Ask anything about this website</h2>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Enter questions below. The AI will perform similarity search over crawled chunks, retrieve key details, and generate answers with confidence metrics and sources.
                </p>
              </div>

              {/* Suggestions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full pt-4">
                {suggestedQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(q)}
                    disabled={!selectedWebsiteId}
                    className="p-3 text-left rounded-xl glass-panel glass-panel-hover border border-slate-800 text-xs text-gray-400 hover:text-white transition disabled:opacity-40 flex items-start gap-2.5"
                  >
                    <Compass size={14} className="mt-0.5 text-cyan-400 flex-shrink-0" />
                    <span>{q}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col max-w-3xl mx-auto ${
                  msg.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                {/* Message Bubble */}
                <div
                  className={`p-5 rounded-2xl border ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-primary to-indigo-600 border-indigo-500 text-white rounded-br-none shadow-[0_4px_15px_rgba(99,102,241,0.2)]'
                      : msg.isError 
                        ? 'bg-danger/10 border-danger/30 text-danger rounded-bl-none'
                        : 'glass-panel border-[rgba(255,255,255,0.08)] rounded-bl-none'
                  } w-full`}
                >
                  {msg.sender === 'user' ? (
                    <p className="text-sm font-sans leading-relaxed">{msg.text}</p>
                  ) : (
                    <div>
                      {/* Answer Body */}
                      <div className="space-y-2">
                        {renderMarkdown(msg.text)}
                      </div>

                      {/* Bot Response Metadata Footer */}
                      {!msg.isError && (
                        <div className="mt-5 pt-4 border-t border-[rgba(255,255,255,0.06)] flex flex-wrap items-center justify-between gap-4 text-xs text-gray-400">
                          {/* Confidence rating */}
                          <div className="flex items-center gap-1.5 text-cyan-400 font-semibold bg-cyan-400/5 px-2.5 py-1 rounded-full border border-cyan-400/10">
                            <Award size={14} />
                            Confidence Score: {msg.confidence * 100}%
                          </div>

                          {/* Action Items */}
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => copyToClipboard(msg.text, msg.id)}
                              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 hover:text-white transition flex items-center gap-1 text-[10px]"
                            >
                              {copiedId === msg.id ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                              Copy Response
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Source References */}
                      {!msg.isError && msg.sources && msg.sources.length > 0 && (
                        <div className="mt-3 flex flex-col gap-1.5">
                          <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold flex items-center gap-1">
                            <BookOpen size={10} /> Reference Sources
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {msg.sources.map((src, i) => (
                              <a
                                key={i}
                                href={src}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] text-indigo-400 bg-indigo-500/5 hover:bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/15 max-w-[240px] truncate"
                              >
                                {src.split('/').pop() || 'index.html'}
                                <ExternalLink size={10} />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Bot Typing Loading Skeleton */}
          {loading && (
            <div className="flex flex-col max-w-3xl mx-auto items-start w-full">
              <div className="p-5 rounded-2xl glass-panel border-[rgba(255,255,255,0.08)] rounded-bl-none w-full flex items-center gap-3">
                <span className="text-sm text-gray-500">Synthesizing Answer...</span>
                <div className="flex gap-1.5 items-center">
                  <span className="h-2 w-2 rounded-full bg-indigo-400 typing-dot"></span>
                  <span className="h-2 w-2 rounded-full bg-indigo-400 typing-dot"></span>
                  <span className="h-2 w-2 rounded-full bg-indigo-400 typing-dot"></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar Section */}
        <div className="p-6 border-t border-[rgba(255,255,255,0.08)] bg-slate-950/20 z-10">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="max-w-3xl mx-auto flex gap-3"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={selectedWebsiteId ? "Ask a question about this website..." : "Please select or crawl a website first..."}
              disabled={!selectedWebsiteId || loading}
              className="flex-1 px-4 py-3.5 rounded-xl glass-input text-sm"
            />
            <button
              type="submit"
              disabled={!selectedWebsiteId || !inputMessage.trim() || loading}
              className="p-3.5 rounded-xl bg-primary hover:bg-indigo-600 disabled:opacity-40 text-white font-semibold flex items-center justify-center transition shadow-lg shadow-primary/20"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Chat;
