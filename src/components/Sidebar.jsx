import React from 'react';
import { FileText, GitPullRequest, BarChart3, ShieldCheck } from 'lucide-react';

export default function Sidebar({ currentView, setCurrentView }) {
  const navItems = [
    {
      id: 'analytics',
      label: 'Analytics & Audit',
      icon: BarChart3,
      badge: 'Metrics'
    },
    {
      id: 'generation',
      label: 'Generation',
      icon: FileText,
      badge: 'Create'
    },
    {
      id: 'pipeline',
      label: 'Approval Center',
      icon: GitPullRequest,
      badge: 'Review'
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 w-full md:top-0 md:h-full md:w-64 glass-panel border-t md:border-t-0 md:border-r border-white/10 flex md:flex-col z-50 bg-slate-950/95 backdrop-blur-xl md:bg-dark/80 md:backdrop-blur-xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] md:shadow-none">
      {/* Brand Header */}
      <div className="hidden md:flex p-6 items-center gap-3 border-b border-white/5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-glow/20 to-blue-600/30 border border-glow/30 flex items-center justify-center shadow-[0_0_15px_rgba(0,243,255,0.2)]">
          <ShieldCheck className="text-glow" size={24} />
        </div>
        <div>
          <span className="text-lg font-bold text-white tracking-wide block leading-tight">CLM Contract</span>
          <span className="text-xs text-glow font-medium uppercase tracking-wider">Suite Platform</span>
        </div>
      </div>
      
      {/* Navigation Items */}
      <div className="flex-1 p-2 md:py-6 md:px-3 flex flex-row md:flex-col justify-around md:justify-start gap-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`group relative flex flex-col md:flex-row items-center justify-center md:justify-between px-2.5 md:px-3.5 py-2 md:py-3 min-h-[44px] rounded-xl transition-all duration-200 w-full text-center md:text-left ${
                isActive
                  ? 'bg-glow/10 text-glow border border-glow/30 shadow-[0_0_20px_rgba(0,243,255,0.15)]'
                  : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <div className="flex flex-col md:flex-row items-center gap-1 md:gap-3">
                <Icon size={19} className={`transition-transform duration-200 ${isActive ? 'scale-110 text-glow' : 'group-hover:text-gray-200'}`} />
                <span className="font-medium text-xs md:text-sm">{item.label}</span>
              </div>
              
              {/* Active Indicator on Desktop */}
              {isActive && (
                <div className="hidden md:block w-1.5 h-1.5 rounded-full bg-glow shadow-[0_0_8px_#00f3ff]" />
              )}
            </button>
          );
        })}
      </div>
      
      {/* Footer System Status */}
      <div className="hidden md:flex flex-col gap-2 p-5 text-xs text-gray-500 border-t border-white/5 bg-black/20">
        <div className="flex items-center justify-between">
          <span className="text-gray-400 font-medium">System Status</span>
          <span className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Operational
          </span>
        </div>
        <div className="text-[11px] text-gray-500 mt-1">
          &copy; 2026 CLM Contract Suite
        </div>
      </div>
    </div>
  );
}
