import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import LandingPage from './pages/LandingPage';
import Chat from './pages/Chat';
import Dashboard from './pages/Dashboard';
import NlpDashboard from './pages/NlpDashboard';
import Websites from './pages/Websites';
import Settings from './pages/Settings';

function App() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Router>
      <div className="min-h-screen bg-bg-dark text-white font-sans flex">
        {/* Sidebar Nav */}
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
        
        {/* Main Content Area */}
        <main 
          className={`flex-1 min-h-screen transition-all duration-300 ${
            collapsed ? 'pl-20' : 'pl-64'
          }`}
        >
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/nlp" element={<NlpDashboard />} />
            <Route path="/websites" element={<Websites />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
