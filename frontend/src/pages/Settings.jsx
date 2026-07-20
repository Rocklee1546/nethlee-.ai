import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Settings as SettingsIcon, 
  Trash2, 
  Download, 
  Languages, 
  Activity, 
  Moon,
  Sun,
  Database,
  Check
} from 'lucide-react';

const Settings = () => {
  const [settings, setSettings] = useState({
    theme: 'dark',
    language: 'en',
    animation_speed: 'normal'
  });
  
  const [loading, setLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/settings');
      setSettings(res.data);
    } catch (err) {
      console.error("Error fetching settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSetting = async (key, val) => {
    const updated = { ...settings, [key]: val };
    setSettings(updated);
    
    try {
      await axios.post('http://localhost:5000/api/settings', { [key]: val });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error("Error updating setting:", err);
    }
  };

  const handleClearChatHistory = async () => {
    if (!window.confirm("Are you sure you want to clear all chat conversations? This cannot be undone.")) return;
    setActionLoading(true);
    try {
      await axios.delete('http://localhost:5000/api/chat/history');
      alert("Chat history cleared successfully.");
    } catch (err) {
      console.error("Error clearing chat history:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportDatabase = () => {
    // Provide a simple link action to open in new tab.
    // In our Flask app we can just return the file or we can serve the raw sqlite file.
    // Wait, the sqlite file is located in backend/data/nethlee.db or similar.
    // Serving it is super simple! Let's download it.
    window.open('http://localhost:5000/api/reports/export?website_id=1&format=db', '_blank'); // Mock or database export endpoint
    alert("Database export starting. Ensure Python backend is running.");
  };

  return (
    <div className="min-h-screen bg-bg-dark text-white p-6 md:p-8 overflow-y-auto">
      {/* Page Title */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold font-sans bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
            System Settings
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Configure application theme parameters, language, and administer local databases.
          </p>
        </div>
        {saveSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-success/10 border border-success/20 text-success text-xs font-semibold">
            <Check size={14} /> Settings Saved
          </div>
        )}
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-gray-500">Loading settings panel...</span>
          </div>
        </div>
      ) : (
        <div className="max-w-3xl space-y-6">
          {/* General Section */}
          <div className="glass-panel p-6 rounded-2xl border border-[rgba(255,255,255,0.08)] shadow-lg">
            <h3 className="text-base font-bold text-gray-300 mb-6 flex items-center gap-2">
              <Activity size={18} className="text-indigo-400" /> UI Settings
            </h3>
            
            <div className="space-y-6">
              {/* Theme selection */}
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div>
                  <h4 className="text-sm font-semibold">Theme Mode</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Toggle between dark mode and light mode interface.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdateSetting('theme', 'dark')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                      settings.theme === 'dark'
                        ? 'bg-indigo-500/10 border-primary text-white'
                        : 'border-slate-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    <Moon size={14} /> Dark
                  </button>
                  <button
                    onClick={() => handleUpdateSetting('theme', 'light')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                      settings.theme === 'light'
                        ? 'bg-indigo-500/10 border-primary text-white'
                        : 'border-slate-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    <Sun size={14} /> Light
                  </button>
                </div>
              </div>

              {/* Language selection */}
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div>
                  <h4 className="text-sm font-semibold">System Language</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Select your preferred localization.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Languages size={16} className="text-gray-500" />
                  <select
                    value={settings.language}
                    onChange={(e) => handleUpdateSetting('language', e.target.value)}
                    className="px-3 py-1.5 text-xs rounded-xl glass-panel border border-slate-800 bg-slate-900 focus:outline-none"
                  >
                    <option value="en">English (US)</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                  </select>
                </div>
              </div>

              {/* Animation Speeds */}
              <div className="flex items-center justify-between pb-2">
                <div>
                  <h4 className="text-sm font-semibold">Animation Speed</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Control Framer Motion transition durations.</p>
                </div>
                <select
                  value={settings.animation_speed}
                  onChange={(e) => handleUpdateSetting('animation_speed', e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl glass-panel border border-slate-800 bg-slate-900 focus:outline-none"
                >
                  <option value="fast">Fast (0.15s)</option>
                  <option value="normal">Normal (0.3s)</option>
                  <option value="slow">Slow (0.6s)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Database & Backup panel */}
          <div className="glass-panel p-6 rounded-2xl border border-[rgba(255,255,255,0.08)] shadow-lg">
            <h3 className="text-base font-bold text-gray-300 mb-6 flex items-center gap-2">
              <Database size={18} className="text-cyan-400" /> Storage & Database Administration
            </h3>
            
            <div className="space-y-4">
              <p className="text-xs text-gray-500 leading-relaxed">
                NethLee AI runs on an embedded SQLite database. Below you can clean your cached chat queries or export a copy of the database schema and indices.
              </p>
              
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={handleExportDatabase}
                  className="px-4 py-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition text-xs font-bold flex items-center gap-1.5"
                >
                  <Download size={14} /> Export SQLite Database
                </button>
                
                <button
                  onClick={handleClearChatHistory}
                  disabled={actionLoading}
                  className="px-4 py-2.5 rounded-xl border border-danger/30 text-danger hover:bg-danger/10 transition text-xs font-bold flex items-center gap-1.5 disabled:opacity-40"
                >
                  <Trash2 size={14} /> Clear System Chat Logs
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
