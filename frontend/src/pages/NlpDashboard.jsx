import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BarChart, Bar, 
  XAxis, YAxis, 
  CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { Cpu, Award, ListFilter, Play, CheckCircle } from 'lucide-react';

const COLORS = ['#6366F1', '#06B6D4', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

const NlpDashboard = () => {
  const [websites, setWebsites] = useState([]);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState(null);
  const [nlpData, setNlpData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchWebsites();
  }, []);

  useEffect(() => {
    if (selectedWebsiteId) {
      fetchNlpStats(selectedWebsiteId);
    }
  }, [selectedWebsiteId]);

  const fetchWebsites = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/websites');
      setWebsites(res.data);
      if (res.data.length > 0) {
        setSelectedWebsiteId(res.data[0].id);
      }
    } catch (err) {
      console.error("Error fetching websites:", err);
    }
  };

  const fetchNlpStats = async (siteId) => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`http://localhost:5000/api/nlp/stats?website_id=${siteId}`);
      setNlpData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error fetching NLP stats. Recrawl this website.');
      setNlpData(null);
    } finally {
      setLoading(false);
    }
  };

  // Convert word frequency dictionary to Recharts format
  const wordFreqData = nlpData?.word_frequency 
    ? Object.entries(nlpData.word_frequency).slice(0, 10).map(([word, freq]) => ({ name: word, frequency: freq }))
    : [];

  // Convert POS tag count to Recharts format
  const posDistributionData = nlpData?.pos_distribution
    ? Object.entries(nlpData.pos_distribution).map(([tag, count]) => ({ subject: tag, count: count }))
    : [];

  // Convert entity dictionary to category distribution
  const entityData = nlpData?.entities 
    ? nlpData.entities.reduce((acc, curr) => {
        const existing = acc.find(item => item.name === curr.label);
        if (existing) {
          existing.count += 1;
        } else {
          acc.push({ name: curr.label, count: 1 });
        }
        return acc;
      }, [])
    : [];

  const pipelineStages = [
    { name: 'HTML Decanter', status: 'completed', desc: 'BeautifulSoup strips tags, comments, styles and extracts core nodes.' },
    { name: 'Text Normalizer', status: 'completed', desc: 'Case folding, regex patterns remove special markers and format characters.' },
    { name: 'NLTK Tokenizer', status: 'completed', desc: 'Sentence segmentation & word tokenizing into arrays.' },
    { name: 'Stopwords Excluder', status: 'completed', desc: 'Prunes functional pronouns, conjunctions, and prepositions.' },
    { name: 'Stem & Lemmatizer', status: 'completed', desc: 'PorterStemmer and WordNet reduce tokens to root lemma forms.' },
    { name: 'POS & NER Classifier', status: 'completed', desc: 'POS tags labeled and entity boundaries detected.' },
    { name: 'Dense Vector Matrix', status: 'completed', desc: 'Sentence-Transformers / TF-IDF dense pooling creates vector index.' },
  ];

  return (
    <div className="min-h-screen bg-bg-dark text-white p-6 md:p-8 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold font-sans bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
            NLP Engine Dashboard
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Examine vocabulary size, named entities, token counts, and parts of speech distributions.
          </p>
        </div>
        
        {/* Source Site Select */}
        <div className="flex items-center gap-2">
          <ListFilter size={16} className="text-indigo-400" />
          <select
            value={selectedWebsiteId || ''}
            onChange={(e) => setSelectedWebsiteId(Number(e.target.value))}
            className="px-4 py-2 text-sm rounded-xl glass-panel border border-slate-700/50 bg-slate-900/60 focus:outline-none"
          >
            {websites.map(site => (
              <option key={site.id} value={site.id}>{site.url}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="h-[400px] flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-gray-500">Processing Natural Language data...</span>
          </div>
        </div>
      ) : error ? (
        <div className="p-8 glass-panel border-danger/20 text-center rounded-2xl">
          <p className="text-danger text-sm font-semibold">{error}</p>
        </div>
      ) : !nlpData ? (
        <div className="p-8 glass-panel border-slate-800 text-center rounded-2xl text-gray-500">
          Select an indexed website from the dropdown to run NLP visualizations.
        </div>
      ) : (
        <div className="space-y-8">
          {/* Top Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-panel p-5 rounded-2xl border border-[rgba(255,255,255,0.08)]">
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-gray-500">Vocabulary Size</span>
              <h2 className="text-2xl font-bold font-sans text-indigo-400 mt-1">{nlpData.vocab_size} unique words</h2>
            </div>
            <div className="glass-panel p-5 rounded-2xl border border-[rgba(255,255,255,0.08)]">
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-gray-500">Total Extracted Tokens</span>
              <h2 className="text-2xl font-bold font-sans text-cyan-400 mt-1">{nlpData.total_tokens} tokens</h2>
            </div>
            <div className="glass-panel p-5 rounded-2xl border border-[rgba(255,255,255,0.08)]">
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-gray-500">Named Entities Discovered</span>
              <h2 className="text-2xl font-bold font-sans text-purple-400 mt-1">{nlpData.entities.length} entities</h2>
            </div>
          </div>

          {/* Word Frequency & Part of Speech Tagging Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Word Frequency Chart */}
            <div className="glass-panel p-6 rounded-2xl border border-[rgba(255,255,255,0.08)] shadow-lg">
              <h3 className="text-base font-bold text-gray-300 mb-6">Top Word Frequency (Filtered Stopwords)</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={wordFreqData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis type="number" stroke="#6B7280" style={{ fontSize: '11px' }} />
                    <YAxis type="category" dataKey="name" stroke="#6B7280" style={{ fontSize: '11px' }} />
                    <Tooltip 
                      contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}
                    />
                    <Bar dataKey="frequency" fill="#6366F1" radius={[0, 4, 4, 0]}>
                      {wordFreqData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Radar POS Distribution */}
            <div className="glass-panel p-6 rounded-2xl border border-[rgba(255,255,255,0.08)] shadow-lg">
              <h3 className="text-base font-bold text-gray-300 mb-6">Part-of-Speech Tagging Distribution</h3>
              <div className="h-72 w-full flex items-center justify-center">
                {posDistributionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={posDistributionData}>
                      <PolarGrid stroke="rgba(255,255,255,0.06)" />
                      <PolarAngleAxis dataKey="subject" stroke="#9CA3AF" style={{ fontSize: '11px' }} />
                      <PolarRadiusAxis stroke="#6B7280" style={{ fontSize: '10px' }} />
                      <Radar name="Count" dataKey="count" stroke="#06B6D4" fill="#06B6D4" fillOpacity={0.2} />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <span className="text-xs text-gray-500">No POS Data Compiled.</span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Named Entity list */}
            <div className="glass-panel p-6 rounded-2xl border border-[rgba(255,255,255,0.08)] shadow-lg lg:col-span-1 h-[420px] flex flex-col">
              <h3 className="text-base font-bold text-gray-300 mb-4">Discovered Named Entities</h3>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {nlpData.entities.length === 0 ? (
                  <div className="text-center text-xs text-gray-500 py-12">No entities detected.</div>
                ) : (
                  nlpData.entities.map((ent, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-slate-900/30 border border-white/5 flex items-center justify-between text-xs">
                      <span className="font-bold text-gray-200 truncate pr-2">{ent.text}</span>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                        ent.label === 'ORGANIZATION' ? 'bg-indigo-500/10 text-indigo-400' :
                        ent.label === 'TECHNOLOGY' ? 'bg-cyan-500/10 text-cyan-400' :
                        'bg-purple-500/10 text-purple-400'
                      }`}>
                        {ent.label}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* NLP Processing Pipeline Timeline Visualizer */}
            <div className="glass-panel p-6 rounded-2xl border border-[rgba(255,255,255,0.08)] shadow-lg lg:col-span-2 flex flex-col">
              <h3 className="text-base font-bold text-gray-300 mb-6">NLP Processing Pipeline Flow</h3>
              <div className="relative flex-1 border-l border-indigo-500/20 pl-6 ml-4 space-y-6">
                {pipelineStages.map((stage, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-[35px] top-0.5 bg-bg-dark p-1 rounded-full border border-indigo-500/30 text-indigo-400 z-10">
                      <CheckCircle size={14} className="fill-indigo-500/10" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-text-light flex items-center gap-2">
                        {stage.name}
                      </h4>
                      <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{stage.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NlpDashboard;
