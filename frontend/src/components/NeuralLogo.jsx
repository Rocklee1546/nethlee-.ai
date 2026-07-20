import React from 'react';

const NeuralLogo = ({ className = "h-8 w-8" }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full filter drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]"
      >
        <defs>
          <linearGradient id="neural-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06B6D4" /> {/* Cyan */}
            <stop offset="50%" stopColor="#6366F1" /> {/* Indigo */}
            <stop offset="100%" stopColor="#8B5CF6" /> {/* Purple */}
          </linearGradient>
        </defs>
        
        {/* Connection Lines (Neural Net Theme) */}
        <line x1="20" y1="20" x2="20" y2="80" stroke="url(#neural-gradient)" strokeWidth="2.5" opacity="0.3" />
        <line x1="20" y1="20" x2="80" y2="80" stroke="url(#neural-gradient)" strokeWidth="2.5" opacity="0.3" />
        <line x1="80" y1="20" x2="80" y2="80" stroke="url(#neural-gradient)" strokeWidth="2.5" opacity="0.3" />
        <line x1="20" y1="80" x2="80" y2="20" stroke="url(#neural-gradient)" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.2" />

        {/* Monogram "N" Pathways */}
        <path
          d="M 20 80 L 20 20 L 80 80 L 80 20"
          stroke="url(#neural-gradient)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Neural Nodes / Points */}
        <circle cx="20" cy="20" r="6" fill="#06B6D4" className="animate-pulse" />
        <circle cx="20" cy="80" r="5" fill="#6366F1" />
        <circle cx="80" cy="20" r="5" fill="#8B5CF6" />
        <circle cx="80" cy="80" r="6" fill="#6366F1" className="animate-pulse" />
        <circle cx="50" cy="50" r="4.5" fill="#FFFFFF" />
      </svg>
    </div>
  );
};

export default NeuralLogo;
