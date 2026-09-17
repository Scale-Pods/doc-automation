import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, X } from 'lucide-react';
import Hero from './components/Hero';
import IntakeForm from './components/IntakeForm';
import BackgroundAnimation from './components/BackgroundAnimation';
import Sidebar from './components/Sidebar';
import PipelineApprovals from './components/PipelineApprovals';
import ReceiverCenter from './components/ReceiverCenter';
import AnalyticsAudit from './components/AnalyticsAudit';
import SigningComplete from './components/SigningComplete';

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
              <PipelineApprovals onShowToast={showToast} />
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

      {/* Global Toast Notification */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-20 md:bottom-8 right-4 md:right-8 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-xl ${
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

