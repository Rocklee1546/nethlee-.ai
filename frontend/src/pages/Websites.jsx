import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Trash2, 
  RefreshCw, 
  Download, 
  FileText, 
  Globe, 
  Calendar,
  Layers,
  FileSpreadsheet
} from 'lucide-react';

const Websites = () => {
  const [websites, setWebsites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchWebsites();
  }, []);

  const fetchWebsites = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/websites');
      setWebsites(res.data);
    } catch (err) {
      setError('Failed to fetch indexed websites list.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this website? This removes all documents, chunks, and conversation histories associated with it.")) return;
    
    setActionLoadingId(id);
    try {
      await axios.delete(`http://localhost:5000/api/websites/${id}`);
      setWebsites(prev => prev.filter(w => w.id !== id));
    } catch (err) {
      alert("Error deleting website.");
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRecrawl = async (id, url) => {
    setActionLoadingId(id);
    try {
      const res = await axios.post('http://localhost:5000/api/scrape', { url });
      if (res.data.success) {
        await fetchWebsites();
        alert("Recrawl successful and index updated!");
      } else {
        alert("Recrawl failed: " + res.data.message);
      }
    } catch (err) {
      alert("Error communicating with crawler server.");
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const downloadReport = (id, format) => {
    // Standard link download to open the attachment download dialogue
    window.open(`http://localhost:5000/api/reports/export?website_id=${id}&format=${format}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-bg-dark text-white p-6 md:p-8 overflow-y-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold font-sans bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
          Website Source Manager
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Review, recrawl, delete, or download PDF and CSV analytics reports for your indexed websites.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl text-danger mb-6 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-gray-500">Loading indexed directories...</span>
          </div>
        </div>
      ) : websites.length === 0 ? (
        <div className="p-12 glass-panel border-slate-800 text-center rounded-2xl text-gray-500">
          <Globe className="h-12 w-12 text-slate-700 mx-auto mb-4" />
          <p className="font-bold">No Websites Scraped Yet</p>
          <p className="text-xs text-gray-600 mt-1">Head over to the Landing Page or Chat to index your first URL.</p>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl border border-[rgba(255,255,255,0.08)] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm text-gray-400">
              <thead className="text-xs uppercase font-extrabold tracking-wider text-gray-500 border-b border-white/5 bg-slate-950/40">
                <tr>
                  <th className="p-5 font-sans">Website URL</th>
                  <th className="p-5 font-sans">Status</th>
                  <th className="p-5 font-sans">Pages</th>
                  <th className="p-5 font-sans">Chunks</th>
                  <th className="p-5 font-sans">Words</th>
                  <th className="p-5 font-sans">Last Updated</th>
                  <th className="p-5 font-sans text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {websites.map(site => {
                  const isWorking = actionLoadingId === site.id;
                  return (
                    <tr key={site.id} className="hover:bg-slate-900/20 transition-colors">
                      <td className="p-5 font-semibold text-white font-sans truncate max-w-xs">{site.url}</td>
                      <td className="p-5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                          site.status === 'completed' ? 'bg-success/10 text-success' :
                          site.status === 'failed' ? 'bg-danger/10 text-danger' :
                          'bg-warning/10 text-warning animate-pulse'
                        }`}>
                          {site.status}
                        </span>
                      </td>
                      <td className="p-5">{site.pages_count}</td>
                      <td className="p-5 flex items-center gap-1"><Layers size={12} className="text-purple-400" /> {site.chunks_count}</td>
                      <td className="p-5">{site.total_words.toLocaleString()}</td>
                      <td className="p-5 text-xs text-gray-500">
                        <div className="flex items-center gap-1"><Calendar size={12} /> {new Date(site.last_updated).toLocaleDateString()}</div>
                      </td>
                      <td className="p-5 text-right">
                        <div className="inline-flex gap-2">
                          {/* Recrawl */}
                          <button
                            onClick={() => handleRecrawl(site.id, site.url)}
                            disabled={isWorking}
                            title="Recrawl Website"
                            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 hover:text-white transition disabled:opacity-40"
                          >
                            <RefreshCw size={14} className={isWorking ? 'animate-spin' : ''} />
                          </button>
                          
                          {/* Download PDF */}
                          <button
                            onClick={() => downloadReport(site.id, 'pdf')}
                            disabled={isWorking || site.status !== 'completed'}
                            title="Export PDF Report"
                            className="p-2 rounded-lg bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 hover:text-indigo-300 transition disabled:opacity-40"
                          >
                            <FileText size={14} />
                          </button>

                          {/* Download CSV */}
                          <button
                            onClick={() => downloadReport(site.id, 'csv')}
                            disabled={isWorking || site.status !== 'completed'}
                            title="Export CSV Report"
                            className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 hover:text-emerald-300 transition disabled:opacity-40"
                          >
                            <FileSpreadsheet size={14} />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(site.id)}
                            disabled={isWorking}
                            title="Delete Source"
                            className="p-2 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 transition disabled:opacity-40"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Websites;
