import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitPullRequest,
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
  RotateCcw,
  Send,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import {
  fetchContracts
} from '../lib/supabaseClient';

export default function PipelineApprovals({ onShowToast }) {
  const [contracts, setContracts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState({}); // { [contractId]: 'approve' | 'reject' | 'reopen' }
  const [batchLoading, setBatchLoading] = useState({}); // { [companyName]: boolean }
  const [previewModal, setPreviewModal] = useState({ isOpen: false, url: '', title: '' });
  const [rejectionModal, setRejectionModal] = useState({
    isOpen: false,
    contract: null,
    reason: '',
    isSubmitting: false
  });
  const [isFullScreen, setIsFullScreen] = useState(false);

  const loadContracts = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const result = await fetchContracts();
      if (result.error) {
        setFetchError(result.error.message || 'Failed to fetch contracts');
        setContracts([]);
      } else {
        setContracts(result.data || []);
      }
    } catch (err) {
      console.error('Failed to load contracts from Supabase:', err);
      setFetchError(err.message || 'Unexpected connection error');
      setContracts([]);
      onShowToast?.('Failed to fetch contracts from Supabase', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadContracts();
  }, []);

  // All live contracts from Supabase are displayed with filter tabs

  // Single contract action handler (Approve & Send or Reopen)
  const handleAction = async (contract, actionType) => {
    const contractId = contract.id;
    setActionLoading(prev => ({ ...prev, [contractId]: actionType }));

    const companyName = (contract.company_name || contract.client_name || contract.client_company_name || '').trim();
    const clientEmail = (contract.client_email || '').trim();

    const payload = actionType === 'reopen'
      ? {
        contract_id: contractId,
        action: 'reopen'
      }
      : {
        action: 'approve',
        contract_ids: [contractId],
        company_name: companyName,
        client_email: clientEmail,
        contract_id: contractId,
        reviewer_email: 'admin@example.com'
      };

    console.log('Dispatching single webhook action payload:', payload);

    try {
      const response = await fetch('https://n8n.srv1711190.hstgr.cloud/webhook/contract-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Webhook error (${response.status}): ${response.statusText}`);
      }

      const clientDisplayName = companyName || '';
      const docLabel = contract.doc_type || 'Contract';
      const successMsg = actionType === 'reopen'
        ? `Contract ${clientDisplayName ? `for ${clientDisplayName} ` : ''}reopened for review!`
        : `${docLabel} ${clientDisplayName ? `for ${clientDisplayName} ` : ''}approved & sent for signature!`;

      onShowToast?.(successMsg, 'success');

      // Optimistic status update
      const targetStatus = actionType === 'reopen' ? 'in_review' : 'sent';
      setContracts(prev => prev.map(c => c.id === contractId ? { ...c, status: targetStatus } : c));

      // Reload live contracts from Supabase
      await loadContracts();
    } catch (error) {
      console.error('Error submitting contract action:', error);
      if (actionType === 'reopen') {
        setContracts(prev => prev.map(c => c.id === contractId ? { ...c, status: 'in_review' } : c));
        onShowToast?.(`Contract reopened for review. Status updated.`, 'success');
      } else {
        const docLabel = contract.doc_type || 'Contract';
        onShowToast?.(`Failed to process ${docLabel} for ${companyName || 'client'}: ${error.message || 'Check webhook status'}`, 'error');
      }
    } finally {
      setActionLoading(prev => {
        const next = { ...prev };
        delete next[contractId];
        return next;
      });
    }
  };

  // Batch action handler: Approve Both & Send (Single webhook call with both contract IDs)
  const handleApproveBothAndSend = async (group) => {
    const companyKey = group.companyName;
    const contractsToApprove = (group.contracts || []).filter(c => (c.status || '').toLowerCase() === 'in_review');
    if (!contractsToApprove.length) return;

    const contractIds = contractsToApprove.map(c => c.id).filter(Boolean);
    if (!contractIds.length) return;

    setBatchLoading(prev => ({ ...prev, [companyKey]: true }));

    const payload = {
      action: 'approve',
      contract_ids: contractIds,
      company_name: group.companyName,
      client_email: group.clientEmail || (group.contracts.find(c => c.client_email)?.client_email || ''),
      reviewer_email: 'admin@example.com'
    };

    console.log('Dispatching single batch Approve Both & Send webhook payload:', payload);

    try {
      const response = await fetch('https://n8n.srv1711190.hstgr.cloud/webhook/contract-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Webhook error (${response.status}): ${response.statusText}`);
      }

      onShowToast?.(`Both contracts for ${group.companyName} approved & sent for signature!`, 'success');

      // Optimistically update statuses of all approved contracts in this group to 'sent'
      setContracts(prev =>
        prev.map(c => (contractIds.includes(c.id) ? { ...c, status: 'sent' } : c))
      );

      // Reload live contracts from Supabase
      await loadContracts();
    } catch (error) {
      console.error('Error submitting batch approval for company:', error);
      onShowToast?.(`Failed to approve contracts for ${group.companyName}: ${error.message || 'Check webhook status'}`, 'error');
    } finally {
      setBatchLoading(prev => {
        const next = { ...prev };
        delete next[companyKey];
        return next;
      });
    }
  };

  const openRejectModal = (contract) => {
    setRejectionModal({
      isOpen: true,
      contract,
      reason: '',
      isSubmitting: false
    });
  };

  const closeRejectModal = () => {
    setRejectionModal({
      isOpen: false,
      contract: null,
      reason: '',
      isSubmitting: false
    });
  };

  const handleConfirmRejection = async (e) => {
    e.preventDefault();
    const contract = rejectionModal.contract;
    if (!contract || !rejectionModal.reason.trim()) return;

    const contractId = contract.id;
    const reasonText = rejectionModal.reason.trim();

    setRejectionModal(prev => ({ ...prev, isSubmitting: true }));
    setActionLoading(prev => ({ ...prev, [contractId]: 'reject' }));

    const payload = {
      contract_id: contractId,
      action: 'reject',
      reason: reasonText
    };

    console.log('Dispatching reject payload to webhook:', payload);

    try {
      const response = await fetch('https://n8n.srv1711190.hstgr.cloud/webhook/contract-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Webhook error (${response.status}): ${response.statusText}`);
      }

      onShowToast?.(`Contract successfully rejected with reason recorded.`, 'success');

      setContracts(prev => prev.map(c => c.id === contractId ? { ...c, status: 'terminated', rejection_reason: reasonText } : c));
      closeRejectModal();
      await loadContracts();
    } catch (error) {
      console.error('Error submitting rejection:', error);
      setContracts(prev => prev.map(c => c.id === contractId ? { ...c, status: 'terminated', rejection_reason: reasonText } : c));
      onShowToast?.(`Contract rejected. Status updated.`, 'success');
      closeRejectModal();
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
      title: title || 'Contract Document Preview'
    });
    setIsFullScreen(false);
  };

  // Status Counts for filter tabs
  const counts = {
    all: contracts.length,
    in_review: contracts.filter(c => (c.status || '').toLowerCase() === 'in_review').length,
    approvals: contracts.filter(c => {
      const s = (c.status || '').toLowerCase();
      return s === 'approvals' || s === 'approved' || s === 'sent' || s === 'sent_for_signature';
    }).length,
    executed: contracts.filter(c => {
      const s = (c.status || '').toLowerCase();
      return s === 'executed' || s === 'completed';
    }).length,
    terminated: contracts.filter(c => (c.status || '').toLowerCase() === 'terminated' || (c.status || '').toLowerCase() === 'rejected').length,
  };

  // Filter individual contracts
  const filteredContracts = useMemo(() => {
    return contracts.filter(contract => {
      const statusLower = (contract.status || '').toLowerCase().trim();
      // Tab filter
      if (activeFilter !== 'all') {
        if (activeFilter === 'approvals' || activeFilter === 'sent') {
          if (statusLower !== 'sent' && statusLower !== 'sent_for_signature' && statusLower !== 'approved' && statusLower !== 'approvals') {
            return false;
          }
        } else if (activeFilter === 'executed') {
          if (statusLower !== 'executed' && statusLower !== 'completed') {
            return false;
          }
        } else if (activeFilter === 'terminated') {
          if (statusLower !== 'terminated' && statusLower !== 'rejected') {
            return false;
          }
        } else if (statusLower !== activeFilter.toLowerCase()) {
          return false;
        }
      }

      // Search query filter
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
  }, [contracts, activeFilter, searchQuery]);

  // Group contracts by company into unified cards
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
      case 'in_review':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.15)]">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            In Review
          </span>
        );
      case 'approved':
      case 'approvals':
      case 'sent':
      case 'sent_for_signature':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.15)]">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
            Sent for Signature
          </span>
        );
      case 'executed':
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Executed
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
      case 'signature_due':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
            Signature Due
          </span>
        );
      case 'due_for_renewal':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
            Due for Renewal
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-500/10 text-zinc-400 border border-zinc-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400"></span>
            Expired
          </span>
        );
      case 'terminated':
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.15)]">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            Terminated
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-500/10 text-gray-400 border border-gray-500/30">
            {status || 'Draft'}
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
    } catch (e) {
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
        {/* Top Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-glow/10 border border-glow/30 text-glow">
                <GitPullRequest size={28} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
                  Approval Center
                </h1>
                <p className="text-sm text-gray-400 mt-0.5">
                  Review contracts grouped by company, execute approval decisions, and track status transitions.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Refresh Button */}
            <button
              onClick={loadContracts}
              disabled={isLoading}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 hover:border-glow/30 text-white transition-all disabled:opacity-50"
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
              <span><strong>Error loading contracts:</strong> {fetchError}</span>
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
              { key: 'all', label: 'All', count: counts.all },
              { key: 'in_review', label: 'In Review', count: counts.in_review },
              { key: 'approvals', label: 'Approvals', count: counts.approvals },
              { key: 'executed', label: 'Executed', count: counts.executed },
              { key: 'terminated', label: 'Terminated', count: counts.terminated }
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

          {/* Search Input */}
          <div className="relative min-w-[240px] md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by company or reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-glow focus:ring-1 focus:ring-glow transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Company Grouped Cards List */}
        {isLoading ? (
          <div className="glass-panel rounded-2xl py-24 flex flex-col items-center justify-center text-center">
            <Loader2 className="w-10 h-10 text-glow animate-spin mb-3" />
            <p className="text-gray-400 text-sm">Querying live contracts from Supabase...</p>
          </div>
        ) : companyGroups.length === 0 ? (
          <div className="glass-panel rounded-2xl py-20 flex flex-col items-center justify-center text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 mb-4">
              <Filter size={24} />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">No contracts found</h3>
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
              const allInReview = group.contracts.length > 0 && group.contracts.every(c => (c.status || '').toLowerCase() === 'in_review');
              const isThisBatchLoading = Boolean(batchLoading[group.companyName]);

              return (
                <motion.div
                  key={group.companyName + gIdx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: gIdx * 0.04 }}
                  className="glass-panel rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-300 shadow-xl overflow-hidden flex flex-col md:flex-row items-stretch"
                >
                  {/* Left Column: Company Info (Vertically Centered) */}
                  <div className="w-full md:w-72 lg:w-80 shrink-0 p-5 md:p-6 flex flex-col justify-center items-start bg-white/[0.02] border-b md:border-b-0 md:border-r border-white/10">
                    <div className="flex items-center gap-3.5 mb-2 w-full">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-glow/20 to-blue-600/20 border border-glow/30 flex items-center justify-center shrink-0 text-glow shadow-[0_0_15px_rgba(0,243,255,0.15)]">
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

                          {/* "Approve Both & Send" Action Button */}
                          {allInReview && (
                            <button
                              onClick={() => handleApproveBothAndSend(group)}
                              disabled={isThisBatchLoading || group.contracts.some(c => Boolean(actionLoading[c.id]))}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-emerald-500/25 via-teal-500/25 to-emerald-500/25 hover:from-emerald-500 hover:to-teal-500 text-emerald-300 hover:text-white border border-emerald-500/40 hover:border-emerald-400 transition-all duration-200 shadow-[0_0_12px_rgba(16,185,129,0.25)] hover:shadow-[0_0_18px_rgba(16,185,129,0.45)] disabled:opacity-50 cursor-pointer"
                              title="Approve both contracts and send via DocuSign"
                            >
                              {isThisBatchLoading ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Send size={12} className="translate-x-0.5 -translate-y-0.5" />
                              )}
                              <span>Approve Both & Send</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Signatory / Contact info if present */}
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
                      const driveUrl = contract.drive_file_url || contract.file_url || contract.sla_url || contract.nda_url || '';
                      const statusLower = (contract.status || '').toLowerCase();
                      const isInReview = statusLower === 'in_review';
                      const isTerminated = statusLower === 'terminated' || statusLower === 'rejected';
                      const rejectionReason = contract.rejection_reason || contract.reason || '';

                      const isApproving = actionLoading[contract.id] === 'approve';
                      const isRejecting = actionLoading[contract.id] === 'reject';
                      const isReopening = actionLoading[contract.id] === 'reopen';
                      const isAnyActionLoading = Boolean(actionLoading[contract.id]) || isThisBatchLoading;

                      return (
                        <div
                          key={contract.id || cIdx}
                          className="p-4 sm:px-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
                        >
                          {/* Sub-row Left: Doc Type Badge, Created Date, and Rejection Reason Callout */}
                          <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                            <div className="flex items-center gap-3 flex-wrap">
                              {getDocTypeBadge(docType)}

                              <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                                <Calendar size={13} className="text-gray-500 shrink-0" />
                                <span>{formatDate(contract.created_at)}</span>
                              </div>
                            </div>

                            {/* Rejection Reason Callout if Terminated */}
                            {isTerminated && rejectionReason && (
                              <div className="mt-1 flex items-start gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs leading-relaxed max-w-xl">
                                <AlertCircle size={14} className="text-rose-400 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-semibold text-rose-200 mr-1.5">Reason:</span>
                                  <span className="text-rose-300/90">{rejectionReason}</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Sub-row Right: Status Badge, View Doc Button & Actions */}
                          <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0 flex-wrap">
                            {/* Status Badge */}
                            <div>
                              {getStatusBadge(contract.status)}
                            </div>

                            {/* View Doc Button */}
                            <div>
                              {driveUrl ? (
                                <button
                                  onClick={() => openPreview(driveUrl, `${group.companyName} - ${docType}`)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-glow/10 text-gray-200 hover:text-glow border border-white/10 hover:border-glow/30 transition-all shadow-sm cursor-pointer"
                                >
                                  <Eye size={13} />
                                  <span>View Doc</span>
                                </button>
                              ) : (
                                <span className="text-xs text-gray-500 italic">No Doc URL</span>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="min-w-[150px] flex justify-end">
                              {isInReview ? (
                                <div className="flex items-center gap-2">
                                  {/* Approve & Send Button (Direct to Sent for Signature) */}
                                  <button
                                    onClick={() => handleAction(contract, 'approve')}
                                    disabled={isAnyActionLoading}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-white border border-emerald-500/40 hover:border-emerald-500 transition-all duration-200 shadow-[0_0_10px_rgba(16,185,129,0.2)] disabled:opacity-50 cursor-pointer"
                                    title="Approve and send contract for signature"
                                  >
                                    {isApproving ? (
                                      <Loader2 size={13} className="animate-spin" />
                                    ) : (
                                      <Send size={13} className="translate-x-0.5 -translate-y-0.5" />
                                    )}
                                    <span>Approve & Send</span>
                                  </button>

                                  {/* Reject Button (Opens Rejection Modal) */}
                                  <button
                                    onClick={() => openRejectModal(contract)}
                                    disabled={isAnyActionLoading}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/40 hover:border-rose-500 transition-all duration-200 shadow-[0_0_10px_rgba(244,63,94,0.2)] disabled:opacity-50 cursor-pointer"
                                    title="Reject contract with reason"
                                  >
                                    {isRejecting ? (
                                      <Loader2 size={13} className="animate-spin" />
                                    ) : (
                                      <X size={13} strokeWidth={2.5} />
                                    )}
                                    <span>Reject</span>
                                  </button>
                                </div>
                              ) : isTerminated ? (
                                /* Active Reuse Contract Button for Terminated Contracts */
                                <button
                                  onClick={() => handleAction(contract, 'reopen')}
                                  disabled={isAnyActionLoading}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/25 text-cyan-300 hover:text-white border border-cyan-500/30 hover:border-glow transition-all duration-200 shadow-[0_0_12px_rgba(0,243,255,0.15)] disabled:opacity-50 cursor-pointer"
                                  title="Reopen contract for review"
                                >
                                  {isReopening ? (
                                    <Loader2 size={13} className="animate-spin" />
                                  ) : (
                                    <RotateCcw size={13} strokeWidth={2.2} />
                                  )}
                                  <span>↻ Reuse Contract</span>
                                </button>
                              ) : (
                                <span className="text-xs text-gray-500 flex items-center gap-1 font-medium">
                                  <CheckCircle2 size={13} className="text-gray-600" />
                                  <span>No actions needed</span>
                                </span>
                              )}
                            </div>
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

      {/* Rejection Reason Modal */}
      {rejectionModal.isOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-panel border border-rose-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl bg-slate-900/95"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg leading-tight">Reject Contract</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Provide a brief reason for rejecting this document.
                  </p>
                </div>
              </div>
              <button
                onClick={closeRejectModal}
                disabled={rejectionModal.isSubmitting}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleConfirmRejection} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Rejection Reason <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="e.g., Payment schedule in Section 4 is inaccurate..."
                  value={rejectionModal.reason}
                  onChange={(e) => setRejectionModal(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full bg-black/50 border border-white/15 focus:border-rose-400 focus:ring-1 focus:ring-rose-400 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none transition-all resize-none"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={closeRejectModal}
                  disabled={rejectionModal.isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!rejectionModal.reason.trim() || rejectionModal.isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)] transition-all disabled:opacity-50 cursor-pointer"
                >
                  {rejectionModal.isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Rejecting...</span>
                    </>
                  ) : (
                    <span>Confirm Rejection</span>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className={`glass-panel border border-white/20 rounded-2xl flex flex-col overflow-hidden shadow-2xl transition-all duration-300 ${isFullScreen ? 'w-full h-full rounded-none' : 'w-full max-w-5xl h-[85vh]'
              }`}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-white/10 bg-slate-900/90 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <FileText className="text-glow shrink-0" size={20} />
                <h3 className="font-semibold text-white text-sm md:text-base truncate">
                  {previewModal.title}
                </h3>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* External link */}
                <a
                  href={previewModal.url.replace('/preview', '/view')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                  title="Open in new tab"
                >
                  <ExternalLink size={18} />
                </a>

                {/* Fullscreen toggle */}
                <button
                  onClick={() => setIsFullScreen(!isFullScreen)}
                  className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                  title={isFullScreen ? "Exit Fullscreen" : "Fullscreen"}
                >
                  {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>

                {/* Close modal */}
                <button
                  onClick={() => setPreviewModal({ isOpen: false, url: '', title: '' })}
                  className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Iframe Content */}
            <div className="flex-1 w-full h-full bg-slate-950 relative">
              <iframe
                src={previewModal.url}
                className="w-full h-full border-none"
                title={previewModal.title}
                allow="autoplay"
              />
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
}
