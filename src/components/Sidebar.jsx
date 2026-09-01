import React from 'react';
import { FileText, History, Zap } from 'lucide-react';

export default function Sidebar({ currentView, setCurrentView }) {
  return (
    <div className="fixed bottom-0 left-0 w-full md:top-0 md:h-full md:w-64 glass-panel border-t md:border-t-0 md:border-r border-white/10 flex md:flex-col z-50 bg-slate-900/95 backdrop-blur-xl md:bg-transparent md:backdrop-blur-none shadow-[0_-10px_40px_rgba(0,0,0,0.5)] md:shadow-none">
      <div className="hidden md:flex p-6 items-center gap-3 border-b border-white/5">
        <Zap className="text-glow" size={28} />
        <span className="text-xl font-bold text-white tracking-wide">Auto SLA & NDA</span>
      </div>
      
      <div className="flex-1 p-2 md:py-8 md:px-4 flex flex-row md:flex-col justify-around md:justify-start gap-2">
        <button 
          onClick={() => setCurrentView('generation')}
          className={`flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-3 px-2 md:px-4 py-2 md:py-3 min-h-[44px] rounded-xl transition-all w-full text-center md:text-left ${
            currentView === 'generation' 
              ? 'bg-glow/10 text-glow border border-glow/20' 
              : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <FileText size={20} className="md:w-5 md:h-5 w-5 h-5" />
          <span className="font-medium text-xs md:text-base mt-1 md:mt-0">Generation</span>
        </button>
        
        <button 
          onClick={() => setCurrentView('dispatchHistory')}
          className={`flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-3 px-2 md:px-4 py-2 md:py-3 min-h-[44px] rounded-xl transition-all w-full text-center md:text-left ${
            currentView === 'dispatchHistory' 
              ? 'bg-glow/10 text-glow border border-glow/20' 
              : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <History size={20} className="md:w-5 md:h-5 w-5 h-5" />
          <span className="font-medium text-xs md:text-base mt-1 md:mt-0">History</span>
        </button>
      </div>
      
      <div className="hidden md:block p-6 text-xs text-gray-500 border-t border-white/5 text-center">
        &copy; 2026 Agency Platform
      </div>
    </div>
  );
}
