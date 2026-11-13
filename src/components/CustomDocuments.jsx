import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Files,
  FileText,
  Plus,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Trash2,
  Edit3,
  Loader2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  Eye,
  RefreshCw,
  Sliders,
  UserCheck,
  Building2,
  Check,
  X,
  Calendar,
  Hash,
  AlignLeft,
  Zap,
  CheckSquare,
  Square,
  FileCheck,
  Archive,
  ArchiveRestore
} from 'lucide-react';
import { getSupabaseClient } from '../lib/supabaseClient';

const WEBHOOK_BASE = 'https://n8n.srv1711190.hstgr.cloud/webhook';
const CONVERT_URL = `${WEBHOOK_BASE}/template-convert`;
const SAVE_URL = `${WEBHOOK_BASE}/template-save`;
const GENERATE_URL = `${WEBHOOK_BASE}/generate-custom-doc`;

// Palette of distinct, high-contrast colors for highlights & field badges
const FIELD_COLORS = [
  { bg: 'bg-cyan-500/20', text: 'text-cyan-300', border: 'border-cyan-400/50', badge: 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/40' },
  { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-400/50', badge: 'bg-purple-500/30 text-purple-200 border border-purple-400/40' },
  { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-400/50', badge: 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40' },
  { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-400/50', badge: 'bg-amber-500/30 text-amber-200 border border-amber-400/40' },
  { bg: 'bg-rose-500/20', text: 'text-rose-300', border: 'border-rose-400/50', badge: 'bg-rose-500/30 text-rose-200 border border-rose-400/40' },
  { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-400/50', badge: 'bg-blue-500/30 text-blue-200 border border-blue-400/40' },
  { bg: 'bg-indigo-500/20', text: 'text-indigo-300', border: 'border-indigo-400/50', badge: 'bg-indigo-500/30 text-indigo-200 border border-indigo-400/40' },
  { bg: 'bg-pink-500/20', text: 'text-pink-300', border: 'border-pink-400/50', badge: 'bg-pink-500/30 text-pink-200 border border-pink-400/40' },
  { bg: 'bg-teal-500/20', text: 'text-teal-300', border: 'border-teal-400/50', badge: 'bg-teal-500/30 text-teal-200 border border-teal-400/40' },
  { bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-400/50', badge: 'bg-orange-500/30 text-orange-200 border border-orange-400/40' }
];

const getFieldColor = (index) => FIELD_COLORS[index % FIELD_COLORS.length];

// Safely normalize JSON or array data
const normalizeArray = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

// Normalize and clean document preview URL for iframe embedding
const getCleanPreviewUrl = (url) => {
  if (!url) return '';
  let clean = url.trim();
  if (clean.startsWith('[')) clean = clean.substring(1);
  if (clean.endsWith(']')) clean = clean.substring(0, clean.length - 1);
  if (clean.includes('drive.google.com/file/d/')) {
    clean = clean.replace('/view', '/preview');
  } else if (clean.includes('docs.google.com/document/d/')) {
    clean = clean.replace(/\/edit.*$/, '/preview').replace(/\/view.*$/, '/preview');
    if (!clean.includes('/preview')) {
      clean = `${clean.replace(/\/$/, '')}/preview`;
    }
  }
  return clean;
};

// Computes uppercase snake_case doc_type_key, replacing non-alphanumeric runs with single underscores,
// trimming underscores at the ends, and ensuring "NDA" or "SLA" becomes "NDA_TEMPLATE" or "SLA_TEMPLATE".
const computeDocTypeKey = (name) => {
  if (!name || typeof name !== 'string') return '';
  let key = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (key === 'NDA' || key === 'SLA') {
    key += '_TEMPLATE';
  }
  return key;
};

export default function CustomDocuments({ onShowToast, onNavigateToApprovals }) {
  // Views: 'list' | 'upload' | 'review' | 'generate'
  const [viewMode, setViewMode] = useState('list');

  // Templates list state
  const [templates, setTemplates] = useState([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [templatesError, setTemplatesError] = useState(null);
  const [isTogglingActive, setIsTogglingActive] = useState({});

  // Handler: Archive or Reactivate template
  const handleToggleTemplateActive = async (template) => {
    if (!template || !template.id) return;

    const newActiveState = template.is_active === false ? true : false;
    const templateId = template.id;

    setIsTogglingActive(prev => ({ ...prev, [templateId]: true }));

    // Optimistic UI update
    setTemplates(prev =>
      prev.map(t => (t.id === templateId ? { ...t, is_active: newActiveState } : t))
    );

    try {
      const client = getSupabaseClient();
      if (!client) {
        throw new Error('Supabase client is not configured.');
      }

      const { error } = await client
        .from('document_templates')
        .update({ is_active: newActiveState })
        .eq('id', templateId);

      if (error) {
        throw error;
      }

      onShowToast?.(
        newActiveState
          ? `"${template.name || 'Template'}" activated successfully`
          : `"${template.name || 'Template'}" archived successfully`,
        'success'
      );
    } catch (err) {
      console.error('Error toggling template active status:', err);
      // Revert on error
      setTemplates(prev =>
        prev.map(t => (t.id === templateId ? { ...t, is_active: template.is_active } : t))
      );
      onShowToast?.(err.message || 'Failed to update template status in Supabase.', 'error');
    } finally {
      setIsTogglingActive(prev => {
        const next = { ...prev };
        delete next[templateId];
        return next;
      });
    }
  };

  // New Template Upload state
  const [uploadFile, setUploadFile] = useState(null);
  const [templateNameInput, setTemplateNameInput] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [convertError, setConvertError] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Review & Customization state
  const [convertData, setConvertData] = useState(null);
  const [editableTemplateName, setEditableTemplateName] = useState('');
  const [editableDocTypeKey, setEditableDocTypeKey] = useState('');
  const [editableFields, setEditableFields] = useState([]);
  const [editableSigners, setEditableSigners] = useState([]);
  const [acceptedSuggestions, setAcceptedSuggestions] = useState({});
  const [reviewTab, setReviewTab] = useState('fields'); // 'fields' | 'signers' | 'suggestions'
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [isWarningsDismissed, setIsWarningsDismissed] = useState(false);

  // Generate flow state
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [generateFormValues, setGenerateFormValues] = useState({});
  const [signerFormValues, setSignerFormValues] = useState({});
  const [companyNameValue, setCompanyNameValue] = useState('');
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const [generateError, setGenerateError] = useState(null);
  const [generationResult, setGenerationResult] = useState(null);
  const [previewModalState, setPreviewModalState] = useState({
    isOpen: false,
    url: '',
    rawUrl: '',
    title: ''
  });
  const [isIframeLoading, setIsIframeLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);

  const openDocPreview = (rawUrl, title) => {
    if (!rawUrl) return;
    const cleanUrl = getCleanPreviewUrl(rawUrl);
    setPreviewModalState({
      isOpen: true,
      url: cleanUrl,
      rawUrl: rawUrl,
      title: title || 'Custom Document Preview'
    });
    setIsIframeLoading(true);
    setIframeError(false);
  };

  const closePreviewModal = () => {
    setPreviewModalState({
      isOpen: false,
      url: '',
      rawUrl: '',
      title: ''
    });
    setIsIframeLoading(true);
    setIframeError(false);
  };

  // Close modal on Escape key press
  useEffect(() => {
    if (!previewModalState.isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closePreviewModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewModalState.isOpen]);

  // Fallback timeout: if iframe doesn't finish loading within 12s (e.g. blocked by CSP)
  useEffect(() => {
    if (!previewModalState.isOpen) return;
    const timer = setTimeout(() => {
      setIsIframeLoading(prev => {
        if (prev) {
          setIframeError(true);
          return false;
        }
        return prev;
      });
    }, 12000);
    return () => clearTimeout(timer);
  }, [previewModalState.isOpen, previewModalState.url]);

  // Load templates from Supabase
  const loadTemplates = async () => {
    setIsLoadingTemplates(true);
    setTemplatesError(null);
    try {
      const client = getSupabaseClient();
      if (!client) {
        // Fallback placeholder notice if Supabase credentials are empty
        setTemplates([]);
        setIsLoadingTemplates(false);
        return;
      }

      const { data, error } = await client
        .from('document_templates')
        .select('id, name, doc_type_key, drive_template_id, fields, signers, is_active');

      if (error) {
        console.warn('Error fetching document_templates:', error);
        setTemplatesError(error.message || 'Failed to fetch templates.');
        setTemplates([]);
      } else {
        const parsed = (data || []).map(t => ({
          ...t,
          fields: normalizeArray(t.fields),
          signers: normalizeArray(t.signers)
        }));
        setTemplates(parsed);
      }
    } catch (err) {
      console.error('Exception loading templates:', err);
      setTemplatesError(err.message || 'Error connecting to database.');
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  // Handler: Start New Template flow
  const handleStartNewTemplate = () => {
    setUploadFile(null);
    setTemplateNameInput('');
    setConvertError(null);
    setIsConverting(false);
    setViewMode('upload');
  };

  // Handler: File selection & validation
  const handleFileChange = (file) => {
    if (!file) return;
    setConvertError(null);

    // Validate type (.docx or .pdf)
    const validExtensions = ['.docx', '.pdf'];
    const lowerName = file.name.toLowerCase();
    const isValidType = validExtensions.some(ext => lowerName.endsWith(ext));
    if (!isValidType) {
      setConvertError('Invalid file type. Please upload a .docx or .pdf document.');
      return;
    }

    // Validate size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setConvertError('File size exceeds the 10 MB limit. Please choose a smaller file.');
      return;
    }

    setUploadFile(file);
    if (!templateNameInput.trim()) {
      // Auto-populate template name from file name without extension
      const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setTemplateNameInput(baseName.charAt(0).toUpperCase() + baseName.slice(1));
    }
  };

  // Helper: Read file as base64 without data: prefix
  const readFileAsBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === 'string') {
          const base64Data = result.includes(',') ? result.split(',')[1] : result;
          resolve(base64Data);
        } else {
          reject(new Error('Failed to read file as base64 text.'));
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  // Handler: Submit template convert
  const handleConvertTemplate = async (e) => {
    e?.preventDefault();
    if (!uploadFile) {
      setConvertError('Please select a .docx or .pdf file to upload.');
      return;
    }

    setIsConverting(true);
    setConvertError(null);

    try {
      const base64Data = await readFileAsBase64(uploadFile);
      const payload = {
        file_name: uploadFile.name,
        file_base64: base64Data,
        template_name: templateNameInput.trim() || uploadFile.name.replace(/\.[^/.]+$/, '')
      };

      const response = await fetch(CONVERT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Webhook error (${response.status}): ${response.statusText}`);
      }

      let data;
      try {
        data = await response.json();
      } catch (jsonErr) {
        throw new Error('Received invalid JSON response from conversion service.');
      }

      if (Array.isArray(data) && data.length > 0) {
        data = data[0];
      }

      if (data?.status !== 'ok') {
        throw new Error(data?.message || data?.error || 'Template conversion failed. Status was not ok.');
      }

      // Initialize review screen data
      setConvertData(data);
      setIsWarningsDismissed(false);
      const initialName = data.template?.name || templateNameInput || 'Custom Template';
      setEditableTemplateName(initialName);
      setEditableDocTypeKey(data.template?.doc_type_key ? computeDocTypeKey(data.template.doc_type_key) : computeDocTypeKey(initialName));

      // Normalize fields with occurrences
      const rawFields = normalizeArray(data.fields);
      const rawHighlights = normalizeArray(data.highlights);
      setEditableFields(rawFields.map(f => {
        const fieldKey = f.key || `field_${Math.random().toString(36).substr(2, 6)}`;
        let occs = normalizeArray(f.occurrences);
        if (occs.length === 0 && rawHighlights.length > 0) {
          occs = rawHighlights
            .filter(h => (h.field_key || h.fieldKey || h.key) === fieldKey)
            .map(h => ({
              paragraph: h.paragraph,
              offset: h.offset,
              length: h.length,
              text: h.text || ''
            }));
        }
        return {
          key: fieldKey,
          label: f.label || f.key || 'Field',
          type: f.type || 'text',
          required: f.required !== false,
          example: f.example || '',
          occurrences: occs
        };
      }));

      // Normalize signers
      const rawSigners = normalizeArray(data.signers);
      setEditableSigners(rawSigners.map(s => ({
        id: s.id || `signer_${Math.random().toString(36).substr(2, 6)}`,
        label: s.label || 'Signer',
        signature_paragraph: s.signature_paragraph ?? null,
        date_paragraph: s.date_paragraph ?? null,
        name_field_key: s.name_field_key || ''
      })));

      // Initialize wording suggestions (default all accepted)
      const suggestions = normalizeArray(data.wording_suggestions);
      const initialAccepted = {};
      suggestions.forEach((_, idx) => {
        initialAccepted[idx] = true;
      });
      setAcceptedSuggestions(initialAccepted);

      onShowToast?.('Template converted successfully! Review and configure fields.', 'success');
      setViewMode('review');
    } catch (err) {
      console.error('Error during template conversion:', err);
      setConvertError(err.message || 'An error occurred during template conversion.');
      onShowToast?.(err.message || 'Failed to convert template.', 'error');
    } finally {
      setIsConverting(false);
    }
  };

  // Review handlers: Field manipulations
  const handleUpdateField = (index, updates) => {
    setEditableFields(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const handleRemoveField = (index) => {
    setEditableFields(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateSigner = (index, updates) => {
    setEditableSigners(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const handleRemoveSigner = (index) => {
    if (editableSigners.length <= 1) return;
    setEditableSigners(prev => prev.filter((_, i) => i !== index));
  };

  const handleToggleSuggestion = (index) => {
    setAcceptedSuggestions(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Handler: Save Template
  const handleSaveTemplate = async () => {
    if (!convertData?.template) return;

    if (!editableTemplateName.trim()) {
      onShowToast?.('Please specify a template name before saving.', 'error');
      return;
    }

    setIsSavingTemplate(true);
    setSaveError(null);

    try {
      const suggestionsList = normalizeArray(convertData.wording_suggestions);
      const acceptedList = suggestionsList
        .filter((_, idx) => acceptedSuggestions[idx])
        .map(s => ({
          paragraph: s.paragraph ?? 0,
          find: s.find || s.original_text || s.original || '',
          suggested_text: s.suggested_text || s.replacement || s.suggestion || ''
        }));

      const docTypeKeyToSend = editableDocTypeKey || computeDocTypeKey(editableTemplateName.trim()) || convertData.template.doc_type_key || 'CUSTOM_TEMPLATE';

      const payload = {
        drive_template_id: convertData.template.drive_template_id,
        revision_id: convertData.template.revision_id,
        name: editableTemplateName.trim(),
        doc_type_key: docTypeKeyToSend,
        fields: editableFields.map(f => ({
          key: f.key,
          label: f.label,
          type: f.type,
          required: Boolean(f.required),
          example: f.example || '',
          occurrences: f.occurrences || []
        })),
        signers: editableSigners.map(s => ({
          id: s.id,
          label: s.label,
          signature_paragraph: s.signature_paragraph,
          date_paragraph: s.date_paragraph,
          name_field_key: s.name_field_key
        })),
        accepted_suggestions: acceptedList
      };

      console.log('Template-save exact payload:', payload);

      const response = await fetch(SAVE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      let resData = null;
      let rawText = '';
      try {
        rawText = await response.text();
        try {
          resData = JSON.parse(rawText);
        } catch {
          resData = rawText;
        }
      } catch (readErr) {
        console.warn('Could not read response text:', readErr);
      }

      console.log('Template-save server response:', { status: response.status, data: resData });

      if (Array.isArray(resData) && resData.length > 0) {
        resData = resData[0];
      }

      // Helper to pull the most descriptive error message
      const extractError = (data, fallback) => {
        if (!data) return fallback;
        if (typeof data === 'string' && data.trim()) return data.trim();
        if (typeof data.message === 'string' && data.message.trim()) return data.message.trim();
        if (typeof data.errorMessage === 'string' && data.errorMessage.trim()) return data.errorMessage.trim();
        if (typeof data.details === 'string' && data.details.trim()) return data.details.trim();
        if (typeof data.reason === 'string' && data.reason.trim()) return data.reason.trim();
        if (typeof data.description === 'string' && data.description.trim()) return data.description.trim();
        if (typeof data.msg === 'string' && data.msg.trim()) return data.msg.trim();
        if (data.error) {
          if (typeof data.error === 'string' && data.error.trim()) return data.error.trim();
          if (typeof data.error === 'object') {
            return data.error.message || data.error.details || data.error.reason || JSON.stringify(data.error);
          }
        }
        return fallback;
      };

      if (!response.ok) {
        const errorMsg = extractError(resData, `Save failed with status ${response.status}: ${response.statusText}`);
        throw new Error(errorMsg);
      }

      // Check for success or error statuses
      const statusStr = typeof resData?.status === 'string' ? resData.status.toLowerCase().trim() : '';
      const isExplicitSuccess = ['ok', 'saved', 'success', 'created', 'done', 'completed'].includes(statusStr) || resData?.success === true;
      const isExplicitFailure = ['error', 'failed', 'failure', 'rejected'].includes(statusStr) || resData?.success === false;

      if (isExplicitFailure || (statusStr && !isExplicitSuccess)) {
        const fallbackMsg = statusStr
          ? `Server returned status "${resData.status}" while saving the template.`
          : 'Server reported an error saving the template.';
        throw new Error(extractError(resData, fallbackMsg));
      }

      onShowToast?.('Template saved successfully!', 'success');
      await loadTemplates();
      setViewMode('list');
    } catch (err) {
      console.error('Error saving template:', err);
      setSaveError(err.message || 'Failed to save template. Please try again.');
      onShowToast?.(err.message || 'Failed to save template.', 'error');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  // Handler: Start Generate flow for a selected template
  const handleStartGenerate = (template) => {
    setSelectedTemplate(template);
    setGenerateError(null);
    setGenerationResult(null);
    setCompanyNameValue('');

    // Pre-populate fields
    const initialFieldVals = {};
    const tFields = normalizeArray(template.fields);
    tFields.forEach(f => {
      initialFieldVals[f.key] = '';
    });
    setGenerateFormValues(initialFieldVals);

    // Pre-populate signers
    const initialSignerVals = {};
    const tSigners = normalizeArray(template.signers);
    tSigners.forEach(s => {
      initialSignerVals[s.id] = { name: '', email: '' };
    });
    setSignerFormValues(initialSignerVals);

    setViewMode('generate');
  };

  // Handler: Submit Generate Custom Doc
  const handleGenerateSubmit = async (e) => {
    e?.preventDefault();
    if (!selectedTemplate) return;

    // Validate required fields
    const tFields = normalizeArray(selectedTemplate.fields);
    for (const field of tFields) {
      if (field.required) {
        const val = generateFormValues[field.key];
        if (val === undefined || val === null || String(val).trim() === '') {
          onShowToast?.(`Please fill in required field: ${field.label || field.key}`, 'error');
          return;
        }
      }
    }

    // Validate signers
    const tSigners = normalizeArray(selectedTemplate.signers);
    for (const signer of tSigners) {
      const sVals = signerFormValues[signer.id] || {};
      if (!sVals.name?.trim() || !sVals.email?.trim()) {
        onShowToast?.(`Please enter Name and Email for ${signer.label || 'Signer'}`, 'error');
        return;
      }
    }

    setIsGeneratingDoc(true);
    setGenerateError(null);

    try {
      const signersPayload = tSigners.map(s => ({
        id: s.id,
        name: (signerFormValues[s.id]?.name || '').trim(),
        email: (signerFormValues[s.id]?.email || '').trim()
      }));

      const payload = {
        template_id: selectedTemplate.id,
        field_values: generateFormValues,
        signers: signersPayload,
        company_name: companyNameValue.trim() || undefined
      };

      const response = await fetch(GENERATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Generation failed with status ${response.status}: ${response.statusText}`);
      }

      let resData = await response.json();
      if (Array.isArray(resData) && resData.length > 0) {
        resData = resData[0];
      }

      if (resData?.status !== 'created' && !resData?.doc_url && !resData?.contract_id) {
        throw new Error(resData?.message || resData?.error || 'Document generation failed.');
      }

      setGenerationResult({
        contract_id: resData.contract_id || resData.id,
        doc_url: resData.doc_url || resData.drive_file_url,
        doc_name: resData.doc_name || selectedTemplate.name
      });

      onShowToast?.('Document generated successfully!', 'success');
    } catch (err) {
      console.error('Error generating custom document:', err);
      setGenerateError(err.message || 'Failed to generate custom document.');
      onShowToast?.(err.message || 'Generation failed.', 'error');
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  // Helper to render paragraph with highlighted field occurrences
  // Each highlight has {field_key, paragraph, offset, length}, where paragraph matches
  // the p property of an item in the paragraphs array (not array index, may not start at 0).
  const renderParagraphWithHighlights = (pText, pVal) => {
    if (!pText) return null;

    const occurrences = [];
    const seenSpans = new Set();

    // 1. Check highlights from convertData.highlights
    const rawHighlights = normalizeArray(convertData?.highlights);
    rawHighlights.forEach(h => {
      const hPara = h.paragraph;
      if (hPara === undefined || hPara === null) return;
      if (hPara !== pVal && String(hPara) !== String(pVal)) return;

      const fIdx = editableFields.findIndex(f => f.key === (h.field_key || h.fieldKey || h.key));
      if (fIdx === -1) return; // Field was removed by the user

      const field = editableFields[fIdx];
      let start = Number(h.offset);
      let len = Number(h.length) || (h.text ? h.text.length : 0);

      // Validation / fallback if offset is invalid
      if (isNaN(start) || start < 0 || start >= pText.length) {
        if (h.text && pText.includes(h.text)) {
          start = pText.indexOf(h.text);
          len = h.text.length;
        } else {
          return;
        }
      }

      const end = Math.min(pText.length, start + len);
      const spanKey = `${field.key}_${start}_${end}`;
      if (!seenSpans.has(spanKey)) {
        seenSpans.add(spanKey);
        occurrences.push({
          start,
          end,
          text: h.text || pText.slice(start, end),
          field,
          fieldIndex: fIdx + 1
        });
      }
    });

    // 2. Also check editableFields[].occurrences
    editableFields.forEach((field, fIdx) => {
      const occs = normalizeArray(field.occurrences);
      occs.forEach(occ => {
        const occPara = occ.paragraph;
        if (occPara === undefined || occPara === null) return;
        if (occPara !== pVal && String(occPara) !== String(pVal)) return;

        let start = Number(occ.offset);
        let len = Number(occ.length) || (occ.text ? occ.text.length : 0);

        // Validation / fallback if offset is invalid
        if (isNaN(start) || start < 0 || start >= pText.length) {
          if (occ.text && pText.includes(occ.text)) {
            start = pText.indexOf(occ.text);
            len = occ.text.length;
          } else {
            return;
          }
        }

        const end = Math.min(pText.length, start + len);
        const spanKey = `${field.key}_${start}_${end}`;
        if (!seenSpans.has(spanKey)) {
          seenSpans.add(spanKey);
          occurrences.push({
            start,
            end,
            text: occ.text || pText.slice(start, end),
            field,
            fieldIndex: fIdx + 1
          });
        }
      });
    });

    if (occurrences.length === 0) {
      return <span>{pText}</span>;
    }

    occurrences.sort((a, b) => a.start - b.start);

    // Keep non-overlapping matches
    const nonOverlapping = [];
    let lastEnd = 0;
    for (const occ of occurrences) {
      if (occ.start >= lastEnd) {
        nonOverlapping.push(occ);
        lastEnd = occ.end;
      }
    }

    const parts = [];
    let currentIdx = 0;

    nonOverlapping.forEach((occ, i) => {
      if (occ.start > currentIdx) {
        parts.push(
          <span key={`txt-${i}`}>{pText.slice(currentIdx, occ.start)}</span>
        );
      }
      const color = getFieldColor(occ.fieldIndex - 1);
      parts.push(
        <mark
          key={`mark-${i}`}
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${color.bg} ${color.text} ${color.border} font-medium mx-0.5 align-middle`}
          title={`Field #${occ.fieldIndex}: ${occ.field.label} (${occ.field.key})`}
        >
          <span>{pText.slice(occ.start, occ.end)}</span>
          <span className={`text-[10px] px-1 py-0.2 rounded font-mono font-bold ${color.badge}`}>
            #{occ.fieldIndex}
          </span>
        </mark>
      );
      currentIdx = occ.end;
    });

    if (currentIdx < pText.length) {
      parts.push(
        <span key="txt-tail">{pText.slice(currentIdx)}</span>
      );
    }

    return <>{parts}</>;
  };

  // Convert paragraphs list, preserving p property and paragraph text
  const paragraphsList = useMemo(() => {
    if (!convertData?.paragraphs) return [];
    return normalizeArray(convertData.paragraphs).map((p, idx) => {
      if (typeof p === 'string') {
        return { p: idx, text: p };
      }
      const pVal = p?.p !== undefined && p?.p !== null ? p.p : idx;
      let text = '';
      if (typeof p?.text === 'string') {
        text = p.text;
      } else if (typeof p?.content === 'string') {
        text = p.content;
      } else if (typeof p?.paragraph === 'string') {
        text = p.paragraph;
      } else if (typeof p?.value === 'string') {
        text = p.value;
      } else if (p?.text !== undefined && p?.text !== null) {
        text = String(p.text);
      } else {
        text = String(p || '');
      }
      return { p: pVal, text };
    });
  }, [convertData]);

  // Convert notes and warnings
  const notesList = useMemo(() => {
    if (!convertData?.notes) return [];
    return normalizeArray(convertData.notes);
  }, [convertData]);

  const warningsList = useMemo(() => {
    if (!convertData?.warnings || isWarningsDismissed) return [];
    return normalizeArray(convertData.warnings).filter(w => {
      const str = typeof w === 'string' ? w : (w?.message || w?.warning || JSON.stringify(w));
      // Automatically suppress warnings about ScalePods having signed / pre-signed
      if (/scales*pods/i.test(str) && /(sign|already|executed)/i.test(str)) {
        return false;
      }
      return true;
    });
  }, [convertData, isWarningsDismissed]);

  const wordingSuggestionsList = useMemo(() => {
    if (!convertData?.wording_suggestions) return [];
    return normalizeArray(convertData.wording_suggestions);
  }, [convertData]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 md:py-12">
      {/* View 1: Templates List */}
      {viewMode === 'list' && (
        <div className="space-y-8">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
                <Files className="text-glow" size={30} />
                Custom Document Templates
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                Upload DOCX/PDF templates, configure dynamic variables, and generate signature-ready documents.
              </p>
            </div>
            <div className="flex items-center gap-3 self-stretch sm:self-auto">
              <button
                onClick={loadTemplates}
                disabled={isLoadingTemplates}
                className="px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white flex items-center gap-2 text-sm font-medium transition-all cursor-pointer"
                title="Refresh templates"
              >
                <RefreshCw size={16} className={isLoadingTemplates ? 'animate-spin text-glow' : ''} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button
                onClick={handleStartNewTemplate}
                className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-gradient-to-r from-glow via-cyan-400 to-blue-600 text-dark font-semibold text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,243,255,0.3)] hover:shadow-[0_0_30px_rgba(0,243,255,0.5)] transition-all cursor-pointer"
              >
                <Plus size={18} className="stroke-[2.5]" />
                New Template
              </button>
            </div>
          </div>

          {/* Error notice if loading failed */}
          {templatesError && (
            <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 flex items-center gap-3 text-sm">
              <AlertCircle size={20} className="text-rose-400 shrink-0" />
              <span>{templatesError}</span>
            </div>
          )}

          {/* Loading state */}
          {isLoadingTemplates ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(n => (
                <div key={n} className="glass-panel p-6 rounded-2xl animate-pulse space-y-4">
                  <div className="h-6 bg-white/10 rounded-md w-3/4" />
                  <div className="h-4 bg-white/5 rounded-md w-1/2" />
                  <div className="pt-4 flex gap-2">
                    <div className="h-9 bg-white/10 rounded-lg flex-1" />
                    <div className="h-9 bg-white/5 rounded-lg flex-1" />
                  </div>
                </div>
              ))}
            </div>
          ) : templates.length === 0 ? (
            /* Empty State */
            <div className="glass-panel p-12 rounded-3xl text-center flex flex-col items-center max-w-xl mx-auto my-8 border border-white/10">
              <div className="w-16 h-16 rounded-2xl bg-glow/10 border border-glow/30 flex items-center justify-center mb-5 text-glow shadow-[0_0_30px_rgba(0,243,255,0.15)]">
                <UploadCloud size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No Document Templates Yet</h3>
              <p className="text-gray-400 text-sm mb-6 max-w-md">
                Upload your company's contracts, engagement letters, or custom agreements in .docx or .pdf format to convert them into reusable smart templates.
              </p>
              <button
                onClick={handleStartNewTemplate}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-glow to-blue-600 text-dark font-semibold text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(0,243,255,0.3)] hover:shadow-[0_0_30px_rgba(0,243,255,0.5)] transition-all cursor-pointer"
              >
                <Plus size={18} />
                Upload First Template
              </button>
            </div>
          ) : (
            /* Templates Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map(tpl => {
                const fieldsCount = Array.isArray(tpl.fields) ? tpl.fields.length : 0;
                const signersCount = Array.isArray(tpl.signers) ? tpl.signers.length : 0;

                return (
                  <motion.div
                    key={tpl.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`glass-panel p-6 rounded-2xl border transition-all duration-300 flex flex-col justify-between group shadow-lg relative overflow-hidden ${
                      tpl.is_active === false
                        ? 'border-dashed border-white/15 bg-white/[0.02] opacity-80'
                        : 'border-white/10 hover:border-glow/40 hover:shadow-[0_0_25px_rgba(0,243,255,0.1)]'
                    }`}
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-glow/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div>
                      {/* Badge / Key */}
                      <div className="flex items-center justify-between gap-2 mb-3 min-w-0">
                        <span
                          className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-glow/10 text-glow border border-glow/20 uppercase tracking-wider truncate min-w-0"
                          title={tpl.doc_type_key || 'CUSTOM'}
                        >
                          {tpl.doc_type_key || 'CUSTOM'}
                        </span>
                        {tpl.is_active !== false ? (
                          <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Active
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-400/90 flex items-center gap-1 font-medium shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            Archived
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-lg font-bold text-white group-hover:text-glow transition-colors line-clamp-1 mb-2">
                        {tpl.name || 'Untitled Template'}
                      </h3>

                      {/* Metrics */}
                      <div className="flex items-center gap-4 text-xs text-gray-400 mb-6">
                        <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
                          <Sliders size={13} className="text-cyan-400" />
                          <strong className="text-white">{fieldsCount}</strong> {fieldsCount === 1 ? 'field' : 'fields'}
                        </span>
                        <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
                          <UserCheck size={13} className="text-purple-400" />
                          <strong className="text-white">{signersCount}</strong> {signersCount === 1 ? 'signer' : 'signers'}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-4 border-t border-white/5">
                      <button
                        onClick={() => handleStartGenerate(tpl)}
                        disabled={tpl.is_active === false}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                          tpl.is_active === false
                            ? 'bg-white/5 text-gray-500 border border-white/10 cursor-not-allowed opacity-50'
                            : 'bg-gradient-to-r from-glow to-blue-600 text-dark shadow-[0_0_15px_rgba(0,243,255,0.2)] hover:shadow-[0_0_25px_rgba(0,243,255,0.4)] cursor-pointer'
                        }`}
                        title={tpl.is_active === false ? 'Template is archived. Reactivate it to generate documents.' : 'Generate contract from template'}
                      >
                        <Zap size={14} className="fill-current" />
                        <span>Generate</span>
                      </button>

                      <button
                        onClick={() => handleToggleTemplateActive(tpl)}
                        disabled={isTogglingActive[tpl.id]}
                        className={`py-2 px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                          tpl.is_active === false
                            ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/35 hover:border-emerald-500/60 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                            : 'bg-white/5 hover:bg-amber-500/15 text-gray-400 hover:text-amber-300 border-white/10 hover:border-amber-500/35'
                        }`}
                        title={tpl.is_active === false ? 'Reactivate this template' : 'Archive / Inactivate this template'}
                      >
                        {isTogglingActive[tpl.id] ? (
                          <Loader2 size={13} className="animate-spin text-glow" />
                        ) : tpl.is_active === false ? (
                          <>
                            <ArchiveRestore size={13} />
                            <span>Activate</span>
                          </>
                        ) : (
                          <>
                            <Archive size={13} />
                            <span>Archive</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={handleStartNewTemplate}
                        className="py-2 px-2.5 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-medium flex items-center gap-1 transition-all cursor-pointer"
                        title="Upload a new template"
                      >
                        <Plus size={13} />
                        <span className="hidden sm:inline">New</span>
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* View 2: Upload Flow (Step 3a & 3b) */}
      {viewMode === 'upload' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl mx-auto space-y-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <button
              onClick={() => setViewMode('list')}
              className="text-gray-400 hover:text-white flex items-center gap-2 text-sm transition-colors cursor-pointer"
            >
              <ArrowLeft size={16} />
              Back to templates
            </button>
            <span className="text-xs text-glow font-mono uppercase tracking-wider">Step 1 of 2: Upload</span>
          </div>

          <div className="glass-panel p-8 sm:p-10 rounded-3xl border border-white/10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-glow to-transparent opacity-60" />

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-glow/10 border border-glow/30 flex items-center justify-center text-glow">
                <UploadCloud size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Upload New Document Template</h2>
                <p className="text-xs text-gray-400">Supported formats: .docx or .pdf (max 10 MB)</p>
              </div>
            </div>

            {/* Error Message */}
            {convertError && (
              <div className="mb-6 p-4 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-200 flex items-center gap-3 text-sm">
                <AlertCircle size={20} className="text-rose-400 shrink-0" />
                <span className="flex-1">{convertError}</span>
                <button onClick={() => setConvertError(null)} className="text-rose-400 hover:text-rose-100">
                  <X size={16} />
                </button>
              </div>
            )}

            <form onSubmit={handleConvertTemplate} className="space-y-6">
              {/* Optional Template Name */}
              <div>
                <label className="label-text flex items-center gap-1.5 font-semibold text-slate-200 mb-1.5">
                  <FileText size={15} className="text-glow" />
                  Template Name <span className="text-gray-500 font-normal text-xs">(optional)</span>
                </label>
                <input
                  type="text"
                  value={templateNameInput}
                  onChange={(e) => setTemplateNameInput(e.target.value)}
                  placeholder="e.g. Master Services Agreement 2026"
                  disabled={isConverting}
                  className="input-field"
                />
              </div>

              {/* Upload Drop Zone */}
              <div>
                <label className="label-text flex items-center gap-1.5 font-semibold text-slate-200 mb-1.5">
                  <UploadCloud size={15} className="text-glow" />
                  Document File (.docx or .pdf) <span className="text-cyan-400">*</span>
                </label>

                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    if (e.dataTransfer.files?.[0]) {
                      handleFileChange(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 ${
                    isDragOver
                      ? 'border-glow bg-glow/10 shadow-[0_0_20px_rgba(0,243,255,0.2)]'
                      : uploadFile
                      ? 'border-emerald-500/50 bg-emerald-500/5'
                      : 'border-white/20 hover:border-white/40 bg-black/20 hover:bg-black/30'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleFileChange(e.target.files[0]);
                      }
                    }}
                    disabled={isConverting}
                  />

                  {uploadFile ? (
                    <div className="flex items-center gap-3 text-left w-full max-w-md p-3 rounded-xl bg-white/5 border border-white/10">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <FileCheck size={22} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{uploadFile.name}</p>
                        <p className="text-xs text-gray-400">{(uploadFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadFile(null);
                        }}
                        disabled={isConverting}
                        className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-white/10"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400">
                        <UploadCloud size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          Click to browse or drag & drop template here
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          DOCX or PDF, up to 10 MB in file size
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Progress / Loading indicator */}
              {isConverting && (
                <div className="p-5 rounded-2xl bg-cyan-950/40 border border-glow/30 flex flex-col gap-2">
                  <div className="flex items-center gap-3 text-glow text-sm font-semibold">
                    <Loader2 size={18} className="animate-spin text-glow shrink-0" />
                    <span>Analyzing document & generating template schema...</span>
                  </div>
                  <p className="text-xs text-gray-400 pl-7 leading-relaxed">
                    AI is detecting variable fields, signers, and contract wording optimizations. This conversion typically takes up to ~2 minutes. Please keep this window open.
                  </p>
                  <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden mt-2">
                    <div className="h-full bg-gradient-to-r from-glow via-cyan-400 to-blue-600 animate-[pulse_1.5s_ease-in-out_infinite] w-full" />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  disabled={isConverting}
                  className="px-5 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 text-sm font-medium transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isConverting || !uploadFile}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-glow to-blue-600 text-dark font-bold text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(0,243,255,0.3)] hover:shadow-[0_0_30px_rgba(0,243,255,0.5)] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  {isConverting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Converting (~2 mins)...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      Convert & Review Template
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      )}

      {/* View 3: Review Screen (Step 3d & 3e) */}
      {viewMode === 'review' && convertData && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {/* Top Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button
                onClick={() => setViewMode('list')}
                className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                title="Back to list"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-glow font-mono uppercase tracking-wider">Step 2 of 2: Review</span>
                  <span className="text-gray-600">•</span>
                  <span className="text-xs text-gray-400">{paragraphsList.length} paragraphs parsed</span>
                </div>
                {/* Editable Template Name */}
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={editableTemplateName}
                    onChange={(e) => {
                      const newName = e.target.value;
                      setEditableTemplateName(newName);
                      setEditableDocTypeKey(computeDocTypeKey(newName));
                    }}
                    className="text-xl md:text-2xl font-bold text-white bg-transparent border-b border-white/20 focus:border-glow outline-none pb-0.5 w-full max-w-md transition-colors"
                    placeholder="Template Name"
                  />
                  <Edit3 size={16} className="text-gray-400 shrink-0" />
                </div>
                {editableDocTypeKey && (
                  <div className="text-[11px] font-mono text-gray-400 mt-1 flex items-center gap-1.5">
                    <span className="text-gray-500 uppercase tracking-wider">Type Key:</span>
                    <span className="text-glow/90 px-1.5 py-0.5 rounded bg-white/5 border border-white/10">{editableDocTypeKey}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Save Template Button */}
            <div className="flex items-center gap-3 self-stretch sm:self-auto">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                disabled={isSavingTemplate}
                className="px-4 py-2 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 text-sm transition-all cursor-pointer"
              >
                Discard
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={isSavingTemplate}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-glow to-blue-600 text-dark font-bold text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(0,243,255,0.3)] hover:shadow-[0_0_30px_rgba(0,243,255,0.5)] disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSavingTemplate ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check size={16} className="stroke-[3]" />
                    Save Template
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Save Error notice */}
          {saveError && (
            <div className="p-4 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-200 flex items-start justify-between gap-3 text-sm">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-rose-300">Template Save Error</div>
                  <div className="text-rose-200">{saveError}</div>
                  {Object.values(acceptedSuggestions).some(Boolean) && (
                    <div className="text-xs text-rose-300/80 pt-1">
                      Tip: If this document was converted from a PDF, text replacements can fail if characters or line breaks differ. Try unchecking suggestions in the &quot;Wording&quot; tab and clicking Save Template again.
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSaveError(null)}
                className="text-rose-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                title="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Warnings Banner (at top) */}
          {warningsList.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-amber-400 text-sm">
                  <AlertTriangle size={18} />
                  <span>Template Warnings ({warningsList.length})</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsWarningsDismissed(true)}
                  className="text-amber-400/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  title="Dismiss warnings"
                >
                  <X size={16} />
                </button>
              </div>
              <ul className="list-disc list-inside text-xs space-y-1 text-amber-300/90 pl-1">
                {warningsList.map((warn, i) => (
                  <li key={i}>{typeof warn === 'string' ? warn : JSON.stringify(warn)}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Notes Banner (at top) */}
          {notesList.length > 0 && (
            <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-500/40 text-blue-200 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-blue-400 text-sm">
                <Info size={18} />
                <span>AI Conversion Notes</span>
              </div>
              <ul className="list-disc list-inside text-xs space-y-1 text-blue-300/90 pl-1">
                {notesList.map((note, i) => (
                  <li key={i}>{typeof note === 'string' ? note : JSON.stringify(note)}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 2-Column Review Layout: Document on left, Inspector on right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Document Paragraphs with Numbered Color Highlights */}
            <div className="lg:col-span-7 glass-panel p-6 rounded-3xl border border-white/10 space-y-4 max-h-[78vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-glow" />
                  <h3 className="font-bold text-white text-base">Document Text & Field Highlights</h3>
                </div>
                <span className="text-xs text-gray-400">
                  {editableFields.length} active {editableFields.length === 1 ? 'variable' : 'variables'}
                </span>
              </div>

              {paragraphsList.length === 0 ? (
                <p className="text-gray-400 text-sm italic">No paragraph text returned.</p>
              ) : (
                <div className="space-y-3.5 text-sm text-gray-200 leading-relaxed font-serif pr-2 select-text">
                  {paragraphsList.map((paraItem, pIdx) => (
                    <p
                      key={paraItem.p !== undefined && paraItem.p !== null ? paraItem.p : pIdx}
                      className="p-2.5 rounded-lg hover:bg-white/[0.03] transition-colors border border-transparent hover:border-white/5"
                    >
                      <span className="text-[10px] font-mono text-gray-600 select-none mr-2">
                        {paraItem.p !== undefined && paraItem.p !== null ? paraItem.p : pIdx + 1}
                      </span>
                      {renderParagraphWithHighlights(paraItem.text, paraItem.p)}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Inspector Tabs (Fields, Signers, Wording Suggestions) */}
            <div className="lg:col-span-5 glass-panel p-6 rounded-3xl border border-white/10 flex flex-col max-h-[78vh]">
              {/* Tab Selector */}
              <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-xl border border-white/10 mb-5 shrink-0">
                <button
                  type="button"
                  onClick={() => setReviewTab('fields')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    reviewTab === 'fields'
                      ? 'bg-glow/20 text-glow border border-glow/40 shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Sliders size={13} />
                  Fields ({editableFields.length})
                </button>
                <button
                  type="button"
                  onClick={() => setReviewTab('signers')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    reviewTab === 'signers'
                      ? 'bg-glow/20 text-glow border border-glow/40 shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <UserCheck size={13} />
                  Signers ({editableSigners.length})
                </button>
                <button
                  type="button"
                  onClick={() => setReviewTab('suggestions')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    reviewTab === 'suggestions'
                      ? 'bg-glow/20 text-glow border border-glow/40 shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Sparkles size={13} />
                  Wording ({wordingSuggestionsList.length})
                </button>
              </div>

              {/* Tab 1: Editable Fields List */}
              {reviewTab === 'fields' && (
                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                  {editableFields.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-sm">
                      No fields detected or all fields were removed.
                    </div>
                  ) : (
                    editableFields.map((field, idx) => {
                      const color = getFieldColor(idx);
                      return (
                        <div
                          key={field.key || idx}
                          className="p-4 rounded-xl bg-black/30 border border-white/10 hover:border-white/20 transition-all space-y-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-0.5 rounded-md font-mono font-bold ${color.badge}`}>
                                #{idx + 1}
                              </span>
                              <span className="text-[11px] font-mono text-gray-400 truncate max-w-[150px]">
                                {field.key}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveField(idx)}
                              className="text-gray-400 hover:text-rose-400 p-1 rounded hover:bg-rose-500/10 transition-colors"
                              title="Remove variable field"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>

                          {/* Editable Label */}
                          <div>
                            <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wider block mb-1">
                              Field Label
                            </label>
                            <input
                              type="text"
                              value={field.label}
                              onChange={(e) => handleUpdateField(idx, { label: e.target.value })}
                              className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-glow"
                              placeholder="Label"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-1">
                            {/* Type Dropdown */}
                            <div>
                              <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wider block mb-1">
                                Input Type
                              </label>
                              <select
                                value={field.type}
                                onChange={(e) => handleUpdateField(idx, { type: e.target.value })}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-glow"
                              >
                                <option value="text">Text</option>
                                <option value="date">Date</option>
                                <option value="number">Number</option>
                                <option value="textarea">Textarea</option>
                              </select>
                            </div>

                            {/* Required Toggle */}
                            <div className="flex flex-col justify-end">
                              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-300 py-1">
                                <input
                                  type="checkbox"
                                  checked={Boolean(field.required)}
                                  onChange={(e) => handleUpdateField(idx, { required: e.target.checked })}
                                  className="custom-checkbox w-4 h-4 rounded text-glow"
                                />
                                <span>Required</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Tab 2: Editable Signers List */}
              {reviewTab === 'signers' && (
                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                  {/* Explanatory note */}
                  <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs text-purple-200/90 leading-relaxed flex items-start gap-2.5">
                    <Info size={16} className="text-purple-400 shrink-0 mt-0.5" />
                    <span>
                      Only signers listed here will receive a signature request. Remove any party that has already signed or signs outside this system.
                    </span>
                  </div>

                  {editableSigners.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-sm">
                      No signers detected in this template.
                    </div>
                  ) : (
                    editableSigners.map((signer, idx) => (
                      <div
                        key={signer.id || idx}
                        className="p-4 rounded-xl bg-black/30 border border-white/10 space-y-3"
                      >
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span className="font-mono text-purple-400 font-semibold">Signer #{idx + 1}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px]">{signer.id}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSigner(idx)}
                              disabled={editableSigners.length <= 1}
                              className="text-gray-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors disabled:opacity-30 disabled:hover:text-gray-400 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer"
                              title={editableSigners.length <= 1 ? "At least one signer is required" : "Remove signer"}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>

                        {/* Signer Label */}
                        <div>
                          <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wider block mb-1">
                            Signer Title / Role
                          </label>
                          <input
                            type="text"
                            value={signer.label}
                            onChange={(e) => handleUpdateSigner(idx, { label: e.target.value })}
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-glow"
                            placeholder="e.g. Authorized Client Signatory"
                          />
                        </div>

                        {signer.name_field_key && (
                          <div className="text-[11px] text-gray-400 bg-white/5 p-2 rounded-lg">
                            Bound to name variable: <span className="font-mono text-glow">{signer.name_field_key}</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 3: Wording Suggestions */}
              {reviewTab === 'suggestions' && (
                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                  {wordingSuggestionsList.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-sm">
                      No wording suggestions generated for this template.
                    </div>
                  ) : (
                    wordingSuggestionsList.map((sug, idx) => {
                      const isAccepted = Boolean(acceptedSuggestions[idx]);
                      const original = sug.find || sug.original_text || sug.original || '';
                      const suggested = sug.suggested_text || sug.replacement || sug.suggestion || '';

                      return (
                        <div
                          key={idx}
                          onClick={() => handleToggleSuggestion(idx)}
                          className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                            isAccepted
                              ? 'bg-emerald-950/20 border-emerald-500/40'
                              : 'bg-black/30 border-white/10 opacity-70'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <label
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-white"
                            >
                              <input
                                type="checkbox"
                                checked={isAccepted}
                                onChange={() => handleToggleSuggestion(idx)}
                                className="custom-checkbox w-4 h-4 rounded text-emerald-400"
                              />
                              <span>{isAccepted ? 'Accepted' : 'Ignored'}</span>
                            </label>
                            {sug.paragraph !== undefined && (
                              <span className="text-[10px] font-mono text-gray-500">
                                Para #{Number(sug.paragraph) + 1}
                              </span>
                            )}
                          </div>

                          {/* Original Text */}
                          {original && (
                            <div>
                              <span className="text-[10px] font-medium text-rose-400 uppercase tracking-wider block mb-0.5">
                                Original:
                              </span>
                              <div className="text-xs text-rose-200/90 line-through bg-rose-950/30 p-2 rounded-lg border border-rose-500/20">
                                {original}
                              </div>
                            </div>
                          )}

                          {/* Suggested Text */}
                          {suggested && (
                            <div>
                              <span className="text-[10px] font-medium text-emerald-400 uppercase tracking-wider block mb-0.5">
                                Suggested:
                              </span>
                              <div className="text-xs text-emerald-200 bg-emerald-950/40 p-2 rounded-lg border border-emerald-500/30 font-medium">
                                {suggested}
                              </div>
                            </div>
                          )}

                          {sug.reason && (
                            <p className="text-[11px] text-gray-400 italic">
                              {sug.reason}
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* View 4: Generate Flow (Step 4) */}
      {viewMode === 'generate' && selectedTemplate && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-3xl mx-auto space-y-6"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <button
              onClick={() => setViewMode('list')}
              className="text-gray-400 hover:text-white flex items-center gap-2 text-sm transition-colors cursor-pointer"
            >
              <ArrowLeft size={16} />
              Back to templates
            </button>
            <span className="text-xs text-glow font-mono uppercase tracking-wider">
              {selectedTemplate.doc_type_key || 'CUSTOM TEMPLATE'}
            </span>
          </div>

          {/* Success Panel after Generation */}
          {generationResult ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel p-8 sm:p-10 rounded-3xl border border-emerald-500/40 text-center space-y-6 shadow-[0_0_40px_rgba(16,185,129,0.15)]"
            >
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                <CheckCircle2 size={36} />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Document Generated Successfully!</h2>
                <p className="text-gray-300 text-sm max-w-md mx-auto">
                  {generationResult.doc_name || selectedTemplate.name} has been compiled and is ready for review.
                </p>
                {generationResult.contract_id && (
                  <p className="text-xs font-mono text-gray-500 mt-2">
                    Contract ID: <span className="text-glow">{generationResult.contract_id}</span>
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                {generationResult.doc_url && (
                  <button
                    type="button"
                    onClick={() => openDocPreview(generationResult.doc_url, generationResult.doc_name || selectedTemplate?.name)}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-glow/40 bg-glow/10 hover:bg-glow/20 text-glow font-semibold text-sm flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,243,255,0.2)] hover:shadow-[0_0_25px_rgba(0,243,255,0.35)] transition-all cursor-pointer"
                  >
                    <Eye size={16} />
                    <span>Open preview</span>
                  </button>
                )}

                <button
                  onClick={() => onNavigateToApprovals?.()}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-glow to-blue-600 text-dark font-bold text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,243,255,0.3)] hover:shadow-[0_0_30px_rgba(0,243,255,0.5)] transition-all cursor-pointer"
                >
                  <ArrowRight size={16} />
                  Go to Approval Center
                </button>
              </div>

              <div className="pt-4 border-t border-white/5">
                <button
                  onClick={() => {
                    setGenerationResult(null);
                    setGenerateError(null);
                  }}
                  className="text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  Generate another document with this template
                </button>
              </div>
            </motion.div>
          ) : (
            /* Dynamic Generation Form */
            <div className="glass-panel p-8 sm:p-10 rounded-3xl border border-white/10 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-glow to-transparent opacity-60" />

              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-glow/10 border border-glow/30 flex items-center justify-center text-glow">
                  <Zap size={22} className="fill-current" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Generate {selectedTemplate.name}</h2>
                  <p className="text-xs text-gray-400">Fill in the required template fields and signer information</p>
                </div>
              </div>

              {generateError && (
                <div className="mb-6 p-4 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-200 flex items-center gap-3 text-sm">
                  <AlertCircle size={20} className="text-rose-400 shrink-0" />
                  <span className="flex-1">{generateError}</span>
                  <button onClick={() => setGenerateError(null)} className="text-rose-400 hover:text-rose-100">
                    <X size={16} />
                  </button>
                </div>
              )}

              <form onSubmit={handleGenerateSubmit} className="space-y-8">
                {/* Optional Company Name */}
                <div>
                  <label className="label-text flex items-center gap-1.5 font-semibold text-slate-200 mb-1.5">
                    <Building2 size={15} className="text-glow" />
                    Company Name <span className="text-gray-500 font-normal text-xs">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={companyNameValue}
                    onChange={(e) => setCompanyNameValue(e.target.value)}
                    placeholder="e.g. Apex Global Technologies LLC"
                    disabled={isGeneratingDoc}
                    className="input-field"
                  />
                </div>

                {/* Dynamic Fields Section */}
                {normalizeArray(selectedTemplate.fields).length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-2">
                      <Sliders size={16} className="text-cyan-400" />
                      Template Variables
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {normalizeArray(selectedTemplate.fields).map(field => {
                        const val = generateFormValues[field.key] ?? '';
                        const isTextarea = field.type === 'textarea';

                        return (
                          <div
                            key={field.key}
                            className={isTextarea ? 'sm:col-span-2' : ''}
                          >
                            <label className="label-text flex items-center gap-1.5 font-semibold text-slate-200 mb-1.5">
                              {field.type === 'date' && <Calendar size={14} className="text-glow" />}
                              {field.type === 'number' && <Hash size={14} className="text-glow" />}
                              {field.type === 'textarea' && <AlignLeft size={14} className="text-glow" />}
                              {field.type === 'text' && <FileText size={14} className="text-glow" />}
                              <span>{field.label || field.key}</span>
                              {field.required && <span className="text-cyan-400">*</span>}
                            </label>

                            {isTextarea ? (
                              <textarea
                                rows={3}
                                value={val}
                                onChange={(e) => setGenerateFormValues(prev => ({
                                  ...prev,
                                  [field.key]: e.target.value
                                }))}
                                placeholder={field.example || `Enter ${field.label}...`}
                                required={field.required}
                                disabled={isGeneratingDoc}
                                className="input-field resize-y"
                              />
                            ) : (
                              <input
                                type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
                                value={val}
                                onChange={(e) => setGenerateFormValues(prev => ({
                                  ...prev,
                                  [field.key]: e.target.value
                                }))}
                                placeholder={field.example || `e.g. ${field.label}`}
                                required={field.required}
                                disabled={isGeneratingDoc}
                                className={`input-field ${field.type === 'date' ? '[color-scheme:dark]' : ''}`}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Signers Section */}
                {normalizeArray(selectedTemplate.signers).length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-2">
                      <UserCheck size={16} className="text-purple-400" />
                      Signers Information
                    </h3>

                    <div className="space-y-4">
                      {normalizeArray(selectedTemplate.signers).map((signer, sIdx) => {
                        const vals = signerFormValues[signer.id] || { name: '', email: '' };

                        return (
                          <div
                            key={signer.id || sIdx}
                            className="p-5 rounded-2xl bg-black/30 border border-white/10 space-y-3"
                          >
                            <span className="text-xs font-semibold text-purple-300 flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-purple-400" />
                              {signer.label || `Signer ${sIdx + 1}`}
                            </span>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-[11px] font-medium text-gray-300 block mb-1">
                                  Full Name <span className="text-cyan-400">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={vals.name}
                                  onChange={(e) => setSignerFormValues(prev => ({
                                    ...prev,
                                    [signer.id]: { ...(prev[signer.id] || {}), name: e.target.value }
                                  }))}
                                  placeholder="Signatory Full Name"
                                  required
                                  disabled={isGeneratingDoc}
                                  className="input-field text-xs py-2"
                                />
                              </div>

                              <div>
                                <label className="text-[11px] font-medium text-gray-300 block mb-1">
                                  Email Address <span className="text-cyan-400">*</span>
                                </label>
                                <input
                                  type="email"
                                  value={vals.email}
                                  onChange={(e) => setSignerFormValues(prev => ({
                                    ...prev,
                                    [signer.id]: { ...(prev[signer.id] || {}), email: e.target.value }
                                  }))}
                                  placeholder="signer@company.com"
                                  required
                                  disabled={isGeneratingDoc}
                                  className="input-field text-xs py-2"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Generation Loading State */}
                {isGeneratingDoc && (
                  <div className="p-4 rounded-xl bg-cyan-950/40 border border-glow/30 flex items-center gap-3 text-glow text-sm font-semibold">
                    <Loader2 size={18} className="animate-spin text-glow shrink-0" />
                    <span>Compiling template & generating contract document...</span>
                  </div>
                )}

                {/* Form Buttons */}
                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    disabled={isGeneratingDoc}
                    className="px-5 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 text-sm font-medium transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isGeneratingDoc}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-glow to-blue-600 text-dark font-bold text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(0,243,255,0.3)] hover:shadow-[0_0_30px_rgba(0,243,255,0.5)] disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {isGeneratingDoc ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Generating Document...
                      </>
                    ) : (
                      <>
                        <Zap size={16} className="fill-current" />
                        Generate Document
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </motion.div>
      )}

      {/* Large Document Preview Modal Overlay (about 90% viewport, matching PipelineApprovals modal style) */}
      {previewModalState.isOpen && createPortal(
        <div
          onClick={closePreviewModal}
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            onClick={(e) => e.stopPropagation()}
            className="w-[90vw] h-[90vh] max-w-7xl glass-panel border border-white/20 rounded-2xl flex flex-col overflow-hidden shadow-2xl bg-slate-950/95"
          >
            {/* Modal Header */}
            <div className="p-3.5 sm:p-4 border-b border-white/10 bg-slate-900/90 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <FileText className="text-glow shrink-0" size={19} />
                <h3 className="font-semibold text-white text-sm md:text-base truncate">
                  {previewModalState.title}
                </h3>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                {/* Secondary Option: Open in new tab link */}
                <a
                  href={previewModalState.rawUrl || previewModalState.url.replace('/preview', '/view')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-300 hover:text-white rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                  title="Open document in new browser tab"
                >
                  <ExternalLink size={13} />
                  <span className="hidden sm:inline font-medium">Open in new tab</span>
                </a>

                {/* Close Button top-right */}
                <button
                  type="button"
                  onClick={closePreviewModal}
                  className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  title="Close preview (Esc)"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Iframe Content */}
            <div className="flex-1 w-full h-full bg-slate-950 relative overflow-hidden">
              {isIframeLoading && !iframeError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 z-10 gap-3">
                  <Loader2 size={34} className="animate-spin text-glow" />
                  <span className="text-xs text-gray-400 font-medium tracking-wide">
                    Loading document preview...
                  </span>
                </div>
              )}

              {iframeError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 p-6 text-center z-20 gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                    <AlertCircle size={24} />
                  </div>
                  <div className="max-w-md">
                    <h4 className="text-base font-bold text-white mb-1.5">
                      Preview Refused to Display in Frame
                    </h4>
                    <p className="text-xs text-gray-400 mb-5 leading-relaxed">
                      Google Docs security restrictions may prevent embedding this document inside an iframe. You can view the document directly in Google Docs:
                    </p>
                    <a
                      href={previewModalState.rawUrl || previewModalState.url.replace('/preview', '/view')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-glow to-blue-600 text-dark font-bold text-xs shadow-[0_0_20px_rgba(0,243,255,0.3)] hover:shadow-[0_0_30px_rgba(0,243,255,0.5)] transition-all"
                    >
                      <ExternalLink size={15} />
                      <span>Open in new tab</span>
                    </a>
                  </div>
                </div>
              ) : (
                <iframe
                  key={previewModalState.url}
                  src={previewModalState.url}
                  className="w-full h-full border-none"
                  title={previewModalState.title}
                  onLoad={() => setIsIframeLoading(false)}
                  onError={() => {
                    setIsIframeLoading(false);
                    setIframeError(true);
                  }}
                  allow="autoplay"
                />
              )}
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
}

