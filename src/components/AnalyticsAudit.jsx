import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  Activity, 
  Clock, 
  CheckCircle2, 
  ShieldCheck, 
  XCircle, 
  FileText, 
  RefreshCw, 
  Search, 
  Send,
  ArrowRight, 
  User, 
  Calendar, 
  Layers, 
  X, 
  AlertCircle,
  Building2,
  ChevronDown,
  ChevronUp,
  MessageSquare
} from 'lucide-react';
import { fetchContracts, fetchStatusHistory, isSupabaseConfigured } from '../lib/supabaseClient';

export default function AnalyticsAudit({ onShowToast }) {
  const [contracts, setContracts] = useState([]);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [searchAuditQuery, setSearchAuditQuery] = useState('');
  const [isConfigured, setIsConfigured] = useState(isSupabaseConfigured());
  const [expandedDocs, setExpandedDocs] = useState(new Set());

  const loadData = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const [contractsRes, historyRes] = await Promise.all([
        fetchContracts(),
        fetchStatusHistory()
      ]);

      setIsConfigured(contractsRes.isConfigured && historyRes.isConfigured);
      
      if (contractsRes.error) {
        setFetchError(contractsRes.error.message);
      }

      setContracts(contractsRes.data || []);
      setHistory(historyRes.data || []);
    } catch (err) {
      console.error('Error loading live analytics & audit data from Supabase:', err);
      setFetchError(err.message || 'Failed to connect to Supabase');
      onShowToast?.('Failed to fetch analytics data from Supabase', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Lookup map for fast contract metadata resolution (Client Name, Doc Type, Rejection Reason, etc.)
  const contractsMap = useMemo(() => {
    const map = {};
    contracts.forEach(c => {
      if (c.id) {
        map[c.id] = c;
      }
    });
    return map;
  }, [contracts]);

  // Compute Metrics from real Supabase rows
  const totalContracts = contracts.length;
  const inReviewCount = contracts.filter(c => (c.status || '').toLowerCase() === 'in_review').length;
  const sentCount = contracts.filter(c => {
    const s = (c.status || '').toLowerCase().trim();
    return s === 'sent' || s === 'sent_for_signature' || s === 'resent_for_signature' || s === 'resent';
  }).length;
  const executedCount = contracts.filter(c => (c.status || '').toLowerCase() === 'executed').length;
  const completedCount = contracts.filter(c => (c.status || '').toLowerCase() === 'completed').length;
  const changesRequestedCount = contracts.filter(c => (c.status || '').toLowerCase() === 'changes_requested').length;
  const terminatedCount = contracts.filter(c => (c.status || '').toLowerCase() === 'terminated' || (c.status || '').toLowerCase() === 'rejected').length;

  const getPercent = (count) => {
    if (totalContracts === 0) return 0;
    return Math.round((count / totalContracts) * 100);
  };

  // Toggle document expand/collapse state
  const toggleDocExpand = (docKey) => {
    setExpandedDocs(prev => {
      const next = new Set(prev);
      if (next.has(docKey)) {
        next.delete(docKey);
      } else {
        next.add(docKey);
      }
      return next;
    });
  };

  const getStatusTheme = (status) => {
    switch (status?.toLowerCase()) {
      case 'in_review':
        return {
          bg: 'bg-amber-500/10',
          text: 'text-amber-400',
          border: 'border-amber-500/30',
          dot: 'bg-amber-400',
          glow: 'shadow-[0_0_8px_rgba(251,191,36,0.5)]',
          label: 'In Review'
        };
      case 'approved':
      case 'approvals':
      case 'sent':
      case 'sent_for_signature':
        return {
          bg: 'bg-purple-500/10',
          text: 'text-purple-300',
          border: 'border-purple-500/30',
          dot: 'bg-purple-400',
          glow: 'shadow-[0_0_8px_rgba(168,85,247,0.5)]',
          label: 'Sent for Signature'
        };
      case 'executed':
        return {
          bg: 'bg-cyan-500/10',
          text: 'text-cyan-300',
          border: 'border-cyan-500/30',
          dot: 'bg-cyan-400',
          glow: 'shadow-[0_0_8px_rgba(6,182,212,0.5)]',
          label: 'Executed'
        };
      case 'completed':
        return {
          bg: 'bg-emerald-500/15',
          text: 'text-emerald-300',
          border: 'border-emerald-400/40',
          dot: 'bg-emerald-400',
          glow: 'shadow-[0_0_10px_rgba(52,211,153,0.6)]',
          label: 'Completed'
        };
      case 'changes_requested':
        return {
          bg: 'bg-orange-500/10',
          text: 'text-orange-300',
          border: 'border-orange-500/30',
          dot: 'bg-orange-400',
          glow: 'shadow-[0_0_8px_rgba(249,115,22,0.5)]',
          label: 'Changes Requested'
        };
      case 'resent_for_signature':
      case 'resent':
        return {
          bg: 'bg-indigo-500/15',
          text: 'text-indigo-200',
          border: 'border-indigo-400/30',
          dot: 'bg-indigo-300',
          glow: 'shadow-[0_0_8px_rgba(129,140,248,0.5)]',
          label: 'Sent for Resignature'
        };
      case 'signature_due':
        return {
          bg: 'bg-blue-500/10',
          text: 'text-blue-300',
          border: 'border-blue-500/30',
          dot: 'bg-blue-400',
          glow: 'shadow-[0_0_8px_rgba(59,130,246,0.5)]',
          label: 'Signature Due'
        };
      case 'due_for_renewal':
        return {
          bg: 'teal-500/10',
          text: 'text-teal-300',
          border: 'border-teal-500/30',
          dot: 'bg-teal-400',
          glow: 'shadow-[0_0_8px_rgba(20,184,166,0.5)]',
          label: 'Due for Renewal'
        };
      case 'expired':
        return {
          bg: 'bg-zinc-500/10',
          text: 'text-zinc-400',
          border: 'border-zinc-500/30',
          dot: 'bg-zinc-400',
          glow: 'shadow-[0_0_8px_rgba(161,161,170,0.5)]',
          label: 'Expired'
        };
      case 'terminated':
      case 'rejected':
        return {
          bg: 'bg-rose-500/10',
          text: 'text-rose-400',
          border: 'border-rose-500/30',
          dot: 'bg-rose-400',
          glow: 'shadow-[0_0_8px_rgba(251,113,133,0.5)]',
          label: 'Terminated'
        };
      default:
        return {
          bg: 'bg-gray-500/10',
          text: 'text-gray-300',
          border: 'border-gray-500/30',
          dot: 'bg-gray-400',
          glow: 'shadow-[0_0_8px_rgba(156,163,175,0.4)]',
          label: status ? (status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')) : 'Draft'
        };
    }
  };

  const renderStatusBadge = (status) => {
    const theme = getStatusTheme(status);
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${theme.bg} ${theme.text} border ${theme.border}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`}></span>
        {theme.label}
      </span>
    );
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

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  const formatDuration = (ms, isCurrent = false) => {
    if (ms == null || isNaN(ms) || ms < 0) ms = 0;

    const totalMinutes = Math.floor(ms / (1000 * 60));
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    const days = ms / (1000 * 60 * 60 * 24);

    let timeStr = '';

    if (totalMinutes < 1) {
      timeStr = '< 1 min';
    } else if (totalMinutes < 60) {
      timeStr = `${totalMinutes} min${totalMinutes === 1 ? '' : 's'}`;
    } else if (totalHours < 24) {
      if (remainingMinutes === 0) {
        timeStr = `${totalHours} hr${totalHours === 1 ? '' : 's'}`;
      } else {
        timeStr = `${totalHours} hr${totalHours === 1 ? '' : 's'} ${remainingMinutes} min${remainingMinutes === 1 ? '' : 's'}`;
      }
    } else {
      const formattedDays = days >= 10 ? Math.round(days) : parseFloat(days.toFixed(1));
      timeStr = `${formattedDays} day${formattedDays === 1 ? '' : 's'}`;
    }

    if (isCurrent) {
      if (totalHours >= 24) {
        return `Current: ${timeStr}`;
      }
      return `${timeStr} ongoing`;
    }

    return timeStr;
  };

  const getDurationOnlyString = (ms) => {
    if (ms == null || isNaN(ms) || ms < 0) ms = 0;

    const totalMinutes = Math.floor(ms / (1000 * 60));
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    const days = ms / (1000 * 60 * 60 * 24);

    if (totalMinutes < 1) {
      return '< 1 min';
    } else if (totalMinutes < 60) {
      return `${totalMinutes} min${totalMinutes === 1 ? '' : 's'}`;
    } else if (totalHours < 24) {
      if (remainingMinutes === 0) {
        return `${totalHours} hr${totalHours === 1 ? '' : 's'}`;
      }
      return `${totalHours} hr${totalHours === 1 ? '' : 's'} ${remainingMinutes} min${remainingMinutes === 1 ? '' : 's'}`;
    } else {
      const formattedDays = days >= 10 ? Math.round(days) : parseFloat(days.toFixed(1));
      return `${formattedDays} day${formattedDays === 1 ? '' : 's'}`;
    }
  };

  const isWaitingQueueState = (status) => {
    const s = (status || '').toLowerCase().trim();
    return s === 'in_review' || s === 'sent' || s === 'sent_for_signature' || s === 'resent_for_signature' || s === 'resent' || s === 'executed' || s === 'draft' || s === 'signature_due';
  };

  // Two-Tier Grouping: Company -> Document -> Chronological Events
  const groupedCompanyData = useMemo(() => {
    const companyMap = {};

    // 1. Ensure all contracts from contracts table are represented
    contracts.forEach(c => {
      const companyName = (c.company_name || c.client_name || c.client_company_name || 'Client Contract').trim();
      const docType = (c.doc_type || 'NDA').trim();
      const contractId = c.id || `${companyName}_${docType}`;
      const docKey = contractId;

      if (!companyMap[companyName]) {
        companyMap[companyName] = {
          companyName,
          documents: {}
        };
      }

      if (!companyMap[companyName].documents[docKey]) {
        companyMap[companyName].documents[docKey] = {
          docKey,
          contractId,
          docType,
          companyName,
          events: []
        };
      }
    });

    // 2. Add and process history records
    history.forEach(item => {
      const matched = contractsMap[item.contract_id] || {};
      const companyName = (matched.company_name || matched.client_name || matched.client_company_name || item.client_name || item.company_name || 'Client Contract').trim();
      const docType = (matched.doc_type || item.doc_type || 'NDA').trim();
      const contractId = item.contract_id || `${companyName}_${docType}`;
      const docKey = contractId;
      
      const noteText = item.notes || item.note || item.rejection_reason || item.reason || item.comments || 
        ((item.to_status || '').toLowerCase() === 'terminated' ? (matched.rejection_reason || matched.reason) : null) || '';

      const changedAtDate = item.changed_at || item.created_at || new Date().toISOString();
      const timestamp = new Date(changedAtDate).getTime();

      const eventObj = {
        ...item,
        companyName,
        docType,
        contractId,
        note: noteText ? String(noteText).trim() : '',
        rawDate: changedAtDate,
        timestamp: isNaN(timestamp) ? 0 : timestamp
      };

      if (!companyMap[companyName]) {
        companyMap[companyName] = {
          companyName,
          documents: {}
        };
      }

      if (!companyMap[companyName].documents[docKey]) {
        companyMap[companyName].documents[docKey] = {
          docKey,
          contractId,
          docType,
          companyName,
          events: []
        };
      }

      companyMap[companyName].documents[docKey].events.push(eventObj);
    });

    const normalizeAuditStatus = (status) => {
      if (!status) return status;
      const s = status.toLowerCase().trim();
      if (s === 'approvals' || s === 'approved') return 'sent';
      if (s === 'sent_for_signature') return 'sent';
      if (s === 'resent') return 'resent_for_signature';
      return s;
    };

    const result = Object.values(companyMap).map(comp => {
      const docs = Object.values(comp.documents).map(doc => {
        // Sort events chronologically (oldest to newest for the vertical timeline)
        const sortedEvents = [...doc.events].sort((a, b) => a.timestamp - b.timestamp);
        const contractMeta = contractsMap[doc.contractId] || {};

        const cleanedEvents = [];
        const first = sortedEvents[0];
        const isFirstAlreadyCreation = first && (!first.from_status || normalizeAuditStatus(first.from_status) === 'draft') && normalizeAuditStatus(first.to_status) === 'in_review';

        // Prepend Document Generation event if history does not start with standalone in_review creation
        if (!isFirstAlreadyCreation) {
          const creationDate = contractMeta.created_at || (first ? new Date(first.timestamp - 60000).toISOString() : new Date().toISOString());
          cleanedEvents.push({
            contract_id: doc.contractId,
            companyName: doc.companyName,
            docType: doc.docType,
            from_status: null,
            to_status: 'in_review',
            changed_by: contractMeta.client_email || first?.changed_by || 'system',
            rawDate: creationDate,
            timestamp: new Date(creationDate).getTime(),
            note: 'Document generated and submitted for review'
          });
        }

        for (let i = 0; i < sortedEvents.length; i++) {
          const current = sortedEvents[i];
          const fromNorm = normalizeAuditStatus(current.from_status);
          const toNorm = normalizeAuditStatus(current.to_status);

          // If this is an initial draft -> in_review record, treat as initial generation event
          if (cleanedEvents.length === 0 && (!fromNorm || fromNorm === 'draft') && toNorm === 'in_review') {
            cleanedEvents.push({
              ...current,
              from_status: null,
              to_status: 'in_review',
              note: current.note || 'Document generated and submitted for review'
            });
            continue;
          }

          // Collapse intermediate "Sent for Resignature" dispatch events after changes_requested when executed follows
          const isIntermediateResignDispatch = 
            (fromNorm === 'changes_requested' || (cleanedEvents.length > 0 && cleanedEvents[cleanedEvents.length - 1].to_status === 'changes_requested')) &&
            (toNorm === 'resent_for_signature' || toNorm === 'sent');
          
          const hasSubsequentExecuted = sortedEvents.slice(i + 1).some(e => normalizeAuditStatus(e.to_status) === 'executed');

          if (isIntermediateResignDispatch && hasSubsequentExecuted) {
            continue; // Skip intermediate dispatch step so Changes Requested transitions directly to Executed
          }

          let effectiveFrom = fromNorm || (cleanedEvents.length > 0 ? cleanedEvents[cleanedEvents.length - 1].to_status : 'in_review');
          if (cleanedEvents.length > 0) {
            const prev = cleanedEvents[cleanedEvents.length - 1];

            // If already in target status, skip duplicate event (e.g. duplicate completed events)
            if (prev.to_status === toNorm) {
              continue;
            }

            // If previous state was changes_requested and current target is executed, transition directly from changes_requested
            if (prev.to_status === 'changes_requested' && toNorm === 'executed') {
              effectiveFrom = 'changes_requested';
            } else if (fromNorm && fromNorm !== prev.to_status) {
              effectiveFrom = prev.to_status;
            }
          }

          // Skip any self-transition (e.g. completed -> completed, sent -> sent)
          if (effectiveFrom === toNorm) {
            continue;
          }

          cleanedEvents.push({
            ...current,
            from_status: effectiveFrom,
            to_status: toNorm
          });
        }

        const finalEvents = cleanedEvents.length > 0 ? cleanedEvents : sortedEvents;
        const latestEvent = finalEvents[finalEvents.length - 1] || {};

        return {
          ...doc,
          events: finalEvents,
          latestEvent,
          totalEvents: finalEvents.length,
          mostRecentActor: latestEvent.changed_by || 'system',
          mostRecentTimestamp: latestEvent.rawDate
        };
      });

      // Sort documents by most recent event timestamp descending
      docs.sort((a, b) => (b.latestEvent?.timestamp || 0) - (a.latestEvent?.timestamp || 0));

      const totalEvents = docs.reduce((sum, d) => sum + d.totalEvents, 0);

      return {
        companyName: comp.companyName,
        documents: docs,
        totalEvents
      };
    });

    // Filter by search query across company name, doc type, actor, status, and notes
    if (!searchAuditQuery.trim()) {
      return result;
    }

    const q = searchAuditQuery.toLowerCase().trim();
    return result
      .map(comp => {
        const matchesComp = comp.companyName.toLowerCase().includes(q);
        const filteredDocs = comp.documents.filter(doc => {
          const matchesDoc = 
            doc.docType.toLowerCase().includes(q) ||
            doc.mostRecentActor.toLowerCase().includes(q) ||
            (doc.latestEvent?.note || '').toLowerCase().includes(q) ||
            doc.events.some(e => 
              (e.from_status || '').toLowerCase().includes(q) ||
              (e.to_status || '').toLowerCase().includes(q) ||
              (e.note || '').toLowerCase().includes(q) ||
              (e.changed_by || '').toLowerCase().includes(q)
            );
          return matchesComp || matchesDoc;
        });

        if (filteredDocs.length === 0) return null;

        return {
          ...comp,
          documents: filteredDocs,
          totalEvents: filteredDocs.reduce((sum, d) => sum + d.totalEvents, 0)
        };
      })
      .filter(Boolean);
  }, [contracts, history, contractsMap, searchAuditQuery]);

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-10 relative overflow-y-auto w-full">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto mt-14 md:mt-2"
      >
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-glow/10 border border-glow/30 text-glow">
              <BarChart3 size={28} />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
                Analytics & Audit
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">
                Real-time lifecycle metrics and company-grouped status audit trail.
              </p>
            </div>
          </div>

          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 hover:border-glow/30 text-white transition-all disabled:opacity-50 self-start md:self-auto"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin text-glow" : ""} />
            <span>Sync Live Data</span>
          </button>
        </div>

        {/* Error / Not Configured Banner */}
        {fetchError && (
          <div className="glass-panel p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 mb-6 flex items-center justify-between gap-3 text-xs text-rose-300">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-rose-400 shrink-0" />
              <span><strong>Supabase Connection:</strong> {fetchError}</span>
            </div>
          </div>
        )}

        {/* Section A: Analytics KPI Cards */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
              <Activity size={16} className="text-glow" />
              <span>Live Contract Lifecycle Metrics</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* Total Contracts */}
            <div className="glass-panel p-5 rounded-2xl border border-white/10 relative overflow-hidden group hover:border-glow/40 transition-all duration-300">
              <div className="flex items-center justify-between text-gray-400 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Contracts</span>
                <div className="p-2 rounded-xl bg-glow/10 text-glow border border-glow/20">
                  <FileText size={18} />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-white tracking-tight">
                {isLoading ? <span className="opacity-50 text-2xl">...</span> : totalContracts}
              </div>
              <div className="mt-2 text-xs text-gray-400 flex items-center justify-between">
                <span>Database Total</span>
                <span className="text-glow font-medium">{totalContracts === 0 ? '0%' : '100%'}</span>
              </div>
              <div className="w-full bg-white/10 h-1 rounded-full mt-2 overflow-hidden">
                <div 
                  className="bg-glow h-full rounded-full transition-all duration-500" 
                  style={{ width: `${totalContracts === 0 ? 0 : 100}%` }}
                />
              </div>
            </div>

            {/* In Review */}
            <div className="glass-panel p-5 rounded-2xl border border-white/10 relative overflow-hidden group hover:border-amber-500/40 transition-all duration-300">
              <div className="flex items-center justify-between text-gray-400 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider">In Review</span>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Clock size={18} />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-amber-400 tracking-tight">
                {isLoading ? <span className="opacity-50 text-2xl">...</span> : inReviewCount}
              </div>
              <div className="mt-2 text-xs text-gray-400 flex items-center justify-between">
                <span>Action Needed</span>
                <span className="text-amber-400 font-medium">{getPercent(inReviewCount)}%</span>
              </div>
              <div className="w-full bg-white/10 h-1 rounded-full mt-2 overflow-hidden">
                <div 
                  className="bg-amber-400 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${getPercent(inReviewCount)}%` }}
                />
              </div>
            </div>

            {/* Sent for Signature */}
            <div className="glass-panel p-5 rounded-2xl border border-white/10 relative overflow-hidden group hover:border-purple-500/40 transition-all duration-300">
              <div className="flex items-center justify-between text-gray-400 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider">Sent for Signature</span>
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Send size={18} />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-purple-400 tracking-tight">
                {isLoading ? <span className="opacity-50 text-2xl">...</span> : sentCount}
              </div>
              <div className="mt-2 text-xs text-gray-400 flex items-center justify-between">
                <span>Awaiting Signature</span>
                <span className="text-purple-400 font-medium">{getPercent(sentCount)}%</span>
              </div>
              <div className="w-full bg-white/10 h-1 rounded-full mt-2 overflow-hidden">
                <div 
                  className="bg-purple-400 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${getPercent(sentCount)}%` }}
                />
              </div>
            </div>

            {/* Executed */}
            <div className="glass-panel p-5 rounded-2xl border border-white/10 relative overflow-hidden group hover:border-cyan-500/40 transition-all duration-300">
              <div className="flex items-center justify-between text-gray-400 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider">Executed</span>
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <CheckCircle2 size={18} />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-cyan-400 tracking-tight">
                {isLoading ? <span className="opacity-50 text-2xl">...</span> : executedCount}
              </div>
              <div className="mt-2 text-xs text-gray-400 flex items-center justify-between">
                <span>Signed & Ready for Review</span>
                <span className="text-cyan-400 font-medium">{getPercent(executedCount)}%</span>
              </div>
              <div className="w-full bg-white/10 h-1 rounded-full mt-2 overflow-hidden">
                <div 
                  className="bg-cyan-400 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${getPercent(executedCount)}%` }}
                />
              </div>
            </div>

            {/* Completed */}
            <div className="glass-panel p-5 rounded-2xl border border-white/10 relative overflow-hidden group hover:border-emerald-500/40 transition-all duration-300">
              <div className="flex items-center justify-between text-gray-400 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider">Completed</span>
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-[0_0_12px_rgba(52,211,153,0.2)]">
                  <ShieldCheck size={18} />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-emerald-300 tracking-tight">
                {isLoading ? <span className="opacity-50 text-2xl">...</span> : completedCount}
              </div>
              <div className="mt-2 text-xs text-gray-400 flex items-center justify-between">
                <span>Finalized</span>
                <span className="text-emerald-300 font-medium">{getPercent(completedCount)}%</span>
              </div>
              <div className="w-full bg-white/10 h-1 rounded-full mt-2 overflow-hidden">
                <div 
                  className="bg-emerald-400 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${getPercent(completedCount)}%` }}
                />
              </div>
            </div>

            {/* Terminated */}
            <div className="glass-panel p-5 rounded-2xl border border-white/10 relative overflow-hidden group hover:border-rose-500/40 transition-all duration-300">
              <div className="flex items-center justify-between text-gray-400 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider">Terminated</span>
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <XCircle size={18} />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-rose-400 tracking-tight">
                {isLoading ? <span className="opacity-50 text-2xl">...</span> : terminatedCount}
              </div>
              <div className="mt-2 text-xs text-gray-400 flex items-center justify-between">
                <span>Rejected / Terminated</span>
                <span className="text-rose-400 font-medium">{getPercent(terminatedCount)}%</span>
              </div>
              <div className="w-full bg-white/10 h-1 rounded-full mt-2 overflow-hidden">
                <div 
                  className="bg-rose-400 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${getPercent(terminatedCount)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section B: Document Status History (Audit Trail) */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                <Layers size={16} className="text-glow" />
                <span>Document Status History (Audit Trail)</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Two-tier lifecycle audit trail grouped by Company and Document.
              </p>
            </div>

            {/* Search Audit Logs */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <input
                type="text"
                placeholder="Search by company, doc, actor, status..."
                value={searchAuditQuery}
                onChange={(e) => setSearchAuditQuery(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-white focus:outline-none focus:border-glow transition-all"
              />
              {searchAuditQuery && (
                <button
                  onClick={() => setSearchAuditQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Grouped Audit Cards Container List */}
          {isLoading ? (
            <div className="glass-panel rounded-2xl py-24 flex flex-col items-center justify-center text-center">
              <RefreshCw className="w-8 h-8 text-glow animate-spin mb-2" />
              <p className="text-gray-400 text-xs">Querying audit history from Supabase...</p>
            </div>
          ) : groupedCompanyData.length === 0 ? (
            <div className="glass-panel rounded-2xl py-16 text-center text-gray-400 text-sm px-4">
              {searchAuditQuery ? 'No matching audit history found.' : 'No status history events found.'}
            </div>
          ) : (
            <div className="space-y-5">
              {groupedCompanyData.map((compGroup, cIdx) => {
                return (
                  <motion.div
                    key={compGroup.companyName + cIdx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: cIdx * 0.04 }}
                    className="glass-panel rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-300 shadow-xl overflow-hidden"
                  >
                    {/* Tier 1 Header: Company / Client Title Bar */}
                    <div className="px-5 py-4 bg-white/[0.03] border-b border-white/10 flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-glow/20 to-blue-600/20 border border-glow/30 flex items-center justify-center shrink-0 text-glow shadow-[0_0_12px_rgba(0,243,255,0.15)]">
                          <Building2 size={18} />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-white tracking-tight">
                            {compGroup.companyName}
                          </h3>
                          <span className="text-[11px] text-gray-400 font-medium">
                            {compGroup.documents.length} {compGroup.documents.length === 1 ? 'Document' : 'Documents'} • {compGroup.totalEvents} Total {compGroup.totalEvents === 1 ? 'Event' : 'Events'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Tier 2: Document Summary Rows & Nested Accordion Timeline */}
                    <div className="divide-y divide-white/5">
                      {compGroup.documents.map((doc, dIdx) => {
                        const isExpanded = expandedDocs.has(doc.docKey);
                        const latestEvt = doc.latestEvent || {};

                        return (
                          <div key={doc.docKey + dIdx} className="transition-colors">
                            {/* Summary Row (Document Level) - Clickable to toggle */}
                            <button
                              type="button"
                              onClick={() => toggleDocExpand(doc.docKey)}
                              className={`w-full text-left p-4 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-200 cursor-pointer ${
                                isExpanded ? 'bg-white/[0.04] border-l-2 border-l-glow' : 'hover:bg-white/[0.02]'
                              }`}
                            >
                              {/* Left: Badge with Document Type */}
                              <div className="flex items-center gap-3 shrink-0">
                                {getDocTypeBadge(doc.docType)}
                              </div>

                              {/* Center: Latest/Current Status Transition Badge + Lifecycle Events Indicator */}
                              <div className="flex items-center gap-3.5 flex-wrap flex-1 md:justify-center">
                                {doc.events.length === 1 || !latestEvt.from_status ? (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {renderStatusBadge(latestEvt.to_status || 'in_review')}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {renderStatusBadge(latestEvt.from_status)}
                                    <ArrowRight size={13} className="text-gray-500 shrink-0" />
                                    {renderStatusBadge(latestEvt.to_status)}
                                  </div>
                                )}

                                {/* Indicator: e.g. "4 lifecycle events ▾" */}
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/5 border border-white/10 text-glow hover:bg-white/10 transition-all">
                                  <span>{doc.totalEvents} {doc.totalEvents === 1 ? 'lifecycle event' : 'lifecycle events'}</span>
                                  <ChevronDown
                                    size={13}
                                    className={`text-glow transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                                  />
                                </div>
                              </div>

                              {/* Right: Most Recent Timestamp */}
                              <div className="flex items-center justify-between md:justify-end gap-5 shrink-0 flex-wrap">
                                {/* Timestamp */}
                                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                  <Calendar size={13} className="text-gray-500 shrink-0" />
                                  <span>{formatDateTime(doc.mostRecentTimestamp)}</span>
                                </div>
                              </div>
                            </button>

                            {/* Nested Event History (Accordion / Vertical Timeline) */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                                >
                                  <div className="p-4 sm:p-6 sm:pl-10 relative">
                                    <div className="space-y-6 relative">
                                      {doc.events.map((event, eIdx) => {
                                        const isLast = eIdx === doc.events.length - 1;
                                        const fromTheme = event.from_status ? getStatusTheme(event.from_status) : null;
                                        const toTheme = getStatusTheme(event.to_status);
                                        const prevEvent = eIdx > 0 ? doc.events[eIdx - 1] : null;
                                        
                                        // Elapsed duration for the state that preceded this event
                                        const elapsedMs = eIdx > 0
                                          ? Math.max(0, (event.timestamp || 0) - (prevEvent?.timestamp || event.timestamp || 0))
                                          : 0;
                                        
                                        const durationOnly = getDurationOnlyString(elapsedMs);

                                        // Accurate duration sentence: explains time spent in previous state
                                        let eventDescription = null;
                                        if (eIdx > 0 && fromTheme && toTheme) {
                                          eventDescription = (
                                            <span>
                                              Remained in <span className={`${fromTheme.text} font-medium`}>{fromTheme.label}</span> for <span className="text-glow/90 font-medium">{durationOnly}</span> before moving to <span className={`${toTheme.text} font-medium`}>{toTheme.label}</span>
                                            </span>
                                          );
                                        }

                                        return (
                                          <div key={event.id || eIdx} className="relative flex items-start gap-4 z-10">
                                            {/* Connector Line between timeline dots */}
                                            {!isLast && (
                                              <div 
                                                className="absolute left-[11px] top-6 bottom-[-24px] w-[2px] bg-gradient-to-b from-glow/30 via-white/15 to-white/5" 
                                              />
                                            )}

                                            {/* Timeline Node Dot */}
                                            <div className="relative z-10 flex items-center justify-center shrink-0 mt-0.5">
                                              <div className={`w-6 h-6 rounded-full ${toTheme.bg} border ${toTheme.border} flex items-center justify-center`}>
                                                <div className={`w-2 h-2 rounded-full ${toTheme.dot} ${toTheme.glow}`} />
                                              </div>
                                            </div>

                                            {/* Event Details Box */}
                                            <div className="flex-1 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-white/10 rounded-xl p-3.5 sm:p-4 transition-all">
                                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                                {/* Transition Path & Description */}
                                                <div className="flex flex-col gap-1.5 min-w-0">
                                                  <div className="flex items-center gap-2.5 flex-wrap">
                                                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                                                      Event #{eIdx + 1}:
                                                    </span>

                                                    {/* Transition Badges: Event #1 is Document Generation (shows only In Review); Event #2+ shows From -> To */}
                                                    {eIdx === 0 || !event.from_status ? (
                                                      <div className="flex items-center gap-2">
                                                        {renderStatusBadge(event.to_status || 'in_review')}
                                                      </div>
                                                    ) : (
                                                      <div className="flex items-center gap-2 flex-wrap">
                                                        {renderStatusBadge(event.from_status)}
                                                        <ArrowRight size={13} className="text-gray-500 shrink-0" />
                                                        {renderStatusBadge(event.to_status)}
                                                      </div>
                                                    )}
                                                  </div>

                                                  {/* Clear, Accurate Duration Explanation Text (only on transitions) */}
                                                  {eventDescription && (
                                                    <div className="text-[11px] text-gray-400 font-normal leading-relaxed pl-0.5">
                                                      {eventDescription}
                                                    </div>
                                                  )}
                                                </div>

                                                {/* Timestamp */}
                                                <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                                                  <div className="flex items-center gap-1.5">
                                                    <Calendar size={13} className="text-gray-500 shrink-0" />
                                                    <span>{formatDateTime(event.rawDate || event.changed_at)}</span>
                                                  </div>
                                                </div>
                                              </div>

                                              {/* Rejection Reason or Note box */}
                                              {event.note && (
                                                <div className="mt-3 p-2.5 rounded-lg bg-white/[0.03] border border-white/10 text-xs text-gray-300 flex items-start gap-2">
                                                  <MessageSquare size={14} className="text-glow shrink-0 mt-0.5" />
                                                  <div className="flex-1 min-w-0">
                                                    <span className="font-semibold text-glow/90 mr-1.5">Note:</span>
                                                    <span className="text-gray-300 italic">{event.note}</span>
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

