import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Eye,
  Check,
  X,
  Loader2,
  RefreshCw,
  FileText,
  Building2,
  Calendar,
  ExternalLink,
  Maximize2,
  Minimize2,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Layers,
  ShieldCheck,
  AlertTriangle,
  Send,
  FileCheck
} from 'lucide-react';
import {
  fetchContracts
} from '../lib/supabaseClient';

export default function ReceiverCenter({ onShowToast }) {
  const [contracts, setContracts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState({}); // { [contractId]: 'complete' | 'request_changes' }
  const [batchLoading, setBatchLoading] = useState({}); // { [companyName]: boolean }
  const [previewModal, setPreviewModal] = useState({ isOpen: false, url: '', title: '' });
  const [confirmSingleModal, setConfirmSingleModal] = useState({
    isOpen: false,
    contract: null,
    isSubmitting: false
  });
  const [confirmBothModal, setConfirmBothModal] = useState({
    isOpen: false,
    group: null,
    contractIds: [],
    isSubmitting: false
  });
  const [changeModal, setChangeModal] = useState({
    isOpen: false,
    contract: null,
    reason: '',
    isSubmitting: false
  });
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Load contracts from Supabase
  const loadContracts = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const { data, error } = await fetchContracts();
      if (error) {
        console.error('Error fetching contracts in ReceiverCenter:', error);
        setFetchError(error.message || 'Failed to load contracts from Supabase');
      } else {
        setContracts(data || []);
      }
    } catch (err) {
      console.error('Unexpected error loading contracts:', err);
      setFetchError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadContracts();
  }, []);

  // Post-signature contracts only: executed, completed, changes_requested, resent_for_signature
  const postSignatureContracts = useMemo(() => {
    return contracts.filter(c => {
      const s = (c.status || '').toLowerCase().trim();
      return s === 'executed' || s === 'completed' || s === 'changes_requested' || s === 'resent_for_signature' || s === 'resent';
    });
  }, [contracts]);

  // Handle single contract confirmation modal handlers
  const openConfirmSingleModal = (contract) => {
    setConfirmSingleModal({
      isOpen: true,
      contract,
      isSubmitting: false
    });
  };

  const closeConfirmSingleModal = () => {
    setConfirmSingleModal({
      isOpen: false,
      contract: null,
      isSubmitting: false
    });
  };

  const handleExecuteSingleConfirm = async () => {
    const contract = confirmSingleModal.contract;
    if (!contract || !contract.id) return;
    const contractId = contract.id;

    setConfirmSingleModal(prev => ({ ...prev, isSubmitting: true }));
    setActionLoading(prev => ({ ...prev, [contractId]: 'complete' }));

    try {
      const response = await fetch('https://n8n.srv1711190.hstgr.cloud/webhook/confirm-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract_id: contractId })
      });

      if (!response.ok) {
        throw new Error(`Webhook error (${response.status}): ${response.statusText}`);
      }

      const docType = contract.doc_type || 'Document';
      onShowToast?.(`${docType} confirmed and sent to internal team.`, 'success');

      // Optimistic status update to completed
      setContracts(prev => prev.map(c => c.id === contractId ? { ...c, status: 'completed' } : c));
      closeConfirmSingleModal();

      // Reload live contracts from Supabase to keep state in sync
      await loadContracts();
    } catch (error) {
      console.error('Error confirming and completing contract:', error);
      onShowToast?.('Something went wrong — please try again.', 'error');
      setConfirmSingleModal(prev => ({ ...prev, isSubmitting: false }));
    } finally {
      setActionLoading(prev => {
        const next = { ...prev };
        delete next[contractId];
        return next;
      });
    }
  };

  // Handle batch confirmation modal handlers
  const openConfirmBothModal = (group) => {
    const contractsToComplete = (group.contracts || []).filter(c => (c.status || '').toLowerCase() === 'executed');
    const ndaContract = group.contracts.find(c => (c.doc_type || '').toUpperCase().includes('NDA'));
    const slaContract = group.contracts.find(c => (c.doc_type || '').toUpperCase().includes('SLA'));

    let contractIds = [];
    if (ndaContract && slaContract && ndaContract.id !== slaContract.id) {
      contractIds = [ndaContract.id, slaContract.id];
    } else {
      contractIds = contractsToComplete.map(c => c.id).filter(Boolean);
    }

    setConfirmBothModal({
      isOpen: true,
      group,
      contractIds,
      isSubmitting: false
    });
  };

  const closeConfirmBothModal = () => {
    setConfirmBothModal({
      isOpen: false,
      group: null,
      contractIds: [],
      isSubmitting: false
    });
  };

  const handleExecuteBothConfirm = async () => {
    const { group, contractIds } = confirmBothModal;
    if (!group || !contractIds || !contractIds.length) return;
    const companyKey = group.companyName;

    setConfirmBothModal(prev => ({ ...prev, isSubmitting: true }));
    setBatchLoading(prev => ({ ...prev, [companyKey]: true }));

    const payload = {
      contract_ids: contractIds
    };

    console.log('Dispatching Confirm & Complete Both payload to webhook:', payload);

    try {
      const response = await fetch('https://n8n.srv1711190.hstgr.cloud/webhook/confirm-complete-both', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Webhook error (${response.status}): ${response.statusText}`);
      }

      onShowToast?.(`Both documents for ${group.companyName} confirmed and sent to internal team.`, 'success');

      // Optimistically update statuses of both contracts in this group to 'completed'
      setContracts(prev =>
        prev.map(c => (contractIds.includes(c.id) ? { ...c, status: 'completed' } : c))
      );
      closeConfirmBothModal();

      // Reload live contracts from Supabase
      await loadContracts();
    } catch (error) {
      console.error('Error completing both contracts:', error);
      onShowToast?.('Something went wrong — please try again.', 'error');
      setConfirmBothModal(prev => ({ ...prev, isSubmitting: false }));
    } finally {
      setBatchLoading(prev => {
        const next = { ...prev };
        delete next[companyKey];
        return next;
      });
    }
  };

  const openChangeModal = (contract) => {
    setChangeModal({
      isOpen: true,
      contract,
      reason: '',
      isSubmitting: false
    });
  };

  const closeChangeModal = () => {
    setChangeModal({
      isOpen: false,
      contract: null,
      reason: '',
      isSubmitting: false
    });
  };

  const handleConfirmChangeRequest = async (e) => {
    e.preventDefault();
    const contract = changeModal.contract;
    if (!contract || !changeModal.reason.trim()) return;

    const contractId = contract.id;
    const reasonText = changeModal.reason.trim();

    setChangeModal(prev => ({ ...prev, isSubmitting: true }));
    setActionLoading(prev => ({ ...prev, [contractId]: 'request_changes' }));

    const payload = {
      contract_id: contractId,
      reason: reasonText
    };

    console.log('Dispatching request-changes payload to webhook:', payload);

    try {
      const response = await fetch('https://n8n.srv1711190.hstgr.cloud/webhook/request-changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Webhook error (${response.status}): ${response.statusText}`);
      }

      onShowToast?.('Change request sent — client has been notified', 'success');

      // Optimistic status update to changes_requested
      setContracts(prev => prev.map(c => c.id === contractId ? { ...c, status: 'changes_requested', rejection_reason: reasonText } : c));
      closeChangeModal();
      await loadContracts();
    } catch (error) {
      console.error('Error submitting change request:', error);
      onShowToast?.('Something went wrong — please try again', 'error');
      setChangeModal(prev => ({ ...prev, isSubmitting: false }));
    } finally {
      setActionLoading(prev => {
        const next = { ...prev };
        delete next[contractId];
        return next;
      });
    }
  };

  const getCleanPreviewUrl = (url) => {
    if (!url) return '';
    let clean = url.trim();
    if (clean.startsWith('[')) clean = clean.substring(1);
    if (clean.endsWith(']')) clean = clean.substring(0, clean.length - 1);
    if (clean.includes('drive.google.com/file/d/')) {
      return clean.replace('/view', '/preview');
    }
    return clean;
  };

  const openPreview = (url, title) => {
    setPreviewModal({
      isOpen: true,
      url: getCleanPreviewUrl(url),
      title: title || 'Signed Contract Preview'
    });
    setIsFullScreen(false);
  };

  // Status counts for post-signature contracts
  const counts = {
    all: postSignatureContracts.length,
    executed: postSignatureContracts.filter(c => (c.status || '').toLowerCase() === 'executed').length,
    completed: postSignatureContracts.filter(c => (c.status || '').toLowerCase() === 'completed').length,
    changes_requested: postSignatureContracts.filter(c => (c.status || '').toLowerCase() === 'changes_requested').length,
    resent_for_signature: postSignatureContracts.filter(c => {
      const s = (c.status || '').toLowerCase();
      return s === 'resent_for_signature' || s === 'resent';
    }).length
  };

  // Filtered post-signature contracts
  const filteredContracts = useMemo(() => {
    return postSignatureContracts.filter(contract => {
      const statusLower = (contract.status || '').toLowerCase().trim();
      if (activeFilter !== 'all') {
        if (activeFilter === 'resent_for_signature') {
          if (statusLower !== 'resent_for_signature' && statusLower !== 'resent') {
            return false;
          }
        } else if (statusLower !== activeFilter.toLowerCase()) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const company = (contract.company_name || contract.client_name || contract.client_company_name || '').toLowerCase();
        const id = (contract.id || '').toLowerCase();
        const docType = (contract.doc_type || '').toLowerCase();
        const email = (contract.client_email || '').toLowerCase();
        const reason = (contract.rejection_reason || contract.reason || '').toLowerCase();
        return company.includes(q) || id.includes(q) || docType.includes(q) || email.includes(q) || reason.includes(q);
      }
      return true;
    });
  }, [postSignatureContracts, activeFilter, searchQuery]);

  // Group contracts by company
  const companyGroups = useMemo(() => {
    const groups = {};
    filteredContracts.forEach(contract => {
      const companyKey = (contract.company_name || contract.client_name || contract.client_company_name || 'Unnamed Company').trim();
      if (!groups[companyKey]) {
        groups[companyKey] = {
          companyName: companyKey,
          signatoryName: contract.signatory_name || '',
          clientEmail: contract.client_email || '',
          contracts: []
        };
      }
      groups[companyKey].contracts.push(contract);
    });
    return Object.values(groups);
  }, [filteredContracts]);

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'executed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.15)]">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            Executed
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-400/40 shadow-[0_0_12px_rgba(52,211,153,0.25)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Completed
          </span>
        );
      case 'changes_requested':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-300 border border-orange-500/30 shadow-[0_0_10px_rgba(249,115,22,0.15)]">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"></span>
            Changes Requested
          </span>
        );
      case 'resent_for_signature':
      case 'resent':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-200 border border-indigo-400/30 shadow-[0_0_10px_rgba(129,140,248,0.2)]">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-300"></span>
            Sent for Resignature
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-500/10 text-gray-300 border border-gray-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
            {status || 'Unknown'}
          </span>
        );
    }
  };

  const getDocTypeBadge = (docType) => {
    const type = (docType || 'NDA').toUpperCase();
    if (type.includes('NDA') && type.includes('SLA')) {
      return (
        <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-sm">
          NDA + SLA
        </span>
      );
    }
    if (type.includes('SLA')) {
      return (
        <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-sm">
          SLA
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm">
        NDA
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-10 relative overflow-y-auto w-full">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto mt-14 md:mt-2"
      >
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
              <FileCheck size={26} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
                <span>Receiver Center</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  Signed Documents
                </span>
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">
                Review signed documents, confirm & complete executed contracts, or flag issues with changes requested.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={loadContracts}
              disabled={isLoading}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 hover:border-glow/30 text-white transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin text-glow" : ""} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Fetch Error Banner */}
        {fetchError && (
          <div className="glass-panel p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 mb-6 flex items-center justify-between gap-3 text-xs text-rose-300">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-rose-400 shrink-0" />
              <span><strong>Error loading signed contracts:</strong> {fetchError}</span>
            </div>
            <button
              onClick={loadContracts}
              className="underline hover:text-white"
            >
              Retry
            </button>
          </div>
        )}

        {/* Filter Tabs & Search Bar */}
        <div className="glass-panel rounded-2xl p-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Top Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            {[
              { key: 'all', label: 'All Signed', count: counts.all },
              { key: 'executed', label: 'Executed (Ready for Review)', count: counts.executed },
              { key: 'completed', label: 'Completed', count: counts.completed },
              { key: 'changes_requested', label: 'Changes Requested', count: counts.changes_requested },
              { key: 'resent_for_signature', label: 'Sent for Resignature', count: counts.resent_for_signature }
            ].map((tab) => {
              const isSelected = activeFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-glow text-dark shadow-[0_0_15px_rgba(0,243,255,0.4)]'
                      : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isSelected ? 'bg-dark/30 text-dark' : 'bg-white/10 text-gray-300'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Bar */}
          <div className="relative min-w-[220px] md:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search signed contracts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 focus:border-glow/50 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-gray-500 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Content Section */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Loader2 size={32} className="animate-spin text-glow mb-3" />
            <p className="text-sm font-medium">Loading signed contracts from Supabase...</p>
          </div>
        ) : companyGroups.length === 0 ? (
          <div className="glass-panel rounded-2xl p-12 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 mb-4">
              <Filter size={24} />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">No signed contracts found</h3>
            <p className="text-sm text-gray-400 max-w-sm">
              {searchQuery
                ? `No matching records found for "${searchQuery}". Try a different search term.`
                : `There are currently no contracts in the "${activeFilter}" stage.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {companyGroups.map((group, gIdx) => {
              const docCount = group.contracts.length;
              const hasBothExecuted = group.contracts.length === 2 && group.contracts.every(c => (c.status || '').toLowerCase() === 'executed');
              const isThisBatchLoading = Boolean(batchLoading[group.companyName]);

              return (
                <motion.div
                  key={group.companyName + gIdx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: gIdx * 0.04 }}
                  className="glass-panel rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-300 shadow-xl overflow-hidden flex flex-col md:flex-row items-stretch"
                >
                  {/* Left Column: Company Info */}
                  <div className="w-full md:w-72 lg:w-80 shrink-0 p-5 md:p-6 flex flex-col justify-center items-start bg-white/[0.02] border-b md:border-b-0 md:border-r border-white/10">
                    <div className="flex items-center gap-3.5 mb-2 w-full">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                        <Building2 size={22} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base md:text-lg font-bold text-white tracking-tight leading-snug break-words">
                          {group.companyName}
                        </h3>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-glow uppercase tracking-wider">
                            <Layers size={11} />
                            <span>{docCount} {docCount === 1 ? 'Contract' : 'Contracts'}</span>
                          </span>

                          {/* "Confirm & Complete Both" Action Button */}
                          {hasBothExecuted && (
                            <button
                              onClick={() => openConfirmBothModal(group)}
                              disabled={isThisBatchLoading || group.contracts.some(c => Boolean(actionLoading[c.id]))}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-emerald-500/25 via-teal-500/25 to-emerald-500/25 hover:from-emerald-500 hover:to-teal-500 text-emerald-300 hover:text-white border border-emerald-500/40 hover:border-emerald-400 transition-all duration-200 shadow-[0_0_12px_rgba(16,185,129,0.25)] hover:shadow-[0_0_18px_rgba(16,185,129,0.45)] disabled:opacity-50 cursor-pointer"
                              title="Confirm and complete both executed documents"
                            >
                              {isThisBatchLoading ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <ShieldCheck size={12} strokeWidth={2.2} />
                              )}
                              <span>Confirm & Complete Both</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Signatory / Contact info */}
                    {(group.signatoryName || group.clientEmail) && (
                      <div className="mt-2 text-xs text-gray-400 space-y-0.5 pl-0.5">
                        {group.signatoryName && (
                          <div className="text-gray-300 font-medium truncate">
                            {group.signatoryName}
                          </div>
                        )}
                        {group.clientEmail && (
                          <div className="text-gray-500 font-mono text-[11px] truncate">
                            {group.clientEmail}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Section: Associated Documents Stack */}
                  <div className="flex-1 flex flex-col justify-center divide-y divide-white/5">
                    {group.contracts.map((contract, cIdx) => {
                      const docType = contract.doc_type || 'NDA';
                      const signedDocUrl = contract.signed_doc_url || '';
                      const statusLower = (contract.status || '').toLowerCase();
                      const isExecuted = statusLower === 'executed';
                      const isCompleted = statusLower === 'completed';
                      const isChangesRequested = statusLower === 'changes_requested';
                      const isResent = statusLower === 'resent_for_signature' || statusLower === 'resent';
                      const changeReason = contract.rejection_reason || contract.reason || '';

                      const isCompleting = actionLoading[contract.id] === 'complete';
                      const isAnyActionLoading = Boolean(actionLoading[contract.id]) || isThisBatchLoading;

                      return (
                        <div
                          key={contract.id || cIdx}
                          className="p-4 sm:p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
                        >
                          {/* Sub-row Left: Doc Type Badge, Date, Status Badge and Change Request Callout */}
                          <div className="flex flex-col gap-2 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap">
                              {getDocTypeBadge(docType)}

                              <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium whitespace-nowrap">
                                <Calendar size={13} className="text-gray-500 shrink-0" />
                                <span>{formatDate(contract.created_at)}</span>
                              </div>

                              <div className="shrink-0">
                                {getStatusBadge(contract.status)}
                              </div>
                            </div>

                            {/* Reason Callout if Changes Requested */}
                            {isChangesRequested && changeReason && (
                              <div className="mt-1 flex items-start gap-2 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/25 text-orange-300 text-xs leading-relaxed max-w-xl">
                                <AlertCircle size={14} className="text-orange-400 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-semibold text-orange-200 mr-1.5">Change Request:</span>
                                  <span className="text-orange-300/90">{changeReason}</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Sub-row Right: Preview Button & Actions */}
                          <div className="flex items-center gap-2.5 flex-wrap justify-start xl:justify-end shrink-0">
                            {/* View Document Preview (Signed PDF) */}
                            {signedDocUrl ? (
                              <button
                                onClick={() => openPreview(signedDocUrl, `${group.companyName} - ${docType} (Signed)`)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-glow/10 text-gray-200 hover:text-glow border border-white/10 hover:border-glow/30 transition-all shadow-sm cursor-pointer whitespace-nowrap"
                              >
                                <Eye size={13} />
                                <span>View Doc</span>
                              </button>
                            ) : (
                              <span className="text-xs text-gray-500 italic">No Doc URL</span>
                            )}

                            {/* Action Buttons */}
                            {isExecuted ? (
                              <div className="flex items-center gap-2 flex-wrap">
                                {/* Confirm & Complete Button */}
                                <button
                                  onClick={() => openConfirmSingleModal(contract)}
                                  disabled={isAnyActionLoading}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/25 hover:bg-emerald-500 text-emerald-300 hover:text-white border border-emerald-400/50 hover:border-emerald-400 transition-all duration-200 shadow-[0_0_12px_rgba(16,185,129,0.3)] disabled:opacity-50 cursor-pointer whitespace-nowrap"
                                  title="Confirm signed document is correct and complete contract"
                                >
                                  {isCompleting ? (
                                    <Loader2 size={13} className="animate-spin" />
                                  ) : (
                                    <ShieldCheck size={13} strokeWidth={2.2} />
                                  )}
                                  <span>Confirm & Complete</span>
                                </button>

                                {/* Request Changes Button */}
                                <button
                                  onClick={() => openChangeModal(contract)}
                                  disabled={isAnyActionLoading}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-500/20 hover:bg-orange-500 text-orange-300 hover:text-white border border-orange-500/40 hover:border-orange-500 transition-all duration-200 shadow-[0_0_10px_rgba(249,115,22,0.2)] disabled:opacity-50 cursor-pointer whitespace-nowrap"
                                  title="Flag issue with reason and request changes"
                                >
                                  <AlertTriangle size={13} strokeWidth={2.2} />
                                  <span>Request Changes</span>
                                </button>
                              </div>
                            ) : isCompleted ? (
                              <span className="text-xs text-emerald-300 flex items-center gap-1.5 font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)] whitespace-nowrap">
                                <CheckCircle2 size={13} className="text-emerald-400" />
                                <span>Completed</span>
                              </span>
                            ) : isChangesRequested ? (
                              <span className="text-xs text-orange-300 flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20 whitespace-nowrap">
                                <Clock size={13} className="text-orange-400" />
                                <span>Changes Requested</span>
                              </span>
                            ) : isResent ? (
                              <span className="text-xs text-indigo-300 flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 whitespace-nowrap">
                                <Clock size={13} className="text-indigo-400" />
                                <span>Sent for Resignature</span>
                              </span>
                            ) : (
                              <span className="text-xs text-gray-500 flex items-center gap-1 font-medium whitespace-nowrap">
                                <CheckCircle2 size={13} className="text-gray-600" />
                                <span>No actions needed</span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Confirm Single Document Modal */}
      {confirmSingleModal.isOpen && confirmSingleModal.contract && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="glass-panel border border-emerald-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl bg-slate-900/95"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg leading-tight">Confirm Document</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {confirmSingleModal.contract.company_name || confirmSingleModal.contract.client_name || 'Client Contract'}
                  </p>
                </div>
              </div>
              <button
                onClick={closeConfirmSingleModal}
                disabled={confirmSingleModal.isSubmitting}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {getDocTypeBadge(confirmSingleModal.contract.doc_type)}
                <span className="text-xs text-gray-400 font-medium">
                  {confirmSingleModal.contract.signatory_name || confirmSingleModal.contract.client_email || ''}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 text-sm leading-relaxed">
                The {confirmSingleModal.contract.doc_type || 'document'} is signed and confirmed and will be sent to the internal team.
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={closeConfirmSingleModal}
                  disabled={confirmSingleModal.isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteSingleConfirm}
                  disabled={confirmSingleModal.isSubmitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all disabled:opacity-50 cursor-pointer"
                >
                  {confirmSingleModal.isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Confirming...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={14} strokeWidth={2.2} />
                      <span>Confirm & Send</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {/* Confirm Both Documents Modal */}
      {confirmBothModal.isOpen && confirmBothModal.group && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="glass-panel border border-emerald-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl bg-slate-900/95"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg leading-tight">Confirm Both Documents</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {confirmBothModal.group.companyName}
                  </p>
                </div>
              </div>
              <button
                onClick={closeConfirmBothModal}
                disabled={confirmBothModal.isSubmitting}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-sm">
                  NDA + SLA
                </span>
                <span className="text-xs text-gray-400 font-medium">
                  {confirmBothModal.group.signatoryName || confirmBothModal.group.clientEmail || ''}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 text-sm leading-relaxed">
                Both documents are signed and confirmed and will be sent to the internal team.
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={closeConfirmBothModal}
                  disabled={confirmBothModal.isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteBothConfirm}
                  disabled={confirmBothModal.isSubmitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all disabled:opacity-50 cursor-pointer"
                >
                  {confirmBothModal.isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Confirming...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={14} strokeWidth={2.2} />
                      <span>Confirm & Send</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {/* Request Changes Modal */}
      {changeModal.isOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-panel border border-orange-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl bg-slate-900/95"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 text-orange-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(249,115,22,0.2)]">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg leading-tight">Request Changes</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Specify why changes are needed before the document can be finalized.
                  </p>
                </div>
              </div>
              <button
                onClick={closeChangeModal}
                disabled={changeModal.isSubmitting}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleConfirmChangeRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Change Request Details <span className="text-orange-400">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="e.g., Section 3 payment milestones need adjustment before client resigns..."
                  value={changeModal.reason}
                  onChange={(e) => setChangeModal(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full bg-black/50 border border-white/15 focus:border-orange-400 focus:ring-1 focus:ring-orange-400 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none transition-all resize-none"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={closeChangeModal}
                  disabled={changeModal.isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!changeModal.reason.trim() || changeModal.isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white shadow-[0_0_15px_rgba(249,115,22,0.3)] transition-all disabled:opacity-50 cursor-pointer"
                >
                  {changeModal.isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit Change Request</span>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>,
        document.body
      )}

      {/* Document Preview Modal */}
      {previewModal.isOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`glass-panel border border-glow/30 rounded-2xl flex flex-col shadow-2xl bg-slate-900/95 overflow-hidden transition-all duration-300 ${
              isFullScreen
                ? 'fixed inset-2 sm:inset-4 md:inset-6 z-[101] max-w-none max-h-none h-[calc(100vh-2rem)]'
                : 'w-full max-w-5xl h-[85vh] max-h-[850px]'
            }`}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-glow/10 border border-glow/30 flex items-center justify-center text-glow shrink-0">
                  <FileText size={16} />
                </div>
                <h3 className="font-bold text-white text-sm sm:text-base truncate">
                  {previewModal.title}
                </h3>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                {previewModal.url && (
                  <a
                    href={previewModal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                    title="Open in new tab"
                  >
                    <ExternalLink size={13} />
                    <span className="hidden sm:inline">Open Tab</span>
                  </a>
                )}

                <button
                  onClick={() => setIsFullScreen(!isFullScreen)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
                >
                  {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>

                <button
                  onClick={() => setPreviewModal({ isOpen: false, url: '', title: '' })}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Close Preview"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body / Iframe */}
            <div className="flex-1 w-full h-full bg-slate-950/60 p-2 sm:p-4 overflow-hidden relative">
              {previewModal.url ? (
                <iframe
                  src={previewModal.url}
                  title={previewModal.title}
                  className="w-full h-full rounded-xl border border-white/10 bg-white"
                  allow="autoplay"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <AlertCircle size={32} className="text-gray-500 mb-2" />
                  <p className="text-sm">No preview URL available for this document.</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
}
