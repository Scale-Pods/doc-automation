import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, X, MessageSquareText, Sparkles } from 'lucide-react';
import Hero from './components/Hero';
import IntakeForm from './components/IntakeForm';
import BackgroundAnimation from './components/BackgroundAnimation';
import Sidebar from './components/Sidebar';
import PipelineApprovals from './components/PipelineApprovals';
import ReceiverCenter from './components/ReceiverCenter';
import AnalyticsAudit from './components/AnalyticsAudit';
import SigningComplete from './components/SigningComplete';
import DocEditChat from './components/DocEditChat';

const VALID_VIEWS = ['analytics', 'generation', 'pipeline', 'receiver'];

const isSigningCompleteRoute = () => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase().replace(/\/$/, '');
  const hash = window.location.hash.toLowerCase().replace(/^#\/?/, '').split('?')[0];
  return path === '/signing-complete' || hash === 'signing-complete';
};

const getInitialView = () => {
  if (typeof window !== 'undefined') {
    // 1. Check URL hash first
    const rawHash = window.location.hash.replace('#', '').toLowerCase().trim();
    if (rawHash === 'analytics' || rawHash === 'audit') return 'analytics';
    if (rawHash === 'generation' || rawHash === 'create') return 'generation';
    if (rawHash === 'pipeline' || rawHash === 'approvals' || rawHash === 'approval' || rawHash === 'review') return 'pipeline';
    if (rawHash === 'receiver' || rawHash === 'signed' || rawHash === 'execution') return 'receiver';

    // 2. Fall back to localStorage
    const savedTab = localStorage.getItem('clm_active_tab');
    if (savedTab && VALID_VIEWS.includes(savedTab.toLowerCase())) {
      return savedTab.toLowerCase();
    }
  }
  return 'generation';
};

function App() {
  const [isSigningPage, setIsSigningPage] = useState(isSigningCompleteRoute);
  const [currentView, setCurrentView] = useState(getInitialView);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Shared AI Document Edit Chat State
  const [isDocEditOpen, setIsDocEditOpen] = useState(false);
  const [docEditContracts, setDocEditContracts] = useState([]);
  const [approvalsRefreshKey, setApprovalsRefreshKey] = useState(Date.now());

  const handleOpenDocEdit = (contracts = []) => {
    setDocEditContracts(contracts || []);
    setIsDocEditOpen(true);
  };

  const handleCloseDocEdit = () => {
    setIsDocEditOpen(false);
  };

  const handleContractApplied = (contractIds) => {
    setApprovalsRefreshKey(Date.now());
    showToast('Document changes applied successfully!', 'success');
  };

  // Update active view, localStorage, and URL hash
  const handleViewChange = (newView) => {
    if (!VALID_VIEWS.includes(newView)) return;
    setCurrentView(newView);
    if (typeof window !== 'undefined') {
      localStorage.setItem('clm_active_tab', newView);
      const targetHash = `#${newView}`;
      if (window.location.hash !== targetHash) {
        window.history.replaceState(null, '', targetHash);
      }
    }
  };

  // Synchronize with hash changes and route changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleRouteChange = () => {
        const isSigning = isSigningCompleteRoute();
        setIsSigningPage(isSigning);
        if (!isSigning) {
          const updated = getInitialView();
          setCurrentView(updated);
          localStorage.setItem('clm_active_tab', updated);
        }
      };

      if (!isSigningPage) {
        const initial = getInitialView();
        setCurrentView(initial);
        localStorage.setItem('clm_active_tab', initial);
        if (!window.location.hash) {
          window.history.replaceState(null, '', `#${initial}`);
        }
      }

      window.addEventListener('hashchange', handleRouteChange);
      window.addEventListener('popstate', handleRouteChange);
      return () => {
        window.removeEventListener('hashchange', handleRouteChange);
        window.removeEventListener('popstate', handleRouteChange);
      };
    }
  }, [isSigningPage]);

  if (isSigningPage) {
    return <SigningComplete />;
  }

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4500);
  };

  return (
    <div className="relative w-full min-h-screen flex bg-dark text-white font-sans antialiased selection:bg-glow selection:text-dark">
      <BackgroundAnimation />
      <Sidebar currentView={currentView} setCurrentView={handleViewChange} />
      
      <main className="relative z-10 flex-1 pb-24 md:pb-8 md:ml-64 flex flex-col min-w-0 overflow-x-hidden">
        <AnimatePresence mode="wait">
          {currentView === 'generation' && (
            <motion.div
              key="generation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Hero />
              <IntakeForm onShowToast={showToast} />
            </motion.div>
          )}

          {currentView === 'pipeline' && (
            <motion.div
              key="pipeline"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <PipelineApprovals
                onShowToast={showToast}
                onOpenDocEditChat={handleOpenDocEdit}
                refreshKey={approvalsRefreshKey}
              />
            </motion.div>
          )}

          {currentView === 'receiver' && (
            <motion.div
              key="receiver"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ReceiverCenter onShowToast={showToast} />
            </motion.div>
          )}

          {currentView === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <AnalyticsAudit onShowToast={showToast} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating AI Document Editor Bubble (Visible on every tab, hidden when chat panel is open) */}
      <AnimatePresence>
        {!isDocEditOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.6, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6, y: 20 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => handleOpenDocEdit([])}
            className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-40 w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-500 via-glow to-blue-600 text-dark flex items-center justify-center shadow-[0_0_25px_rgba(0,243,255,0.4)] hover:shadow-[0_0_35px_rgba(0,243,255,0.7)] border border-glow/40 cursor-pointer transition-shadow"
            title="Open AI Document Editor"
          >
            <MessageSquareText size={25} className="text-dark drop-shadow-sm" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-dark animate-pulse" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Shared Single Instance AI Document Edit Chat Panel */}
      <DocEditChat
        isOpen={isDocEditOpen}
        onClose={handleCloseDocEdit}
        initialContracts={docEditContracts}
        onApplied={handleContractApplied}
      />

      {/* Global Toast Notification */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-22 md:bottom-8 right-4 md:right-24 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-xl ${
              toast.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
                : 'bg-slate-900/90 border-glow/40 text-glow'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle size={20} className="text-rose-400 shrink-0" />
            ) : (
              <CheckCircle size={20} className="text-glow shrink-0" />
            )}
            <span className="text-xs md:text-sm font-medium pr-2 text-white">
              {toast.message}
            </span>
            <button
              onClick={() => setToast(prev => ({ ...prev, show: false }))}
              className="text-gray-400 hover:text-white p-0.5"
            >
              <X size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
