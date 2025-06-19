
import React from 'react';
import { useNavigate } from 'react-router-dom';

const AutoVantageLogo: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div 
      className="flex items-center space-x-3 cursor-pointer group"
      onClick={() => navigate('/')}
    >
      {/* Logo Icon - Stylized "A" with speed lines */}
      <div className="relative">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-300 group-hover:shadow-xl">
          <div className="relative">
            {/* Main "A" shape */}
            <div className="text-white font-bold text-xl leading-none">A</div>
            {/* Speed lines effect */}
            <div className="absolute -right-1 top-1 w-2 h-0.5 bg-white/60 rounded-full transform rotate-12"></div>
            <div className="absolute -right-1 top-2 w-1.5 h-0.5 bg-white/40 rounded-full transform rotate-12"></div>
            <div className="absolute -right-1 top-3 w-1 h-0.5 bg-white/30 rounded-full transform rotate-12"></div>
          </div>
        </div>
        {/* Subtle glow effect */}
        <div className="absolute inset-0 w-10 h-10 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-xl blur-md group-hover:blur-lg transition-all duration-300"></div>
      </div>
      
      {/* Brand Text */}
      <div className="flex flex-col">
        <div className="text-2xl font-bold bg-gradient-to-r from-blue-700 via-blue-800 to-purple-700 bg-clip-text text-transparent group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-300">
          AutoVantage
        </div>
        <div className="text-xs text-gray-500 font-medium tracking-wide -mt-0.5">
          Drive Your Success
        </div>
      </div>
    </div>
  );
};

export default AutoVantageLogo;
