import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  MessageSquare, 
  BarChart3, 
  Cpu, 
  Globe, 
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import NeuralLogo from './NeuralLogo';

const Sidebar = ({ collapsed, setCollapsed }) => {
  const links = [
    { name: 'Landing Page', path: '/', icon: Home },
    { name: 'AI Chatbot', path: '/chat', icon: MessageSquare },
    { name: 'Analytics', path: '/dashboard', icon: BarChart3 },
    { name: 'NLP Dashboard', path: '/nlp', icon: Cpu },
    { name: 'Manage Sites', path: '/websites', icon: Globe },
    { name: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  return (
    <aside 
      className={`glass-panel h-screen fixed left-0 top-0 z-40 transition-all duration-300 flex flex-col border-r border-[rgba(255,255,255,0.08)] ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-20 flex items-center px-4 border-b border-[rgba(255,255,255,0.08)] overflow-hidden">
        <NeuralLogo className="h-10 w-10 flex-shrink-0" />
        {!collapsed && (
          <span className="ml-3 font-sans font-bold text-xl bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent truncate select-none">
            NethLee AI
          </span>
        )}
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                `flex items-center px-3 py-3 rounded-xl transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-gradient-to-r from-[rgba(99,102,241,0.15)] to-[rgba(139,92,246,0.15)] text-primary border-l-2 border-primary font-medium'
                    : 'text-gray-400 hover:bg-slate-800/40 hover:text-white'
                }`
              }
            >
              <Icon className={`h-5 w-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110`} />
              {!collapsed && (
                <span className="ml-4 text-sm font-sans tracking-wide truncate">
                  {link.name}
                </span>
              )}
              {collapsed && (
                <div className="absolute left-full ml-4 px-2 py-1 bg-slate-950 text-white text-xs rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 shadow-md">
                  {link.name}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Toggle button */}
      <div className="p-4 border-t border-[rgba(255,255,255,0.08)] flex justify-end">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 border border-[rgba(255,255,255,0.05)] text-gray-400 hover:text-white transition-colors"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
