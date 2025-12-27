import React from 'react';
import { Agent } from '../types';

interface AgentAvatarProps {
  agent: Agent;
  size?: 'sm' | 'md' | 'lg';
}

const AgentAvatar: React.FC<AgentAvatarProps> = ({ agent, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-14 h-14',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };

  const getStatusStyle = () => {
    switch (agent.status) {
      case 'processing': return 'border-navy border-2 shadow-[0_0_25px_rgba(15,23,42,0.2)] animate-pulse';
      case 'alerting': return 'border-red-500 border-2 shadow-[0_0_30px_rgba(239,68,68,0.3)] animate-bounce';
      default: return 'border-slate-200 border-[1px]';
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 group">
      <div className={`relative rounded-[32px] bg-white ${sizeClasses[size]} ${getStatusStyle()} transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden flex items-center justify-center hover:scale-110 hover:shadow-2xl hover:border-navy business-shadow`}>
        <div className={`absolute inset-0 bg-gradient-to-tr from-slate-50 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
        <svg viewBox="0 0 24 24" className={`w-1/2 h-1/2 text-navy fill-current opacity-20 group-hover:opacity-100 group-hover:scale-110 transition-all z-10 duration-500`}>
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
        </svg>
        {agent.status !== 'idle' && (
           <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${agent.status === 'alerting' ? 'bg-red-500' : 'bg-navy animate-ping'} shadow-sm z-20`} />
        )}
      </div>
      <div className="text-center group-hover:translate-y-1 transition-transform duration-500">
        <p className={`text-[11px] uppercase tracking-[0.3em] font-black text-navy opacity-40 group-hover:opacity-100 transition-opacity`}>{agent.name}</p>
        {size === 'md' && (
           <p className="text-[9px] text-slateBlue max-w-[120px] leading-tight mt-2 uppercase font-extrabold tracking-widest opacity-60">{agent.specialization}</p>
        )}
      </div>
    </div>
  );
};

export default AgentAvatar;