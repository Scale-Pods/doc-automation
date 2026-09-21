import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  MessageSquare,
  RotateCcw,
  Sparkles,
  Filter,
  Check,
  TrendingUp,
  CalendarDays,
  Zap,
  FileCheck,
  Database,
  ArrowUpRight,
  BarChart2,
  Info,
  Eye,
  ExternalLink,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { fetchContracts, fetchStatusHistory, isSupabaseConfigured } from '../lib/supabaseClient';

// --- Pure Helper Functions (Top-Level Scope) ---

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

const getActionNeeded = (status) => {
  const s = (status || '').toLowerCase().trim();
  switch (s) {
    case 'in_review':
      return {
        title: 'Internal Review & Approval Required',
        description: 'Document has been generated and is awaiting internal team approval in Pipeline Approvals.',
        tag: 'Needs Approval',
        color: 'text-amber-400 border-amber-500/30 bg-amber-500/10'
      };
    case 'sent':
    case 'sent_for_signature':
      return {
        title: 'Awaiting Client Signature',
        description: 'Sent out for signature. Waiting for client signatories to sign via provider.',
        tag: 'Out for Signature',
        color: 'text-purple-400 border-purple-500/30 bg-purple-500/10'
      };
    case 'executed':
      return {
        title: 'Review Signed Document & Finalize',
        description: 'Signed document received! Ready for receiver verification and completion.',
        tag: 'Verify & Complete',
        color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10'
      };
    case 'changes_requested':
    case 'resent_for_signature':
    case 'resent':
      return {
        title: 'Changes Requested / Resignature Pending',
        description: 'Modifications were flagged and the document is awaiting client re-signing.',
        tag: 'Pending Resignature',
        color: 'text-orange-400 border-orange-500/30 bg-orange-500/10'
      };
    case 'completed':
      return {
        title: 'Contract Completed',
        description: 'No pending action required. All signatures and verifications completed.',
        tag: 'Finalized',
        color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
      };
    case 'terminated':
    case 'rejected':
      return {
        title: 'Terminated / Rejected',
        description: 'Contract has been terminated.',
        tag: 'Closed',
        color: 'text-rose-400 border-rose-500/30 bg-rose-500/10'
      };
    default:
      return {
        title: 'In Progress',
        description: 'Processing contract lifecycle.',
        tag: 'In Progress',
        color: 'text-gray-300 border-white/20 bg-white/5'
      };
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

export default function AnalyticsAudit({ onShowToast }) {
  const [contracts, setContracts] = useState([]);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [searchAuditQuery, setSearchAuditQuery] = useState('');
  const [isConfigured, setIsConfigured] = useState(isSupabaseConfigured());
  const [expandedDocs, setExpandedDocs] = useState(new Set());
  const [selectedMonthKey, setSelectedMonthKey] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedStatusFilter, setSelectedStatusFilter] = useState(null); // null | 'in_review' | 'sent' | 'executed' | 'changes_requested' | 'completed' | 'terminated'
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [chartViewMode, setChartViewMode] = useState('curve'); // 'curve' | 'bars'
  const [showActivePipelineModal, setShowActivePipelineModal] = useState(false);
  const [pipelineModalFilter, setPipelineModalFilter] = useState('all'); // 'all' | 'in_review' | 'sent' | 'changes_requested'
  const [showSentMonthModal, setShowSentMonthModal] = useState(false);
  const [sentModalFilter, setSentModalFilter] = useState('all'); // 'all' | 'sent' | 'executed' | 'completed'
  const [showFinalizedModal, setShowFinalizedModal] = useState(false);
  const [finalizedModalFilter, setFinalizedModalFilter] = useState('all'); // 'all' | 'executed' | 'completed'

  // Large Document Preview Modal State
  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    url: '',
    title: '',
    isSigned: false,
    docType: '',
    companyName: '',
    status: ''
  });
  const [isPreviewFullScreen, setIsPreviewFullScreen] = useState(false);

  // Helper to format Google Docs/Drive URL for clean embedded preview
  const getCleanPreviewUrl = (url) => {
    if (!url) return '';
    let clean = url.trim();
    if (clean.startsWith('[')) clean = clean.substring(1);
    if (clean.endsWith(']')) clean = clean.substring(0, clean.length - 1);
    if (clean.includes('drive.google.com/file/d/')) {
      return clean.replace('/view', '/preview');
    }
    if (clean.includes('docs.google.com/document/d/')) {
      if (clean.includes('/edit')) return clean.replace('/edit', '/preview');
      if (!clean.includes('/preview')) return `${clean}/preview`;
    }
    return clean;
  };

  // Open Document Preview - Prioritizes signed document if executed/completed or signed copy available
  const handleOpenDocPreview = (doc) => {
    if (!doc) return;

    // Merge with full contract from lookup map if available
    const full = (doc.id && contractsMap[doc.id]) ? { ...contractsMap[doc.id], ...doc } : doc;
    const status = (full.normalizedStatus || full.status || '').toLowerCase().trim();
    
    // 1. Check all possible signed document URL columns
    const signedUrl = (
      full.signed_doc_url ||
      full.signed_file_url ||
      full.signed_url ||
      full.signed_document_url ||
      ''
    ).trim();

    // 2. Check all possible draft / generated document URL columns
    const generatedUrl = (
      full.drive_file_url ||
      full.file_url ||
      full.drive_url ||
      full.sla_url ||
      full.nda_url ||
      full.document_url ||
      full.url ||
      full.preview_url ||
      ''
    ).trim();

    const isSignedState = status === 'executed' || status === 'completed' || Boolean(signedUrl);

    // Determine target URL based on lifecycle state
    let targetUrl = '';
    let isSignedActive = false;

    if (isSignedState && signedUrl) {
      targetUrl = signedUrl;
      isSignedActive = true;
    } else if (generatedUrl) {
      targetUrl = generatedUrl;
      isSignedActive = Boolean(isSignedState && signedUrl);
    } else if (signedUrl) {
      targetUrl = signedUrl;
      isSignedActive = true;
    } else {
      // Safe fallback default template if contract record has no direct Drive URL
      const docTypeLower = (full.docType || full.doc_type || '').toLowerCase();
      targetUrl = docTypeLower.includes('nda')
        ? 'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/preview'
        : 'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/preview';
      isSignedActive = isSignedState;
    }

    const cleanUrl = getCleanPreviewUrl(targetUrl);
    const company = (full.companyName || full.company_name || full.client_name || full.client_company_name || 'Client Document').trim();
    const docType = (full.docType || full.doc_type || 'Contract').trim();
    const title = `${company} - ${docType} ${isSignedActive ? '(Signed Document)' : '(Generated Document)'}`;

    setPreviewModal({
      isOpen: true,
      url: cleanUrl,
      title,
      isSigned: isSignedActive,
      docType,
      companyName: company,
      status
    });
    setIsPreviewFullScreen(false);
  };

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

  // Generate the last 6 calendar months metadata and stats for the graphical wave chart
  const monthlyTimelineData = useMemo(() => {
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const shortLabel = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(d);
      const fullLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(d);
      
      const monthContracts = contracts.filter(c => {
        const dateStr = c.created_at || c.updated_at;
        if (!dateStr) return false;
        const cd = new Date(dateStr);
        if (isNaN(cd.getTime())) return false;
        return cd.getFullYear() === d.getFullYear() && cd.getMonth() === d.getMonth();
      });

      const count = monthContracts.length;
      const sent = monthContracts.filter(c => {
        const s = (c.status || '').toLowerCase().trim();
        return s === 'sent' || s === 'sent_for_signature' || s === 'resent_for_signature' || s === 'resent' || s === 'executed' || s === 'completed' || s === 'changes_requested';
      }).length;
      
      const completed = monthContracts.filter(c => (c.status || '').toLowerCase() === 'completed').length;
      const inReview = monthContracts.filter(c => (c.status || '').toLowerCase() === 'in_review').length;

      months.push({
        monthKey,
        shortLabel,
        fullLabel,
        year: d.getFullYear(),
        monthIndex: d.getMonth(),
        count,
        sent,
        completed,
        inReview,
        isCurrent: i === 0
      });
    }
    return months;
  }, [contracts]);

  // Filter contracts by selected month or all time
  const timeframeContracts = useMemo(() => {
    if (selectedMonthKey === 'all') return contracts;
    return contracts.filter(c => {
      const dateStr = c.created_at || c.updated_at;
      if (!dateStr) return true;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return true;
      const docKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return docKey === selectedMonthKey;
    });
  }, [contracts, selectedMonthKey]);

  // Compute Metrics for current timeframe
  const tfTotal = timeframeContracts.length;
  const tfInReview = timeframeContracts.filter(c => (c.status || '').toLowerCase() === 'in_review').length;
  const tfSent = timeframeContracts.filter(c => {
    const s = (c.status || '').toLowerCase().trim();
    return s === 'sent' || s === 'sent_for_signature' || s === 'resent_for_signature' || s === 'resent';
  }).length;
  const tfExecuted = timeframeContracts.filter(c => (c.status || '').toLowerCase() === 'executed').length;
  const tfChangesRequested = timeframeContracts.filter(c => (c.status || '').toLowerCase() === 'changes_requested').length;
  const tfCompleted = timeframeContracts.filter(c => (c.status || '').toLowerCase() === 'completed').length;
  const tfTerminated = timeframeContracts.filter(c => {
    const s = (c.status || '').toLowerCase().trim();
    return s === 'terminated' || s === 'rejected';
  }).length;

  const getTfPercent = (count) => {
    if (tfTotal === 0) return 0;
    return Math.round((count / tfTotal) * 100);
  };

  // Count of contracts that reached dispatched/sent stage or beyond in the selected timeframe
  const tfDispatchedCount = useMemo(() => {
    return timeframeContracts.filter(c => {
      const s = (c.status || '').toLowerCase().trim();
      return s === 'sent' || s === 'sent_for_signature' || s === 'resent_for_signature' || s === 'resent' || s === 'executed' || s === 'completed' || s === 'changes_requested';
    }).length;
  }, [timeframeContracts]);

  // All documents currently in-flight / active in pipeline
  const activeInFlightDocuments = useMemo(() => {
    return contracts.filter(c => {
      const s = (c.status || 'in_review').toLowerCase().trim();
      return s !== 'completed' && s !== 'terminated' && s !== 'rejected';
    }).map(c => {
      const companyName = (c.company_name || c.client_name || c.client_company_name || 'Client Contract').trim();
      const docType = (c.doc_type || 'NDA').trim();
      const status = (c.status || 'in_review').toLowerCase().trim();
      const action = getActionNeeded(status);
      const theme = getStatusTheme(status);
      const createdAt = c.created_at || c.updated_at || new Date().toISOString();
      return {
        ...c,
        companyName,
        docType,
        normalizedStatus: status,
        action,
        theme,
        createdAt
      };
    });
  }, [contracts]);

  // Current calendar month metadata & metrics
  const currentMonthData = useMemo(() => {
    return monthlyTimelineData.find(m => m.isCurrent) || monthlyTimelineData[monthlyTimelineData.length - 1] || {
      monthKey: '',
      shortLabel: 'Current',
      fullLabel: 'Current Month',
      count: 0,
      sent: 0,
      completed: 0,
      inReview: 0
    };
  }, [monthlyTimelineData]);

  const lastMonthData = useMemo(() => {
    return monthlyTimelineData[monthlyTimelineData.length - 2] || {
      monthKey: '',
      shortLabel: 'Previous',
      fullLabel: 'Previous Month',
      count: 0,
      sent: 0
    };
  }, [monthlyTimelineData]);

  // All documents dispatched/sent during current month (or selected timeframe)
  const sentThisMonthDocuments = useMemo(() => {
    const targetMonthKey = selectedMonthKey === 'all' ? currentMonthData.monthKey : selectedMonthKey;
    return contracts.filter(c => {
      const dateStr = c.created_at || c.updated_at;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return false;
      const docKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (selectedMonthKey !== 'all' && docKey !== targetMonthKey) return false;
      const s = (c.status || '').toLowerCase().trim();
      return s === 'sent' || s === 'sent_for_signature' || s === 'resent_for_signature' || s === 'resent' || s === 'executed' || s === 'completed' || s === 'changes_requested';
    }).map(c => {
      const companyName = (c.company_name || c.client_name || c.client_company_name || 'Client Contract').trim();
      const docType = (c.doc_type || 'NDA').trim();
      const status = (c.status || 'sent').toLowerCase().trim();
      const action = getActionNeeded(status);
      const theme = getStatusTheme(status);
      const createdAt = c.created_at || c.updated_at || new Date().toISOString();
      return {
        ...c,
        companyName,
        docType,
        normalizedStatus: status,
        action,
        theme,
        createdAt
      };
    });
  }, [contracts, selectedMonthKey, currentMonthData.monthKey]);

  // All executed & completed finalized documents in selected timeframe
  const finalizedDocuments = useMemo(() => {
    return timeframeContracts.filter(c => {
      const s = (c.status || '').toLowerCase().trim();
      return s === 'executed' || s === 'completed';
    }).map(c => {
      const companyName = (c.company_name || c.client_name || c.client_company_name || 'Client Contract').trim();
      const docType = (c.doc_type || 'NDA').trim();
      const status = (c.status || 'completed').toLowerCase().trim();
      const action = getActionNeeded(status);
      const theme = getStatusTheme(status);
      const createdAt = c.created_at || c.updated_at || new Date().toISOString();
      return {
        ...c,
        companyName,
        docType,
        normalizedStatus: status,
        action,
        theme,
        createdAt
      };
    });
  }, [timeframeContracts]);

  const activeInFlightCount = activeInFlightDocuments.length;
  const completionRate = tfTotal > 0 ? Math.round(((tfExecuted + tfCompleted) / Math.max(1, tfTotal)) * 100) : 0;

  // Active Month details for the floating widget
  const activeMonthInfo = useMemo(() => {
    if (selectedMonthKey === 'all') {
      return {
        label: 'All Time Activity',
        shortLabel: 'All',
        count: contracts.length,
        growth: '+100%',
        dispatched: contracts.filter(c => {
          const s = (c.status || '').toLowerCase().trim();
          return s === 'sent' || s === 'sent_for_signature' || s === 'resent_for_signature' || s === 'resent' || s === 'executed' || s === 'completed' || s === 'changes_requested';
        }).length
      };
    }
    const found = monthlyTimelineData.find(m => m.monthKey === selectedMonthKey);
    return found ? {
      label: found.fullLabel,
      shortLabel: found.shortLabel,
      count: found.count,
      growth: found.count > 0 ? `+${Math.min(100, found.count * 33.3).toFixed(1)}%` : '0%',
      dispatched: found.sent,
      inReview: found.inReview,
      completed: found.completed
    } : {
      label: 'Current Month',
      shortLabel: 'Current',
      count: tfTotal,
      growth: '+100%',
      dispatched: tfDispatchedCount,
      inReview: tfInReview,
      completed: tfCompleted
    };
  }, [selectedMonthKey, monthlyTimelineData, contracts, tfDispatchedCount, tfTotal, tfInReview, tfCompleted]);

  // Calculate coordinates for crisp, enterprise chart
  const chartPoints = useMemo(() => {
    const data = monthlyTimelineData;
    const width = 720;
    const height = 150;
    const padX = 50;
    const padY = 25;

    const counts = data.map(d => d.count);
    const rawMax = Math.max(...counts, 0);
    const maxVal = Math.max(4, Math.ceil((rawMax + 1) / 2) * 2);

    const points = data.map((d, i) => {
      const x = padX + (i * (width - 2 * padX)) / Math.max(1, data.length - 1);
      // Clean exact mathematical scaling based on actual contract count
      const y = height - padY - (d.count / maxVal) * (height - 2 * padY);
      return { 
        x, 
        y: Math.max(padY, Math.min(height - padY, y)),
        valY: y,
        ...d 
      };
    });

    // Compute clean cubic Bezier path
    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 2;
      const cpY1 = p0.y;
      const cpX2 = p0.x + (p1.x - p0.x) / 2;
      const cpY2 = p1.y;
      pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }

    const fillD = `${pathD} L ${points[points.length - 1].x} ${height - padY} L ${points[0].x} ${height - padY} Z`;

    const yTicks = [
      { val: maxVal, y: padY },
      { val: Math.round(maxVal / 2), y: padY + (height - 2 * padY) / 2 },
      { val: 0, y: height - padY }
    ];

    return { points, pathD, fillD, width, height, maxVal, padX, padY, yTicks };
  }, [monthlyTimelineData]);

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

          // Collapse intermediate "Changes Requested" -> "Sent for Resignature" into a single direct "Executed" -> "Sent for Resignature" event
          if (cleanedEvents.length > 0 && cleanedEvents[cleanedEvents.length - 1].to_status === 'changes_requested' && (toNorm === 'resent_for_signature' || toNorm === 'sent')) {
            const prev = cleanedEvents[cleanedEvents.length - 1];
            prev.to_status = toNorm === 'sent' ? 'resent_for_signature' : toNorm;
            if (current.note && !prev.note) {
              prev.note = current.note;
            }
            prev.rawDate = current.rawDate || prev.rawDate;
            prev.timestamp = current.timestamp || prev.timestamp;
            if (current.changed_by && current.changed_by !== 'system') {
              prev.changed_by = current.changed_by;
            }
            continue;
          }

          let effectiveFrom = fromNorm || (cleanedEvents.length > 0 ? cleanedEvents[cleanedEvents.length - 1].to_status : 'in_review');
          if (cleanedEvents.length > 0) {
            const prev = cleanedEvents[cleanedEvents.length - 1];

            // If already in target status, skip duplicate event (e.g. duplicate completed events)
            if (prev.to_status === toNorm) {
              continue;
            }

            // If previous state was changes_requested or resent_for_signature and current target is executed, transition cleanly
            if ((prev.to_status === 'changes_requested' || prev.to_status === 'resent_for_signature') && toNorm === 'executed') {
              effectiveFrom = prev.to_status;
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

    // Filter documents by status filter, timeframe filter, and search query
    const q = searchAuditQuery.toLowerCase().trim();

    return result
      .map(comp => {
        const filteredDocs = comp.documents.filter(doc => {
          // 1. Status Filter match
          if (selectedStatusFilter) {
            const st = (doc.latestEvent?.to_status || doc.events[doc.events.length - 1]?.to_status || 'in_review').toLowerCase().trim();
            if (selectedStatusFilter === 'active_pipeline') {
              if (st === 'completed' || st === 'terminated' || st === 'rejected') {
                return false;
              }
            } else if (selectedStatusFilter === 'sent') {
              if (st !== 'sent' && st !== 'sent_for_signature' && st !== 'resent_for_signature' && st !== 'resent') {
                return false;
              }
            } else if (selectedStatusFilter === 'terminated') {
              if (st !== 'terminated' && st !== 'rejected') {
                return false;
              }
            } else if (st !== selectedStatusFilter) {
              return false;
            }
          }

          // 2. Month Filter match (from graphical wave chart)
          if (selectedMonthKey && selectedMonthKey !== 'all') {
            const contractMeta = contractsMap[doc.contractId] || {};
            const dateStr = contractMeta.created_at || doc.latestEvent?.rawDate || doc.latestEvent?.changed_at;
            if (dateStr) {
              const d = new Date(dateStr);
              if (!isNaN(d.getTime())) {
                const docKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                if (docKey !== selectedMonthKey) {
                  return false;
                }
              }
            }
          }

          // 3. Search Query match
          if (q) {
            const matchesComp = comp.companyName.toLowerCase().includes(q);
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
            if (!matchesComp && !matchesDoc) {
              return false;
            }
          }

          return true;
        });

        if (filteredDocs.length === 0) return null;

        return {
          ...comp,
          documents: filteredDocs,
          totalEvents: filteredDocs.reduce((sum, d) => sum + d.totalEvents, 0)
        };
      })
      .filter(Boolean);
  }, [contracts, history, contractsMap, searchAuditQuery, selectedStatusFilter, selectedMonthKey]);

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
            <div className="p-2.5 rounded-xl bg-glow/10 border border-glow/30 text-glow shadow-[0_0_15px_rgba(0,243,255,0.2)]">
              <BarChart3 size={28} />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3 flex-wrap">
                <span>Analytics & Audit</span>
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">
                Real-time monthly document velocity, interactive state metrics, and audit history.
              </p>
            </div>
          </div>

          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 hover:border-glow/40 text-white transition-all duration-300 disabled:opacity-50 self-start md:self-auto shadow-lg hover:shadow-glow/10"
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

        {/* Section A: Executive Metrics & High-Clarity Velocity Dashboard */}
        <div className="mb-10 space-y-6">
          {/* 1. Executive 3-Card Interactive Hero KPI Strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
            {/* Hero Card 1: Documents Sent This Month (Clickable Pop-up Trigger) */}
            <motion.button
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowSentMonthModal(true)}
              className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950 p-5 shadow-lg relative overflow-hidden flex flex-col justify-between text-left transition-all duration-300 cursor-pointer hover:border-indigo-400/60 hover:shadow-indigo-500/10 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                    <Send size={13} className="text-indigo-400" />
                    Documents Sent This Month
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {currentMonthData.shortLabel} {currentMonthData.year}
                </span>
              </div>

              <div className="my-3.5">
                <div className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-baseline gap-2">
                  <span>{isLoading ? '...' : currentMonthData.sent}</span>
                  <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                    {currentMonthData.sent === 1 ? 'Contract' : 'Contracts'} Dispatched
                  </span>
                </div>
                <div className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
                  <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                    <TrendingUp size={12} />
                    {lastMonthData.sent === 0 ? '+100%' : `+${Math.round(((currentMonthData.sent - lastMonthData.sent) / Math.max(1, lastMonthData.sent)) * 100)}%`}
                  </span>
                  <span>vs previous month ({lastMonthData.sent} sent)</span>
                </div>
              </div>

              <div className="pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px] text-indigo-400 font-semibold group-hover:text-indigo-300">
                <span>Click to view dispatched documents pop-up</span>
                <span className="group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
            </motion.button>

            {/* Hero Card 2: In-Flight Pipeline (Clickable Pop-up Trigger) */}
            <motion.button
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowActivePipelineModal(true)}
              className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/20 via-slate-900 to-slate-950 p-5 shadow-lg text-left transition-all duration-300 cursor-pointer flex flex-col justify-between hover:border-amber-400/60 hover:shadow-amber-500/10 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <Zap size={14} className="text-amber-400" />
                  Active in Pipeline
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {activeInFlightDocuments.length} In-Flight
                </span>
              </div>

              <div className="my-3.5">
                <div className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-baseline gap-2">
                  <span>{isLoading ? '...' : activeInFlightDocuments.length}</span>
                  <span className="text-xs font-semibold text-amber-300/90 uppercase tracking-wider">
                    {activeInFlightDocuments.length === 1 ? 'Action Pending' : 'Actions Pending'}
                  </span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  In Review ({activeInFlightDocuments.filter(d => d.normalizedStatus === 'in_review').length}) • Sent ({activeInFlightDocuments.filter(d => d.normalizedStatus === 'sent' || d.normalizedStatus === 'sent_for_signature').length})
                </div>
              </div>

              <div className="pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px] text-amber-400 font-semibold group-hover:text-amber-300">
                <span>Click to view active documents pop-up</span>
                <span className="group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
            </motion.button>

            {/* Hero Card 3: Execution & Finalization (Clickable Pop-up Trigger) */}
            <motion.button
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowFinalizedModal(true)}
              className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 via-slate-900 to-slate-950 p-5 shadow-lg text-left transition-all duration-300 cursor-pointer flex flex-col justify-between hover:border-emerald-400/60 hover:shadow-emerald-500/10 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  Executed & Completed
                </span>
                <span className="text-xs font-bold text-emerald-400">{completionRate}% Rate</span>
              </div>

              <div className="my-3.5">
                <div className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-baseline gap-2">
                  <span>{isLoading ? '...' : tfExecuted + tfCompleted}</span>
                  <span className="text-xs font-semibold text-emerald-300/80 uppercase tracking-wider">
                    Finalized
                  </span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {tfExecuted} Executed • {tfCompleted} Completed
                </div>
              </div>

              <div className="pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px] text-emerald-400 font-semibold group-hover:text-emerald-300">
                <span>Click to view finalized documents pop-up</span>
                <span className="group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
            </motion.button>
          </div>

          {/* 2. Main Professional Analytics Chart Card (Clean, Sharp, High Contrast) */}
          <div className="rounded-2xl border border-slate-800 bg-[#0c1222] p-6 shadow-xl relative">
            {/* Chart Header Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800/80">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <Activity size={16} />
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Document Volume & Dispatch Velocity (Last 6 Months)
                  </h2>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Click any month tab or chart data point to filter the live audit records below.
                </p>
              </div>

              {/* Controls: Chart View Mode & Month Tabs */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* View Mode Toggle */}
                <div className="flex items-center p-0.5 rounded-xl bg-slate-900 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setChartViewMode('curve')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      chartViewMode === 'curve'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Wave Trend
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartViewMode('bars')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      chartViewMode === 'bars'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Bar Columns
                  </button>
                </div>

                {/* All Time Reset Button */}
                <button
                  type="button"
                  onClick={() => setSelectedMonthKey('all')}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all border ${
                    selectedMonthKey === 'all'
                      ? 'bg-glow text-black border-glow font-bold'
                      : 'bg-slate-900 border-slate-800 text-gray-400 hover:text-white'
                  }`}
                >
                  All Time
                </button>
              </div>
            </div>

            {/* Interactive Month Milestone Buttons (Sharp Tabs) */}
            <div className="grid grid-cols-6 gap-2 mb-6">
              {monthlyTimelineData.map((month) => {
                const isSelected = selectedMonthKey === month.monthKey;
                const isHovered = hoveredPoint?.monthKey === month.monthKey;
                return (
                  <button
                    key={month.monthKey}
                    type="button"
                    onClick={() => setSelectedMonthKey(month.monthKey)}
                    onMouseEnter={() => setHoveredPoint(month)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-500/20 border-indigo-400 text-white ring-1 ring-indigo-400/50'
                        : isHovered
                        ? 'bg-slate-800/80 border-slate-700 text-gray-200'
                        : 'bg-slate-900/50 border-slate-800/80 text-gray-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                      <span>{month.shortLabel}</span>
                      {month.isCurrent && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Current Month" />
                      )}
                    </div>
                    <div className="text-base font-extrabold text-white mt-0.5">
                      {month.count}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {month.sent} sent
                    </div>
                  </button>
                );
              })}
            </div>

            {/* SVG Chart Area (Crisp vector rendering with Y-axis grid) */}
            <div className="relative w-full h-44 my-2">
              {/* Floating Hover Tooltip */}
              {hoveredPoint && (
                <div 
                  className="absolute z-20 pointer-events-none -top-2 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-indigo-500/40 rounded-xl px-3.5 py-2 shadow-2xl backdrop-blur-md text-xs"
                >
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span>{hoveredPoint.fullLabel}</span>
                    {hoveredPoint.isCurrent && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-300 mt-1 flex items-center gap-3">
                    <span>Total: <strong className="text-white">{hoveredPoint.count}</strong></span>
                    <span>Dispatched: <strong className="text-indigo-400">{hoveredPoint.sent}</strong></span>
                    <span>Completed: <strong className="text-emerald-400">{hoveredPoint.completed}</strong></span>
                  </div>
                </div>
              )}

              {chartViewMode === 'curve' ? (
                <svg 
                  viewBox={`0 0 ${chartPoints.width} ${chartPoints.height}`}
                  className="w-full h-full overflow-visible"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="cleanAreaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#818cf8" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#818cf8" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Y-Axis Grid Lines */}
                  {chartPoints.yTicks.map((tick) => (
                    <g key={tick.val}>
                      <line
                        x1={chartPoints.padX}
                        y1={tick.y}
                        x2={chartPoints.width - chartPoints.padX}
                        y2={tick.y}
                        stroke="rgba(255,255,255,0.07)"
                        strokeDasharray="3 3"
                        strokeWidth="1"
                      />
                      <text
                        x={chartPoints.padX - 10}
                        y={tick.y + 4}
                        fill="rgba(156, 163, 175, 0.7)"
                        fontSize="10"
                        fontWeight="600"
                        textAnchor="end"
                      >
                        {tick.val}
                      </text>
                    </g>
                  ))}

                  {/* Clean Semi-transparent Gradient Fill Area */}
                  <path
                    d={chartPoints.fillD}
                    fill="url(#cleanAreaGradient)"
                  />

                  {/* Solid Vector Curve Line (Crisp Anti-Aliased) */}
                  <path
                    d={chartPoints.pathD}
                    fill="none"
                    stroke="#818cf8"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Milestone Data Points along the curve */}
                  {chartPoints.points.map((pt) => {
                    const isSelected = selectedMonthKey === pt.monthKey;
                    const isHovered = hoveredPoint?.monthKey === pt.monthKey;
                    return (
                      <g 
                        key={pt.monthKey} 
                        className="cursor-pointer" 
                        onClick={() => setSelectedMonthKey(pt.monthKey)}
                        onMouseEnter={() => setHoveredPoint(pt)}
                        onMouseLeave={() => setHoveredPoint(null)}
                      >
                        {/* Hover / Selected Outer Ring */}
                        {(isSelected || isHovered) && (
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r="9"
                            fill="none"
                            stroke={isSelected ? "#818cf8" : "rgba(129,140,248,0.5)"}
                            strokeWidth="2"
                          />
                        )}

                        {/* Crisp Data Dot with solid white center */}
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={isSelected ? "5.5" : isHovered ? "5" : "4"}
                          fill="#ffffff"
                          stroke={isSelected ? "#6366f1" : "#4338ca"}
                          strokeWidth="2.5"
                        />
                      </g>
                    );
                  })}
                </svg>
              ) : (
                /* Bar Columns View */
                <div className="flex items-end justify-between h-full px-8 pb-4">
                  {monthlyTimelineData.map((month) => {
                    const isSelected = selectedMonthKey === month.monthKey;
                    const maxV = chartPoints.maxVal || 4;
                    const heightPercent = Math.max(8, (month.count / maxV) * 100);
                    return (
                      <div
                        key={month.monthKey}
                        onClick={() => setSelectedMonthKey(month.monthKey)}
                        onMouseEnter={() => setHoveredPoint(month)}
                        onMouseLeave={() => setHoveredPoint(null)}
                        className="flex flex-col items-center flex-1 max-w-[60px] cursor-pointer group"
                      >
                        <span className="text-[11px] font-bold text-gray-300 mb-1">
                          {month.count}
                        </span>
                        <div className="w-full bg-slate-800 rounded-t-lg h-28 flex items-end overflow-hidden p-1">
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className={`w-full rounded-t-md transition-all duration-300 ${
                              isSelected
                                ? 'bg-indigo-500'
                                : 'bg-indigo-600/60 group-hover:bg-indigo-500/80'
                            }`}
                          />
                        </div>
                        <span className="text-[10px] font-semibold text-gray-400 mt-1 uppercase">
                          {month.shortLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selected Period Info Footer */}
            <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Selected View:</span>
                <span className="font-bold text-white bg-slate-800 px-2.5 py-0.5 rounded-md border border-slate-700">
                  {selectedMonthKey === 'all' ? 'All Time Overview' : activeMonthInfo.label}
                </span>
                <span className="text-gray-400">
                  ({activeMonthInfo.count} {activeMonthInfo.count === 1 ? 'document' : 'documents'}, {activeMonthInfo.dispatched} dispatched)
                </span>
              </div>

              {selectedMonthKey !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedMonthKey('all')}
                  className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer flex items-center gap-1 self-start sm:self-auto"
                >
                  <span>Reset to All Time</span>
                  <span>×</span>
                </button>
              )}
            </div>
          </div>

          {/* 3. Visual Lifecycle Distribution Multi-Color Ribbon */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
              <span className="font-bold text-gray-200">Lifecycle Status Breakdown ({tfTotal} Total in Selected View)</span>
              <span className="text-[11px] text-gray-400">Proportional split across states</span>
            </div>
            <div className="w-full h-3 bg-black/60 rounded-full overflow-hidden flex border border-slate-800 p-0.5 gap-0.5">
              {tfTotal === 0 ? (
                <div className="w-full h-full bg-slate-800 rounded-full" />
              ) : (
                <>
                  {tfInReview > 0 && (
                    <div 
                      style={{ width: `${getTfPercent(tfInReview)}%` }} 
                      className="bg-amber-400 h-full rounded-sm transition-all duration-500" 
                      title={`In Review: ${tfInReview} (${getTfPercent(tfInReview)}%)`}
                    />
                  )}
                  {tfSent > 0 && (
                    <div 
                      style={{ width: `${getTfPercent(tfSent)}%` }} 
                      className="bg-purple-400 h-full rounded-sm transition-all duration-500" 
                      title={`Sent for Signature: ${tfSent} (${getTfPercent(tfSent)}%)`}
                    />
                  )}
                  {tfExecuted > 0 && (
                    <div 
                      style={{ width: `${getTfPercent(tfExecuted)}%` }} 
                      className="bg-cyan-400 h-full rounded-sm transition-all duration-500" 
                      title={`Executed: ${tfExecuted} (${getTfPercent(tfExecuted)}%)`}
                    />
                  )}
                  {tfChangesRequested > 0 && (
                    <div 
                      style={{ width: `${getTfPercent(tfChangesRequested)}%` }} 
                      className="bg-orange-400 h-full rounded-sm transition-all duration-500" 
                      title={`Changes Requested: ${tfChangesRequested} (${getTfPercent(tfChangesRequested)}%)`}
                    />
                  )}
                  {tfCompleted > 0 && (
                    <div 
                      style={{ width: `${getTfPercent(tfCompleted)}%` }} 
                      className="bg-emerald-400 h-full rounded-sm transition-all duration-500" 
                      title={`Completed: ${tfCompleted} (${getTfPercent(tfCompleted)}%)`}
                    />
                  )}
                  {tfTerminated > 0 && (
                    <div 
                      style={{ width: `${getTfPercent(tfTerminated)}%` }} 
                      className="bg-rose-400 h-full rounded-sm transition-all duration-500" 
                      title={`Terminated: ${tfTerminated} (${getTfPercent(tfTerminated)}%)`}
                    />
                  )}
                </>
              )}
            </div>
          </div>

          {/* 4. Interactive Status Breakdown Grid (Clickable Filter Tiles with Mini Hover Info Tooltip) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3.5">
            {[
              {
                key: null,
                label: 'All Documents',
                count: tfTotal,
                percent: 100,
                icon: FileText,
                theme: {
                  bg: 'bg-slate-900/60',
                  activeBg: 'bg-slate-800',
                  border: 'border-slate-800',
                  activeBorder: 'border-glow',
                  text: 'text-white',
                  iconBox: 'bg-glow/10 text-glow border-glow/30',
                  dot: 'bg-glow'
                },
                tagline: 'All Contracts',
                description: 'Every contract in your workspace across all stages.'
              },
              {
                key: 'in_review',
                label: 'In Review',
                count: tfInReview,
                percent: getTfPercent(tfInReview),
                icon: Clock,
                theme: {
                  bg: 'bg-amber-500/5',
                  activeBg: 'bg-amber-500/15',
                  border: 'border-amber-500/20',
                  activeBorder: 'border-amber-400',
                  text: 'text-amber-400',
                  iconBox: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
                  dot: 'bg-amber-400'
                },
                tagline: 'Team Approval',
                description: 'Draft is ready and waiting for your team to check and approve before sending.'
              },
              {
                key: 'sent',
                label: 'Sent for Signature',
                count: tfSent,
                percent: getTfPercent(tfSent),
                icon: Send,
                theme: {
                  bg: 'bg-purple-500/5',
                  activeBg: 'bg-purple-500/15',
                  border: 'border-purple-500/20',
                  activeBorder: 'border-purple-400',
                  text: 'text-purple-400',
                  iconBox: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
                  dot: 'bg-purple-400'
                },
                tagline: 'Awaiting Sign',
                description: 'Sent to the client and waiting for them to sign.'
              },
              {
                key: 'executed',
                label: 'Executed',
                count: tfExecuted,
                percent: getTfPercent(tfExecuted),
                icon: CheckCircle2,
                theme: {
                  bg: 'bg-cyan-500/5',
                  activeBg: 'bg-cyan-500/15',
                  border: 'border-cyan-500/20',
                  activeBorder: 'border-cyan-400',
                  text: 'text-cyan-400',
                  iconBox: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
                  dot: 'bg-cyan-400'
                },
                tagline: 'Signed by All',
                description: 'Signed by everyone and ready for final completion.'
              },
              {
                key: 'changes_requested',
                label: 'Changes Requested',
                count: tfChangesRequested,
                percent: getTfPercent(tfChangesRequested),
                icon: RotateCcw,
                theme: {
                  bg: 'bg-orange-500/5',
                  activeBg: 'bg-orange-500/15',
                  border: 'border-orange-500/20',
                  activeBorder: 'border-orange-400',
                  text: 'text-orange-400',
                  iconBox: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
                  dot: 'bg-orange-400'
                },
                tagline: 'Edits Needed',
                description: 'The client requested changes or corrections before they will sign.'
              },
              {
                key: 'completed',
                label: 'Completed',
                count: tfCompleted,
                percent: getTfPercent(tfCompleted),
                icon: ShieldCheck,
                theme: {
                  bg: 'bg-emerald-500/5',
                  activeBg: 'bg-emerald-500/15',
                  border: 'border-emerald-500/20',
                  activeBorder: 'border-emerald-400',
                  text: 'text-emerald-400',
                  iconBox: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
                  dot: 'bg-emerald-400'
                },
                tagline: 'Done & Sealed',
                description: 'Fully signed, finalized, and saved safely in your records.'
              },
              {
                key: 'terminated',
                label: 'Terminated',
                count: tfTerminated,
                percent: getTfPercent(tfTerminated),
                icon: XCircle,
                theme: {
                  bg: 'bg-rose-500/5',
                  activeBg: 'bg-rose-500/15',
                  border: 'border-rose-500/20',
                  activeBorder: 'border-rose-400',
                  text: 'text-rose-400',
                  iconBox: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
                  dot: 'bg-rose-400'
                },
                tagline: 'Cancelled',
                description: 'Cancelled, rejected, or stopped before being completed.'
              }
            ].map((card, index) => {
              const Icon = card.icon;
              const isSelected = selectedStatusFilter === card.key;

              return (
                <motion.button
                  key={card.label}
                  type="button"
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedStatusFilter(card.key)}
                  className={`relative p-3.5 sm:p-4 rounded-2xl border text-left transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[148px] hover:z-30 ${
                    isSelected 
                      ? `${card.theme.activeBg} ${card.theme.activeBorder} shadow-[0_0_20px_rgba(0,243,255,0.2)] ring-2 ring-glow/50`
                      : `${card.theme.bg} ${card.theme.border} hover:border-slate-700 hover:bg-slate-800/50`
                  }`}
                >
                  {/* Selected Indicator Check Badge */}
                  {isSelected && (
                    <div className="absolute top-2.5 right-2.5 px-1.5 py-0.5 rounded-md bg-glow text-black font-extrabold text-[9px] flex items-center gap-1 shadow-sm">
                      <Check size={10} />
                      <span>ACTIVE</span>
                    </div>
                  )}

                  {/* Top Section: Icon & Header */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className={`p-2 rounded-xl border ${card.theme.iconBox}`}>
                        <Icon size={16} />
                      </div>
                      {!isSelected && (
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          {card.percent}%
                        </span>
                      )}
                    </div>
                    
                    {/* State Label with Mini Hover Info Icon & Rich Tooltip */}
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-xs font-bold text-gray-100 leading-snug">
                        {card.label}
                      </span>

                      {/* Mini Hover Icon Trigger */}
                      <div 
                        className="relative group/info inline-flex items-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div 
                          className="w-4 h-4 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/25 flex items-center justify-center text-gray-400 hover:text-white transition-all cursor-help"
                          title=""
                        >
                          <Info size={10} />
                        </div>

                        {/* Floating Tooltip displaying 1-2 line professional explanation */}
                        <div 
                          className={`pointer-events-none absolute bottom-full mb-2.5 w-60 sm:w-64 p-3 rounded-xl bg-slate-900/95 border border-slate-700/80 shadow-[0_12px_32px_rgba(0,0,0,0.85)] backdrop-blur-xl opacity-0 group-hover/info:opacity-100 transition-all duration-200 z-50 transform scale-95 group-hover/info:scale-100 ${
                            index === 0 
                              ? 'left-0 translate-x-0' 
                              : index >= 5 
                                ? 'right-0 left-auto translate-x-0' 
                                : 'left-1/2 -translate-x-1/2'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5 pb-1.5 mb-1.5 border-b border-white/10">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${card.theme.dot}`} />
                              <span className="text-[11.5px] font-bold text-white tracking-wide">{card.label}</span>
                            </div>
                            <span className="text-[9px] font-semibold text-gray-400 px-1.5 py-0.5 rounded bg-white/5 uppercase">
                              {card.tagline}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-300 leading-relaxed font-normal">
                            {card.description}
                          </p>
                          {/* Caret Arrow */}
                          <div 
                            className={`absolute top-full -mt-1 border-4 border-transparent border-t-slate-800 ${
                              index === 0 
                                ? 'left-4' 
                                : index >= 5 
                                  ? 'right-4' 
                                  : 'left-1/2 -translate-x-1/2'
                            }`} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Section: Count Display & Progress Bar */}
                  <div className="mt-3 pt-2.5 border-t border-white/5">
                    <div className="flex items-baseline justify-between">
                      <div className={`text-2xl font-black ${card.theme.text} tracking-tight`}>
                        {isLoading ? '...' : card.count}
                      </div>
                      <span className="text-[9.5px] font-semibold text-gray-400 uppercase">
                        {card.count === 1 ? 'doc' : 'docs'}
                      </span>
                    </div>
                    <div className="w-full bg-white/10 h-1 rounded-full mt-1.5 overflow-hidden">
                      <div 
                        className={`${card.theme.dot} h-full rounded-full transition-all duration-500`}
                        style={{ width: `${card.percent}%` }}
                      />
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Section B: Document Status History (Audit Trail) */}
        <div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                <Layers size={16} className="text-glow" />
                <span>Document Status History (Audit Trail)</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Two-tier lifecycle audit trail grouped by Company and Document.
              </p>
            </div>

            {/* Search & Active Filters Bar */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Active Filter Pill */}
              {(selectedStatusFilter || selectedMonthKey !== 'all') && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-glow/10 border border-glow/30 text-glow text-xs font-semibold">
                  <Filter size={12} />
                  <span>
                    {selectedStatusFilter 
                      ? `Filter: ${selectedStatusFilter.replace('_', ' ').toUpperCase()}`
                      : `Month: ${activeMonthInfo.label}`
                    }
                  </span>
                  <button
                    onClick={() => {
                      setSelectedStatusFilter(null);
                      setSelectedMonthKey('all');
                    }}
                    className="hover:text-white ml-1 cursor-pointer"
                    title="Clear filter"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              {/* Search Audit Logs */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                <input
                  type="text"
                  placeholder="Search company, doc, notes..."
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
                                    {/* Action Guidance Callout Banner */}
                                    {(() => {
                                      const currentStatus = latestEvt.to_status || doc.events[doc.events.length - 1]?.to_status || 'in_review';
                                      const actionInfo = getActionNeeded(currentStatus);
                                      return (
                                        <div className={`mb-6 p-4 rounded-2xl border flex items-center justify-between gap-3 ${actionInfo.color} shadow-lg backdrop-blur-md`}>
                                          <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-xl bg-black/40 border border-white/10 shrink-0">
                                              <Zap size={16} />
                                            </div>
                                            <div>
                                              <div className="font-extrabold text-sm tracking-tight">{actionInfo.title}</div>
                                              <div className="text-xs opacity-85 mt-0.5">{actionInfo.description}</div>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })()}

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

        {/* 1. Documents Sent This Month Pop-up Modal */}
        {showSentMonthModal && createPortal(
          <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSentMonthModal(false)}
              className="fixed inset-0 bg-black/85 backdrop-blur-md"
            />

            {/* Modal Window */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-4xl rounded-3xl border border-slate-700 bg-gradient-to-b from-[#111827] via-[#0f172a] to-[#0b0f19] shadow-2xl z-10 overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-900/60">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                    <Send size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                        Documents Sent This Month
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {sentThisMonthDocuments.length} Dispatched
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Contracts dispatched to clients during {currentMonthData.shortLabel} {currentMonthData.year}.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSentMonthModal(false)}
                  className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Filter Tabs */}
              <div className="px-5 sm:px-6 py-3 border-b border-slate-800/80 bg-slate-900/40 flex items-center gap-2 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setSentModalFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    sentModalFilter === 'all'
                      ? 'bg-indigo-500 text-white font-bold shadow-md'
                      : 'bg-slate-800 text-gray-400 hover:text-white'
                  }`}
                >
                  All Dispatched ({sentThisMonthDocuments.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSentModalFilter('sent')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    sentModalFilter === 'sent'
                      ? 'bg-indigo-500 text-white font-bold shadow-md'
                      : 'bg-slate-800 text-gray-400 hover:text-white'
                  }`}
                >
                  Awaiting Signature ({sentThisMonthDocuments.filter(d => d.normalizedStatus === 'sent' || d.normalizedStatus === 'sent_for_signature' || d.normalizedStatus === 'resent_for_signature' || d.normalizedStatus === 'resent').length})
                </button>
                <button
                  type="button"
                  onClick={() => setSentModalFilter('executed')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    sentModalFilter === 'executed'
                      ? 'bg-indigo-500 text-white font-bold shadow-md'
                      : 'bg-slate-800 text-gray-400 hover:text-white'
                  }`}
                >
                  Signed / Executed ({sentThisMonthDocuments.filter(d => d.normalizedStatus === 'executed').length})
                </button>
                <button
                  type="button"
                  onClick={() => setSentModalFilter('completed')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    sentModalFilter === 'completed'
                      ? 'bg-indigo-500 text-white font-bold shadow-md'
                      : 'bg-slate-800 text-gray-400 hover:text-white'
                  }`}
                >
                  Completed ({sentThisMonthDocuments.filter(d => d.normalizedStatus === 'completed').length})
                </button>
              </div>

              {/* Modal Content / Document List Grouped by Company */}
              <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
                {(() => {
                  const filtered = sentThisMonthDocuments.filter(doc => {
                    if (sentModalFilter === 'sent') return doc.normalizedStatus === 'sent' || doc.normalizedStatus === 'sent_for_signature' || doc.normalizedStatus === 'resent_for_signature' || doc.normalizedStatus === 'resent';
                    if (sentModalFilter === 'executed') return doc.normalizedStatus === 'executed';
                    if (sentModalFilter === 'completed') return doc.normalizedStatus === 'completed';
                    return true;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="py-12 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto mb-3">
                          <Send size={24} />
                        </div>
                        <h3 className="text-base font-bold text-white">No dispatched documents in this filter</h3>
                        <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                          No sent documents matching the selected category for this period.
                        </p>
                      </div>
                    );
                  }

                  // Group contracts by company
                  const groups = {};
                  filtered.forEach(doc => {
                    const companyKey = (doc.companyName || doc.company_name || doc.client_name || doc.client_company_name || 'Client Contract').trim();
                    if (!groups[companyKey]) {
                      groups[companyKey] = {
                        companyName: companyKey,
                        clientEmail: doc.client_email || '',
                        signatoryName: doc.signatory_name || '',
                        documents: []
                      };
                    }
                    if (!groups[companyKey].clientEmail && doc.client_email) {
                      groups[companyKey].clientEmail = doc.client_email;
                    }
                    if (!groups[companyKey].signatoryName && doc.signatory_name) {
                      groups[companyKey].signatoryName = doc.signatory_name;
                    }
                    groups[companyKey].documents.push(doc);
                  });
                  const companyGroups = Object.values(groups);

                  return companyGroups.map((group, gIdx) => {
                    const docCount = group.documents.length;

                    return (
                      <div
                        key={group.companyName + gIdx}
                        className="rounded-2xl border border-slate-800 bg-slate-900/80 hover:border-slate-700 transition-all shadow-md overflow-hidden flex flex-col md:flex-row items-stretch"
                      >
                        {/* Left Column: Company Info */}
                        <div className="w-full md:w-64 lg:w-72 shrink-0 p-4 sm:p-5 flex flex-col justify-center items-start bg-white/[0.02] border-b md:border-b-0 md:border-r border-slate-800/80">
                          <div className="flex items-center gap-3 mb-2 w-full">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0 text-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.15)]">
                              <Building2 size={20} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight leading-snug break-words">
                                {group.companyName}
                              </h3>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-indigo-300 uppercase tracking-wider">
                                  <Layers size={11} />
                                  <span>{docCount} {docCount === 1 ? 'Document' : 'Documents'}</span>
                                </span>
                              </div>
                            </div>
                          </div>

                          {(group.signatoryName || group.clientEmail) && (
                            <div className="mt-1.5 text-xs text-gray-400 space-y-0.5 pl-0.5">
                              {group.signatoryName && (
                                <div className="text-gray-300 font-medium truncate text-[11.5px]">
                                  {group.signatoryName}
                                </div>
                              )}
                              {group.clientEmail && (
                                <div className="text-gray-500 font-mono text-[10.5px] truncate flex items-center gap-1">
                                  <User size={10} className="text-gray-500 shrink-0" />
                                  <span className="truncate">{group.clientEmail}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Right Section: Associated Documents Stack */}
                        <div className="flex-1 flex flex-col justify-center divide-y divide-slate-800/60">
                          {group.documents.map((doc, dIdx) => {
                            const action = getActionNeeded(doc.normalizedStatus);
                            const isSigned = doc.normalizedStatus === 'executed' || doc.normalizedStatus === 'completed' || Boolean(doc.signed_doc_url);

                            return (
                              <div
                                key={doc.id || dIdx}
                                className="p-4 sm:p-5 flex flex-col gap-3 hover:bg-white/[0.015] transition-colors"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                  <div className="flex items-center gap-2.5 flex-wrap">
                                    {getDocTypeBadge(doc.docType)}
                                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                      <Calendar size={12} className="text-gray-500 shrink-0" />
                                      <span>{formatDateTime(doc.createdAt)}</span>
                                    </div>
                                    <span className="text-[10px] text-gray-500 font-mono">
                                      ID: {doc.id ? String(doc.id).slice(0, 8) : 'N/A'}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                                    {renderStatusBadge(doc.normalizedStatus)}
                                    <button
                                      type="button"
                                      onClick={() => handleOpenDocPreview(doc)}
                                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 shadow-sm cursor-pointer ${
                                        isSigned
                                          ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30'
                                          : 'bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 border border-indigo-500/30'
                                      }`}
                                      title={isSigned ? 'View Signed Document' : 'View Generated Document'}
                                    >
                                      <Eye size={13} />
                                      <span>{isSigned ? 'View Signed' : 'View Doc'}</span>
                                    </button>
                                  </div>
                                </div>

                                <div className={`rounded-xl border p-2.5 sm:p-3 ${action.color} flex items-start gap-2.5`}>
                                  <Zap size={15} className="shrink-0 mt-0.5" />
                                  <div>
                                    <div className="font-bold text-xs uppercase tracking-wide">
                                      {action.title}
                                    </div>
                                    <div className="text-[11px] opacity-90 mt-0.5 leading-relaxed">
                                      {action.description}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between gap-4">
                <span className="text-xs text-gray-400">
                  Showing {sentThisMonthDocuments.length} dispatched {sentThisMonthDocuments.length === 1 ? 'document' : 'documents'}
                </span>

                <button
                  type="button"
                  onClick={() => setShowSentMonthModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white transition-all cursor-pointer"
                >
                  Close Pop-up
                </button>
              </div>
            </motion.div>
          </div>,
          document.body
        )}

        {/* 2. Active Pipeline Documents Pop-up Modal */}
        {showActivePipelineModal && createPortal(
          <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowActivePipelineModal(false)}
              className="fixed inset-0 bg-black/85 backdrop-blur-md"
            />

            {/* Modal Window */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-4xl rounded-3xl border border-slate-700 bg-gradient-to-b from-[#111827] via-[#0f172a] to-[#0b0f19] shadow-2xl z-10 overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-900/60">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.2)]">
                    <Zap size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                        Active Pipeline Documents
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {activeInFlightDocuments.length} Pending
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Contracts currently in-flight requiring review, approval, or client signatures.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowActivePipelineModal(false)}
                  className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Filter Tabs */}
              <div className="px-5 sm:px-6 py-3 border-b border-slate-800/80 bg-slate-900/40 flex items-center gap-2 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setPipelineModalFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    pipelineModalFilter === 'all'
                      ? 'bg-amber-500 text-black font-bold shadow-md'
                      : 'bg-slate-800 text-gray-400 hover:text-white'
                  }`}
                >
                  All Active ({activeInFlightDocuments.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPipelineModalFilter('in_review')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    pipelineModalFilter === 'in_review'
                      ? 'bg-amber-500 text-black font-bold shadow-md'
                      : 'bg-slate-800 text-gray-400 hover:text-white'
                  }`}
                >
                  In Review ({activeInFlightDocuments.filter(d => d.normalizedStatus === 'in_review').length})
                </button>
                <button
                  type="button"
                  onClick={() => setPipelineModalFilter('sent')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    pipelineModalFilter === 'sent'
                      ? 'bg-amber-500 text-black font-bold shadow-md'
                      : 'bg-slate-800 text-gray-400 hover:text-white'
                  }`}
                >
                  Sent for Signature ({activeInFlightDocuments.filter(d => d.normalizedStatus === 'sent' || d.normalizedStatus === 'sent_for_signature').length})
                </button>
                <button
                  type="button"
                  onClick={() => setPipelineModalFilter('changes_requested')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    pipelineModalFilter === 'changes_requested'
                      ? 'bg-amber-500 text-black font-bold shadow-md'
                      : 'bg-slate-800 text-gray-400 hover:text-white'
                  }`}
                >
                  Changes / Resignature ({activeInFlightDocuments.filter(d => d.normalizedStatus === 'changes_requested' || d.normalizedStatus === 'resent_for_signature').length})
                </button>
              </div>

              {/* Modal Content / Document List Grouped by Company */}
              <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
                {(() => {
                  const filtered = activeInFlightDocuments.filter(doc => {
                    if (pipelineModalFilter === 'in_review') return doc.normalizedStatus === 'in_review';
                    if (pipelineModalFilter === 'sent') return doc.normalizedStatus === 'sent' || doc.normalizedStatus === 'sent_for_signature';
                    if (pipelineModalFilter === 'changes_requested') return doc.normalizedStatus === 'changes_requested' || doc.normalizedStatus === 'resent_for_signature';
                    return true;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="py-12 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                          <ShieldCheck size={24} />
                        </div>
                        <h3 className="text-base font-bold text-white">No active documents in this state</h3>
                        <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                          All documents under this category have either completed their workflow or are in another stage.
                        </p>
                      </div>
                    );
                  }

                  // Group contracts by company
                  const groups = {};
                  filtered.forEach(doc => {
                    const companyKey = (doc.companyName || doc.company_name || doc.client_name || doc.client_company_name || 'Client Contract').trim();
                    if (!groups[companyKey]) {
                      groups[companyKey] = {
                        companyName: companyKey,
                        clientEmail: doc.client_email || '',
                        signatoryName: doc.signatory_name || '',
                        documents: []
                      };
                    }
                    if (!groups[companyKey].clientEmail && doc.client_email) {
                      groups[companyKey].clientEmail = doc.client_email;
                    }
                    if (!groups[companyKey].signatoryName && doc.signatory_name) {
                      groups[companyKey].signatoryName = doc.signatory_name;
                    }
                    groups[companyKey].documents.push(doc);
                  });
                  const companyGroups = Object.values(groups);

                  return companyGroups.map((group, gIdx) => {
                    const docCount = group.documents.length;

                    return (
                      <div
                        key={group.companyName + gIdx}
                        className="rounded-2xl border border-slate-800 bg-slate-900/80 hover:border-slate-700 transition-all shadow-md overflow-hidden flex flex-col md:flex-row items-stretch"
                      >
                        {/* Left Column: Company Info */}
                        <div className="w-full md:w-64 lg:w-72 shrink-0 p-4 sm:p-5 flex flex-col justify-center items-start bg-white/[0.02] border-b md:border-b-0 md:border-r border-slate-800/80">
                          <div className="flex items-center gap-3 mb-2 w-full">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.15)]">
                              <Building2 size={20} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight leading-snug break-words">
                                {group.companyName}
                              </h3>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-amber-300 uppercase tracking-wider">
                                  <Layers size={11} />
                                  <span>{docCount} {docCount === 1 ? 'Document' : 'Documents'}</span>
                                </span>
                              </div>
                            </div>
                          </div>

                          {(group.signatoryName || group.clientEmail) && (
                            <div className="mt-1.5 text-xs text-gray-400 space-y-0.5 pl-0.5">
                              {group.signatoryName && (
                                <div className="text-gray-300 font-medium truncate text-[11.5px]">
                                  {group.signatoryName}
                                </div>
                              )}
                              {group.clientEmail && (
                                <div className="text-gray-500 font-mono text-[10.5px] truncate flex items-center gap-1">
                                  <User size={10} className="text-gray-500 shrink-0" />
                                  <span className="truncate">{group.clientEmail}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Right Section: Associated Documents Stack */}
                        <div className="flex-1 flex flex-col justify-center divide-y divide-slate-800/60">
                          {group.documents.map((doc, dIdx) => {
                            const action = getActionNeeded(doc.normalizedStatus);
                            const isSigned = doc.normalizedStatus === 'executed' || doc.normalizedStatus === 'completed' || Boolean(doc.signed_doc_url);

                            return (
                              <div
                                key={doc.id || dIdx}
                                className="p-4 sm:p-5 flex flex-col gap-3 hover:bg-white/[0.015] transition-colors"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                  <div className="flex items-center gap-2.5 flex-wrap">
                                    {getDocTypeBadge(doc.docType)}
                                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                      <Calendar size={12} className="text-gray-500 shrink-0" />
                                      <span>{formatDateTime(doc.createdAt)}</span>
                                    </div>
                                    <span className="text-[10px] text-gray-500 font-mono">
                                      ID: {doc.id ? String(doc.id).slice(0, 8) : 'N/A'}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                                    {renderStatusBadge(doc.normalizedStatus)}
                                    <button
                                      type="button"
                                      onClick={() => handleOpenDocPreview(doc)}
                                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 shadow-sm cursor-pointer ${
                                        isSigned
                                          ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30'
                                          : 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30'
                                      }`}
                                      title={isSigned ? 'View Signed Document' : 'View Generated Document'}
                                    >
                                      <Eye size={13} />
                                      <span>{isSigned ? 'View Signed' : 'View Doc'}</span>
                                    </button>
                                  </div>
                                </div>

                                <div className={`rounded-xl border p-2.5 sm:p-3 ${action.color} flex items-start gap-2.5`}>
                                  <Zap size={15} className="shrink-0 mt-0.5" />
                                  <div>
                                    <div className="font-bold text-xs uppercase tracking-wide">
                                      {action.title}
                                    </div>
                                    <div className="text-[11px] opacity-90 mt-0.5 leading-relaxed">
                                      {action.description}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between gap-4">
                <span className="text-xs text-gray-400">
                  Showing {activeInFlightDocuments.length} active in-flight {activeInFlightDocuments.length === 1 ? 'document' : 'documents'}
                </span>

                <button
                  type="button"
                  onClick={() => setShowActivePipelineModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white transition-all cursor-pointer"
                >
                  Close Pop-up
                </button>
              </div>
            </motion.div>
          </div>,
          document.body
        )}

        {/* 3. Executed & Completed Finalized Pop-up Modal */}
        {showFinalizedModal && createPortal(
          <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFinalizedModal(false)}
              className="fixed inset-0 bg-black/85 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-4xl rounded-3xl border border-slate-700 bg-gradient-to-b from-[#111827] via-[#0f172a] to-[#0b0f19] shadow-2xl z-10 overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-900/60">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.2)]">
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                        Executed & Completed Documents
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {finalizedDocuments.length} Finalized
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Contracts that have collected all signatures and completed verification.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowFinalizedModal(false)}
                  className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Filter Tabs */}
              <div className="px-5 sm:px-6 py-3 border-b border-slate-800/80 bg-slate-900/40 flex items-center gap-2 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setFinalizedModalFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    finalizedModalFilter === 'all'
                      ? 'bg-emerald-500 text-black font-bold shadow-md'
                      : 'bg-slate-800 text-gray-400 hover:text-white'
                  }`}
                >
                  All Finalized ({finalizedDocuments.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFinalizedModalFilter('executed')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    finalizedModalFilter === 'executed'
                      ? 'bg-emerald-500 text-black font-bold shadow-md'
                      : 'bg-slate-800 text-gray-400 hover:text-white'
                  }`}
                >
                  Executed ({finalizedDocuments.filter(d => d.normalizedStatus === 'executed').length})
                </button>
                <button
                  type="button"
                  onClick={() => setFinalizedModalFilter('completed')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    finalizedModalFilter === 'completed'
                      ? 'bg-emerald-500 text-black font-bold shadow-md'
                      : 'bg-slate-800 text-gray-400 hover:text-white'
                  }`}
                >
                  Completed ({finalizedDocuments.filter(d => d.normalizedStatus === 'completed').length})
                </button>
              </div>

              {/* Modal Content / Document List Grouped by Company */}
              <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
                {(() => {
                  const filtered = finalizedDocuments.filter(doc => {
                    if (finalizedModalFilter === 'executed') return doc.normalizedStatus === 'executed';
                    if (finalizedModalFilter === 'completed') return doc.normalizedStatus === 'completed';
                    return true;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="py-12 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                          <ShieldCheck size={24} />
                        </div>
                        <h3 className="text-base font-bold text-white">No finalized documents in this category</h3>
                        <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                          No executed or completed documents in this selection.
                        </p>
                      </div>
                    );
                  }

                  // Group contracts by company
                  const groups = {};
                  filtered.forEach(doc => {
                    const companyKey = (doc.companyName || doc.company_name || doc.client_name || doc.client_company_name || 'Client Contract').trim();
                    if (!groups[companyKey]) {
                      groups[companyKey] = {
                        companyName: companyKey,
                        clientEmail: doc.client_email || '',
                        signatoryName: doc.signatory_name || '',
                        documents: []
                      };
                    }
                    if (!groups[companyKey].clientEmail && doc.client_email) {
                      groups[companyKey].clientEmail = doc.client_email;
                    }
                    if (!groups[companyKey].signatoryName && doc.signatory_name) {
                      groups[companyKey].signatoryName = doc.signatory_name;
                    }
                    groups[companyKey].documents.push(doc);
                  });
                  const companyGroups = Object.values(groups);

                  return companyGroups.map((group, gIdx) => {
                    const docCount = group.documents.length;

                    return (
                      <div
                        key={group.companyName + gIdx}
                        className="rounded-2xl border border-slate-800 bg-slate-900/80 hover:border-slate-700 transition-all shadow-md overflow-hidden flex flex-col md:flex-row items-stretch"
                      >
                        {/* Left Column: Company Info */}
                        <div className="w-full md:w-64 lg:w-72 shrink-0 p-4 sm:p-5 flex flex-col justify-center items-start bg-white/[0.02] border-b md:border-b-0 md:border-r border-slate-800/80">
                          <div className="flex items-center gap-3 mb-2 w-full">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.15)]">
                              <Building2 size={20} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight leading-snug break-words">
                                {group.companyName}
                              </h3>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-300 uppercase tracking-wider">
                                  <Layers size={11} />
                                  <span>{docCount} {docCount === 1 ? 'Document' : 'Documents'}</span>
                                </span>
                              </div>
                            </div>
                          </div>

                          {(group.signatoryName || group.clientEmail) && (
                            <div className="mt-1.5 text-xs text-gray-400 space-y-0.5 pl-0.5">
                              {group.signatoryName && (
                                <div className="text-gray-300 font-medium truncate text-[11.5px]">
                                  {group.signatoryName}
                                </div>
                              )}
                              {group.clientEmail && (
                                <div className="text-gray-500 font-mono text-[10.5px] truncate flex items-center gap-1">
                                  <User size={10} className="text-gray-500 shrink-0" />
                                  <span className="truncate">{group.clientEmail}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Right Section: Associated Documents Stack */}
                        <div className="flex-1 flex flex-col justify-center divide-y divide-slate-800/60">
                          {group.documents.map((doc, dIdx) => {
                            const action = getActionNeeded(doc.normalizedStatus);

                            return (
                              <div
                                key={doc.id || dIdx}
                                className="p-4 sm:p-5 flex flex-col gap-3 hover:bg-white/[0.015] transition-colors"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                  <div className="flex items-center gap-2.5 flex-wrap">
                                    {getDocTypeBadge(doc.docType)}
                                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                      <Calendar size={12} className="text-gray-500 shrink-0" />
                                      <span>{formatDateTime(doc.createdAt)}</span>
                                    </div>
                                    <span className="text-[10px] text-gray-500 font-mono">
                                      ID: {doc.id ? String(doc.id).slice(0, 8) : 'N/A'}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                                    {renderStatusBadge(doc.normalizedStatus)}
                                    <button
                                      type="button"
                                      onClick={() => handleOpenDocPreview(doc)}
                                      className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 shadow-sm cursor-pointer bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30"
                                      title="View Signed Document"
                                    >
                                      <Eye size={13} />
                                      <span>View Signed</span>
                                    </button>
                                  </div>
                                </div>

                                <div className={`rounded-xl border p-2.5 sm:p-3 ${action.color} flex items-start gap-2.5`}>
                                  <Zap size={15} className="shrink-0 mt-0.5" />
                                  <div>
                                    <div className="font-bold text-xs uppercase tracking-wide">
                                      {action.title}
                                    </div>
                                    <div className="text-[11px] opacity-90 mt-0.5 leading-relaxed">
                                      {action.description}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between gap-4">
                <span className="text-xs text-gray-400">
                  Showing {finalizedDocuments.length} finalized {finalizedDocuments.length === 1 ? 'document' : 'documents'}
                </span>

                <button
                  type="button"
                  onClick={() => setShowFinalizedModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white transition-all cursor-pointer"
                >
                  Close Pop-up
                </button>
              </div>
            </motion.div>
          </div>,
          document.body
        )}

        {/* 4. Large Professional Document Viewer Modal */}
        {previewModal.isOpen && createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-5 overflow-hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewModal({ isOpen: false, url: '', title: '', isSigned: false, docType: '', companyName: '', status: '' })}
              className="fixed inset-0 bg-black/85 backdrop-blur-md"
            />

            {/* Modal Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className={`relative bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl z-10 overflow-hidden flex flex-col transition-all duration-300 ${
                isPreviewFullScreen ? 'w-full h-full rounded-none' : 'w-full max-w-5xl h-[88vh]'
              }`}
            >
              {/* Header */}
              <div className="px-5 py-4 bg-slate-950/90 border-b border-white/10 flex items-center justify-between gap-3 shrink-0 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-xl border shrink-0 ${
                    previewModal.isSigned 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.2)]' 
                      : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                  }`}>
                    <FileText size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-white text-sm sm:text-base truncate">
                        {previewModal.companyName}
                      </h3>
                      {getDocTypeBadge(previewModal.docType)}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        previewModal.isSigned 
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm' 
                          : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      }`}>
                        {previewModal.isSigned ? '✓ Signed Document' : 'Generated Document'}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 truncate mt-0.5">
                      {previewModal.title}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Open in new tab */}
                  {previewModal.url && (
                    <a
                      href={previewModal.url.replace('/preview', '/view')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Open in new tab"
                    >
                      <ExternalLink size={13} />
                      <span className="hidden sm:inline">Open in Tab</span>
                    </a>
                  )}

                  {/* Fullscreen toggle */}
                  <button
                    type="button"
                    onClick={() => setIsPreviewFullScreen(!isPreviewFullScreen)}
                    className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                    title={isPreviewFullScreen ? "Exit Fullscreen" : "Fullscreen"}
                  >
                    {isPreviewFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  </button>

                  {/* Close modal */}
                  <button
                    type="button"
                    onClick={() => setPreviewModal({ isOpen: false, url: '', title: '', isSigned: false, docType: '', companyName: '', status: '' })}
                    className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                    title="Close Preview"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Modal Iframe Content / Preview Body */}
              <div className="flex-1 w-full h-full bg-slate-950 relative overflow-hidden flex items-center justify-center">
                {previewModal.url ? (
                  <iframe
                    src={previewModal.url}
                    className="w-full h-full border-none bg-white"
                    title={previewModal.title}
                    allow="autoplay"
                  />
                ) : (
                  <div className="p-8 text-center max-w-md">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto mb-3">
                      <FileText size={26} />
                    </div>
                    <h4 className="text-base font-bold text-white">No Document File Attached</h4>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                      This contract record does not have a direct file or drive URL linked in the database.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>,
          document.body
        )}
      </motion.div>
    </div>
  );
}

