import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Send,
  Sparkles,
  Bot,
  User,
  FileText,
  Check,
  RotateCcw,
  Loader2,
  Building2,
  ChevronRight,
  AlertCircle,
  CornerDownLeft,
  RefreshCw,
  Layers,
  FileEdit,
  CheckCircle2,
  Ban,
  Maximize2,
  Minimize2,
  Paperclip,
  Eye,
  ExternalLink
} from 'lucide-react';
import { getSupabaseClient, fetchContracts } from '../lib/supabaseClient';

const EDIT_CHAT_URL = 'https://n8n.srv1711190.hstgr.cloud/webhook/contract-edit-chat';

// Format file size in readable units
function formatFileSize(bytes = 0) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  if (bytes < k) return bytes + ' B';
  if (bytes < k * k) return (bytes / k).toFixed(1) + ' KB';
  return (bytes / (k * k)).toFixed(1) + ' MB';
}

// Process image file into scaled JPEG base64 (without prefix)
function processImageFile(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;
      const maxDim = 1800;
      if (width > maxDim || height > maxDim) {
        if (width >= height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context unavailable'));
        return;
      }
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      const base64 = dataUrl.split(',')[1] || '';
      resolve({
        name: file.name,
        kind: 'image',
        mime: 'image/jpeg',
        data: base64
      });
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err || new Error('Image decoding failed'));
    };
    img.src = url;
  });
}

// Process PDF file into base64 (without prefix)
function processPdfFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const base64 = typeof dataUrl === 'string' ? (dataUrl.split(',')[1] || '') : '';
      resolve({
        name: file.name,
        kind: 'pdf',
        mime: 'application/pdf',
        data: base64
      });
    };
    reader.onerror = () => reject(new Error('Failed to read PDF file'));
    reader.readAsDataURL(file);
  });
}

// Process .docx with lazy-imported mammoth
async function processDocxFile(file) {
  const mammothModule = await import('mammoth');
  const mammoth = mammothModule.default || mammothModule;
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  const text = (result.value || '').slice(0, 60000);
  return {
    name: file.name,
    kind: 'text',
    mime: 'text/plain',
    data: text
  };
}

// Process .pptx with lazy-imported jszip
async function processPptxFile(file) {
  const jszipModule = await import('jszip');
  const JSZip = jszipModule.default || jszipModule;
  const zip = await JSZip.loadAsync(file);

  const slideFiles = [];
  zip.forEach((relativePath, zipEntry) => {
    const match = relativePath.match(/^ppt\/slides\/slide(\d+)\.xml$/i);
    if (match) {
      slideFiles.push({ num: parseInt(match[1], 10), entry: zipEntry });
    }
  });
  slideFiles.sort((a, b) => a.num - b.num);

  const slideTexts = [];
  const parser = new DOMParser();

  for (const sf of slideFiles) {
    const xmlStr = await sf.entry.async('text');
    const xmlDoc = parser.parseFromString(xmlStr, 'application/xml');
    const tNodes = xmlDoc.getElementsByTagName('a:t');
    const texts = [];
    for (let i = 0; i < tNodes.length; i++) {
      const t = tNodes[i].textContent;
      if (t && t.trim()) {
        texts.push(t.trim());
      }
    }
    slideTexts.push(`Slide ${sf.num}:\n${texts.join(' ')}`);
  }

  const noteFiles = [];
  zip.forEach((relativePath, zipEntry) => {
    const match = relativePath.match(/^ppt\/notesSlides\/notesSlide(\d+)\.xml$/i);
    if (match) {
      noteFiles.push({ num: parseInt(match[1], 10), entry: zipEntry });
    }
  });
  noteFiles.sort((a, b) => a.num - b.num);

  const noteTexts = [];
  for (const nf of noteFiles) {
    const xmlStr = await nf.entry.async('text');
    const xmlDoc = parser.parseFromString(xmlStr, 'application/xml');
    const tNodes = xmlDoc.getElementsByTagName('a:t');
    const texts = [];
    for (let i = 0; i < tNodes.length; i++) {
      const t = tNodes[i].textContent;
      if (t && t.trim()) {
        texts.push(t.trim());
      }
    }
    if (texts.length > 0) {
      noteTexts.push(`Slide ${nf.num} Notes: ${texts.join(' ')}`);
    }
  }

  let fullText = slideTexts.join('\n\n');
  if (noteTexts.length > 0) {
    fullText += '\n\nNotes:\n' + noteTexts.join('\n');
  }

  return {
    name: file.name,
    kind: 'text',
    mime: 'text/plain',
    data: fullText.slice(0, 60000)
  };
}

// Process .xlsx / .xls with lazy-imported xlsx
async function processSpreadsheetFile(file) {
  const xlsxModule = await import('xlsx');
  const XLSX = xlsxModule.default || xlsxModule;
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetOutputs = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    sheetOutputs.push(`Sheet: ${sheetName}\n${csv}`);
  }
  const combined = sheetOutputs.join('\n\n');
  return {
    name: file.name,
    kind: 'text',
    mime: 'text/plain',
    data: combined.slice(0, 60000)
  };
}

// Process plain text files (.csv, .txt, .md)
async function processTextualFile(file) {
  const rawText = await file.text();
  return {
    name: file.name,
    kind: 'text',
    mime: 'text/plain',
    data: rawText.slice(0, 60000)
  };
}

// Main file processing dispatcher
async function processSingleFile(file) {
  const name = file.name || 'file';
  const lowerName = name.toLowerCase();

  if (/\.(png|jpe?g|webp|gif)$/i.test(lowerName) || (file.type && file.type.startsWith('image/'))) {
    return await processImageFile(file);
  }
  if (lowerName.endsWith('.pdf') || file.type === 'application/pdf') {
    return await processPdfFile(file);
  }
  if (lowerName.endsWith('.docx')) {
    return await processDocxFile(file);
  }
  if (lowerName.endsWith('.pptx')) {
    return await processPptxFile(file);
  }
  if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
    return await processSpreadsheetFile(file);
  }
  if (
    lowerName.endsWith('.csv') ||
    lowerName.endsWith('.txt') ||
    lowerName.endsWith('.md') ||
    (file.type && file.type.startsWith('text/'))
  ) {
    return await processTextualFile(file);
  }
  return await processTextualFile(file);
}

// Simple word-level diffing helper with natural word spacing
function computeWordDiff(beforeText = '', afterText = '') {
  if (!beforeText && !afterText) return { beforeTokens: [], afterTokens: [] };
  if (!beforeText) {
    return {
      beforeTokens: [],
      afterTokens: [{ text: afterText, type: 'added' }]
    };
  }
  if (!afterText) {
    return {
      beforeTokens: [{ text: beforeText, type: 'removed' }],
      afterTokens: []
    };
  }
  if (beforeText === afterText) {
    return {
      beforeTokens: [{ text: beforeText, type: 'same' }],
      afterTokens: [{ text: afterText, type: 'same' }]
    };
  }

  const beforeTokensRaw = beforeText.match(/\S+|\s+/g) || [];
  const afterTokensRaw = afterText.match(/\S+|\s+/g) || [];

  const cleanWord = (w) => w.toLowerCase().replace(/[^\w]/g, '');

  const afterWordSet = new Set(afterTokensRaw.map(cleanWord).filter(Boolean));
  const beforeWordSet = new Set(beforeTokensRaw.map(cleanWord).filter(Boolean));

  const beforeTokens = beforeTokensRaw.map(tok => {
    if (/^\s+$/.test(tok)) return { text: tok, type: 'space' };
    const clean = cleanWord(tok);
    const isRemoved = clean && !afterWordSet.has(clean);
    return { text: tok, type: isRemoved ? 'removed' : 'same' };
  });

  const afterTokens = afterTokensRaw.map(tok => {
    if (/^\s+$/.test(tok)) return { text: tok, type: 'space' };
    const clean = cleanWord(tok);
    const isAdded = clean && !beforeWordSet.has(clean);
    return { text: tok, type: isAdded ? 'added' : 'same' };
  });

  return { beforeTokens, afterTokens };
}

export default function DocEditChat({
  isOpen,
  onClose,
  initialContracts = [],
  onApplied
}) {
  const [selectedContracts, setSelectedContracts] = useState(initialContracts || []);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [applyingProposalId, setApplyingProposalId] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Document preview modal state
  const [previewModal, setPreviewModal] = useState({ isOpen: false, url: '', title: '' });
  const [previewFullScreen, setPreviewFullScreen] = useState(false);
  const [previewVersion, setPreviewVersion] = useState(Date.now());

  // File attachments state
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [attachmentError, setAttachmentError] = useState(null);

  // Document picker state
  const [pickerLoading, setPickerLoading] = useState(false);
  const [inReviewGroups, setInReviewGroups] = useState([]);
  const [pickerError, setPickerError] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  const getCleanPreviewUrl = (url, version = previewVersion) => {
    if (!url) return '';
    let clean = url.trim();
    if (clean.startsWith('[')) clean = clean.substring(1);
    if (clean.endsWith(']')) clean = clean.substring(0, clean.length - 1);
    if (clean.startsWith('"') && clean.endsWith('"')) clean = clean.slice(1, -1);
    if (clean.startsWith("'") && clean.endsWith("'")) clean = clean.slice(1, -1);

    // If it's a Google Docs URL
    if (clean.includes('docs.google.com/document/d/')) {
      clean = clean.split('?')[0].split('#')[0];
      if (clean.endsWith('/edit')) {
        clean = clean.replace(/\/edit$/, '/preview');
      } else if (!clean.endsWith('/preview')) {
        clean = clean.replace(/\/$/, '') + '/preview';
      }
      return `${clean}?v=${version}`;
    }

    // If it's a Google Drive file URL
    if (clean.includes('drive.google.com/file/d/')) {
      clean = clean.split('?')[0].split('#')[0];
      clean = clean.replace('/view', '/preview');
      if (!clean.endsWith('/preview')) {
        clean = clean.replace(/\/$/, '') + '/preview';
      }
      return `${clean}?v=${version}`;
    }

    // If it's a bare Drive file ID (alphanumeric 25+ chars)
    if (/^[a-zA-Z0-9_-]{25,}$/.test(clean)) {
      return `https://docs.google.com/document/d/${clean}/preview?v=${version}`;
    }

    const sep = clean.includes('?') ? '&' : '?';
    return `${clean}${sep}v=${version}`;
  };

  const findDocUrl = (c) => {
    if (!c) return '';
    if (typeof c === 'string') return c;
    return (
      c.drive_file_url ||
      c.file_url ||
      c.url ||
      c.document_url ||
      c.doc_url ||
      c.sla_url ||
      c.nda_url ||
      c.google_doc_url ||
      c.pdf_url ||
      c.preview_url ||
      (c.drive_file_id ? `https://docs.google.com/document/d/${c.drive_file_id}/preview` : '') ||
      ''
    );
  };

  const openDocPreview = async (docTarget, customTitle = '') => {
    let url = typeof docTarget === 'string' ? docTarget : findDocUrl(docTarget);
    const docType = docTarget?.docType || docTarget?.doc_type || 'Contract';
    const company = docTarget?.companyName || docTarget?.company_name || selectedCompanyName || 'Client';
    const title = customTitle || `${company} - ${docType}`;

    // If URL missing on target, check selectedContracts by id or doc_type
    if (!url && docTarget && typeof docTarget === 'object') {
      if (docTarget.id) {
        const found = selectedContracts.find(c => c.id === docTarget.id);
        if (found) url = findDocUrl(found);
      }
      if (!url && docType) {
        const foundByType = selectedContracts.find(c =>
          (c.doc_type || '').toUpperCase().includes(docType.toUpperCase())
        );
        if (foundByType) url = findDocUrl(foundByType);
      }
    }

    // If still missing, attempt direct fetch from Supabase
    if (!url && docTarget?.id) {
      try {
        const client = getSupabaseClient();
        if (client) {
          const { data } = await client
            .from('contracts')
            .select('*')
            .eq('id', docTarget.id)
            .single();
          if (data) {
            url = findDocUrl(data);
            setSelectedContracts(prev => prev.map(c => c.id === data.id ? data : c));
          }
        }
      } catch (err) {
        console.warn('Error fetching contract in openDocPreview:', err);
      }
    }

    const currentVersion = Date.now();
    setPreviewVersion(currentVersion);
    setPreviewModal({
      isOpen: true,
      url: url ? getCleanPreviewUrl(url, currentVersion) : '',
      title
    });
    setPreviewFullScreen(false);
  };

  const openPreviewModal = (urlOrDoc, title) => {
    openDocPreview(urlOrDoc, title);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, pickerLoading, attachedFiles]);

  // Handle adding new files from input or clipboard paste
  const handleFilesAdded = async (filesToAdd) => {
    if (!filesToAdd || filesToAdd.length === 0) return;
    setAttachmentError(null);

    const fileList = Array.from(filesToAdd);

    // Check for old .doc and .ppt
    for (const f of fileList) {
      const lower = (f.name || '').toLowerCase();
      if (lower.endsWith('.doc') || lower.endsWith('.ppt')) {
        setAttachmentError('Save as .docx, .pptx or PDF and try again');
        return;
      }
    }

    // Check max 5 files limit
    if (attachedFiles.length + fileList.length > 5) {
      setAttachmentError('Max 5 files, 6 MB total');
      return;
    }

    // Check max 6 MB total original size limit
    const currentTotalBytes = attachedFiles.reduce((acc, f) => acc + (f.size || 0), 0);
    const newTotalBytes = fileList.reduce((acc, f) => acc + (f.size || 0), 0);
    const MAX_TOTAL_BYTES = 6 * 1024 * 1024; // 6 MB

    if (currentTotalBytes + newTotalBytes > MAX_TOTAL_BYTES) {
      setAttachmentError('Max 5 files, 6 MB total');
      return;
    }

    // Add initial placeholder items with processing spinners
    const newItems = fileList.map((f) => ({
      id: 'att-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8),
      name: f.name,
      size: f.size,
      isProcessing: true,
      processedData: null
    }));

    setAttachedFiles((prev) => [...prev, ...newItems]);

    // Process each file asynchronously
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      const item = newItems[i];
      try {
        const processed = await processSingleFile(f);
        setAttachedFiles((prev) =>
          prev.map((att) =>
            att.id === item.id
              ? { ...att, isProcessing: false, processedData: processed }
              : att
          )
        );
      } catch (err) {
        console.error(`Error processing file ${f.name}:`, err);
        // Remove chip and show error
        setAttachedFiles((prev) => prev.filter((att) => att.id !== item.id));
        setAttachmentError(`Could not read ${f.name}`);
      }
    }
  };

  const handleRemoveAttachment = (attId) => {
    setAttachedFiles((prev) => prev.filter((att) => att.id !== attId));
  };

  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFilesAdded(files);
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageFiles = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type && items[i].type.startsWith('image/')) {
        const blob = items[i].getAsFile();
        if (blob) {
          const extension = (blob.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
          const file = new File(
            [blob],
            `pasted_image_${Date.now()}.${extension}`,
            { type: blob.type }
          );
          imageFiles.push(file);
        }
      }
    }
    if (imageFiles.length > 0) {
      handleFilesAdded(imageFiles);
    }
  };

  // Sync selectedContracts when initialContracts prop changes
  useEffect(() => {
    if (initialContracts && initialContracts.length > 0) {
      setSelectedContracts(initialContracts);
      const company = initialContracts[0]?.company_name || initialContracts[0]?.client_name || 'Client';
      const docTypes = initialContracts.map(c => c.doc_type || 'Contract').join(' & ');
      setMessages([
        {
          id: 'init-' + Date.now(),
          role: 'assistant',
          content: `Editing ${docTypes} for ${company}. What would you like to change?`
        }
      ]);
    } else {
      setSelectedContracts([]);
      setMessages([
        {
          id: 'init-' + Date.now(),
          role: 'assistant',
          content: 'Hi! I can edit your generated documents. Choose a document to start.',
          showEditChip: true
        }
      ]);
    }
  }, [initialContracts, isOpen]);

  // Focus input when popup opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [isOpen]);

  // Load in-review contracts for the picker
  const loadInReviewContracts = async () => {
    setPickerLoading(true);
    setPickerError(null);
    try {
      const client = getSupabaseClient();
      let rawData = [];

      if (client) {
        const { data, error } = await client
          .from('contracts')
          .select('*')
          .eq('status', 'in_review')
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('Direct in_review query error, falling back to fetchContracts:', error);
          const res = await fetchContracts();
          rawData = (res.data || []).filter(c => (c.status || '').toLowerCase() === 'in_review');
        } else {
          rawData = data || [];
        }
      } else {
        const res = await fetchContracts();
        rawData = (res.data || []).filter(c => (c.status || '').toLowerCase() === 'in_review');
      }

      // Group by company name
      const groups = {};
      rawData.forEach(contract => {
        const companyKey = (
          contract.company_name ||
          contract.client_name ||
          contract.client_company_name ||
          'Unnamed Company'
        ).trim();

        if (!groups[companyKey]) {
          groups[companyKey] = {
            companyName: companyKey,
            contracts: []
          };
        }
        groups[companyKey].contracts.push(contract);
      });

      setInReviewGroups(Object.values(groups));
    } catch (err) {
      console.error('Error fetching in-review contracts:', err);
      setPickerError(err.message || 'Failed to load documents in review');
      setInReviewGroups([]);
    } finally {
      setPickerLoading(false);
    }
  };

  // Trigger document picker inside chat
  const handleOpenPicker = async () => {
    await loadInReviewContracts();
    setMessages(prev => [
      ...prev,
      {
        id: 'picker-' + Date.now(),
        role: 'assistant',
        content: 'Which document would you like to edit?',
        showPicker: true
      }
    ]);
  };

  // Handle document selection from picker
  const handleSelectContractGroup = (contractsToEdit, companyName) => {
    setSelectedContracts(contractsToEdit);
    const docTypes = contractsToEdit.map(c => c.doc_type || 'Contract').join(' & ');
    setMessages(prev => [
      ...prev,
      {
        id: 'user-select-' + Date.now(),
        role: 'user',
        content: `Select ${docTypes} (${companyName})`
      },
      {
        id: 'confirm-' + Date.now(),
        role: 'assistant',
        content: `Editing ${docTypes} for ${companyName}. What would you like to change?`
      }
    ]);
  };

  // Switch / Change document link in header
  const handleChangeDocument = () => {
    setSelectedContracts([]);
    handleOpenPicker();
  };

  // Send message handler
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const trimmed = inputMessage.trim();
    const isAnyFileProcessing = attachedFiles.some((f) => f.isProcessing);
    if ((!trimmed && attachedFiles.length === 0) || loading || isAnyFileProcessing) return;

    const attachmentNames = attachedFiles.map((f) => f.name);
    const processedAttachments = attachedFiles
      .map((f) => f.processedData)
      .filter(Boolean);

    // If no document selected yet, prompt with picker
    if (!selectedContracts || selectedContracts.length === 0) {
      setMessages(prev => [
        ...prev,
        {
          id: 'user-' + Date.now(),
          role: 'user',
          content: trimmed,
          attachmentNames
        }
      ]);
      setInputMessage('');
      setAttachedFiles([]);
      setAttachmentError(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await handleOpenPicker();
      return;
    }

    const newUserMsg = {
      id: 'user-' + Date.now(),
      role: 'user',
      content: trimmed,
      attachmentNames
    };

    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);
    setInputMessage('');
    setAttachedFiles([]);
    setAttachmentError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setLoading(true);

    // Prepare last 10 messages as history { role, content } (text only, excluding current message)
    const textHistory = messages
      .slice(-10)
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({
        role: m.role,
        content: m.content || ''
      }));

    const contractIds = selectedContracts.map(c => c.id).filter(Boolean);

    const payload = {
      action: 'propose',
      contract_ids: contractIds,
      message: trimmed || '',
      history: textHistory,
      attachments: processedAttachments
    };

    console.log('Sending chat proposal request:', payload);

    try {
      const response = await fetch(EDIT_CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }

      let data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        data = data[0];
      }

      console.log('Chat proposal response:', data);

      const status = data?.status || 'no_change';
      const reply = data?.reply || 'I processed your request.';
      const preview = data?.preview || [];
      const operations = data?.operations || [];
      const revision_ids = data?.revision_ids || [];

      if (status === 'ready' && (preview.length > 0 || operations.length > 0)) {
        const proposalId = 'prop-' + Date.now();
        setMessages(prev => [
          ...prev,
          {
            id: 'asst-' + Date.now(),
            role: 'assistant',
            content: reply,
            proposal: {
              id: proposalId,
              status: 'pending', // 'pending' | 'applied' | 'cancelled' | 'not_applied'
              preview,
              operations,
              revision_ids,
              contract_ids: contractIds
            }
          }
        ]);
      } else {
        // status 'clarify' or 'no_change'
        setMessages(prev => [
          ...prev,
          {
            id: 'asst-' + Date.now(),
            role: 'assistant',
            content: reply
          }
        ]);
      }
    } catch (error) {
      console.error('Error sending edit message:', error);
      setMessages(prev => [
        ...prev,
        {
          id: 'asst-err-' + Date.now(),
          role: 'assistant',
          content: 'Something went wrong, please try again.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Handle Apply Changes
  const handleApplyProposal = async (proposalMsgId, proposal) => {
    if (!proposal || applyingProposalId) return;

    setApplyingProposalId(proposal.id);

    const payload = {
      action: 'apply',
      contract_ids: proposal.contract_ids || selectedContracts.map(c => c.id),
      operations: proposal.operations,
      revision_ids: proposal.revision_ids
    };

    console.log('Applying proposal changes:', payload);

    try {
      const response = await fetch(EDIT_CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }

      let data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        data = data[0];
      }

      console.log('Apply response:', data);

      const status = data?.status;
      const reply = data?.reply || (status === 'applied' ? 'Changes applied successfully.' : 'Unable to apply changes.');

      if (status === 'applied') {
        // Fetch latest contracts to get fresh document preview URLs and updated data
        let freshDocs = selectedContracts;
        try {
          const client = getSupabaseClient();
          const targetIds = payload.contract_ids || [];
          if (client && targetIds.length > 0) {
            const { data: freshContracts } = await client
              .from('contracts')
              .select('*')
              .in('id', targetIds);
            if (freshContracts && freshContracts.length > 0) {
              freshDocs = freshContracts;
              setSelectedContracts(freshContracts);
            }
          }
        } catch (fetchErr) {
          console.warn('Could not re-fetch fresh contracts after apply:', fetchErr);
        }

        setPreviewVersion(Date.now());

        const appliedDocList = freshDocs.map(c => ({
          id: c.id,
          docType: c.doc_type || 'Contract',
          companyName: c.company_name || c.client_name || '',
          url: c.drive_file_url || c.file_url || c.sla_url || c.nda_url || ''
        }));

        // Mark proposal card as 'applied'
        setMessages(prev =>
          prev.map(m => {
            if (m.id === proposalMsgId && m.proposal) {
              return {
                ...m,
                proposal: { ...m.proposal, status: 'applied' }
              };
            }
            return m;
          })
        );

        // Append assistant confirmation reply with document preview action chips
        setMessages(prev => [
          ...prev,
          {
            id: 'asst-applied-' + Date.now(),
            role: 'assistant',
            content: reply,
            appliedDocs: appliedDocList
          }
        ]);

        // Trigger onApplied callback
        onApplied?.(payload.contract_ids);
      } else {
        // status 'error' or 'clarify'
        setMessages(prev =>
          prev.map(m => {
            if (m.id === proposalMsgId && m.proposal) {
              return {
                ...m,
                proposal: { ...m.proposal, status: 'not_applied' }
              };
            }
            return m;
          })
        );

        setMessages(prev => [
          ...prev,
          {
            id: 'asst-not-applied-' + Date.now(),
            role: 'assistant',
            content: reply
          }
        ]);
      }
    } catch (error) {
      console.error('Error applying proposal:', error);
      setMessages(prev =>
        prev.map(m => {
          if (m.id === proposalMsgId && m.proposal) {
            return {
              ...m,
              proposal: { ...m.proposal, status: 'not_applied' }
            };
          }
          return m;
        })
      );

      setMessages(prev => [
        ...prev,
        {
          id: 'asst-err-' + Date.now(),
          role: 'assistant',
          content: 'Something went wrong, please try again.'
        }
      ]);
    } finally {
      setApplyingProposalId(null);
    }
  };

  // Handle Cancel Proposal
  const handleCancelProposal = (proposalMsgId) => {
    setMessages(prev =>
      prev.map(m => {
        if (m.id === proposalMsgId && m.proposal) {
          return {
            ...m,
            proposal: { ...m.proposal, status: 'cancelled' }
          };
        }
        return m;
      })
    );
  };

  // Header display strings
  const selectedCompanyName =
    selectedContracts[0]?.company_name ||
    selectedContracts[0]?.client_name ||
    selectedContracts[0]?.client_company_name ||
    '';
  const selectedDocTypes = selectedContracts.map(c => c.doc_type || 'Doc');

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      <AnimatePresence>
        {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 md:p-8">
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/85 backdrop-blur-md"
          />

          {/* Big Centered Pop-up Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 15 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className={`relative z-10 w-full flex flex-col bg-[#0b0c14]/95 backdrop-blur-2xl border border-white/15 rounded-3xl shadow-[0_0_60px_rgba(0,0,0,0.9),0_0_30px_rgba(0,243,255,0.15)] text-white overflow-hidden transition-all duration-300 ${
              isFullScreen
                ? 'w-full h-full rounded-none max-w-none max-h-none'
                : 'max-w-4xl h-[88vh] max-h-[820px]'
            }`}
          >
            {/* Top Glowing Edge Accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-glow/20 via-glow to-blue-500/40" />

            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 bg-slate-900/60 flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-glow/20 via-blue-600/20 to-purple-600/20 border border-glow/40 flex items-center justify-center text-glow shrink-0 shadow-[0_0_15px_rgba(0,243,255,0.25)]">
                  <Sparkles size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                      {selectedContracts.length > 0 ? selectedCompanyName || 'Document Editor' : 'AI Document Editor'}
                    </h2>
                  </div>

                  {selectedContracts.length > 0 ? (
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        {selectedContracts.map((c, idx) => {
                          const hasUrl = Boolean(findDocUrl(c));
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => openDocPreview(c)}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold border uppercase tracking-wider inline-flex items-center gap-1.5 transition-all bg-cyan-500/15 text-cyan-300 border-cyan-500/30 hover:border-glow hover:bg-cyan-500/25 hover:text-white cursor-pointer shadow-sm"
                              title={`Preview ${c.doc_type || 'document'}`}
                            >
                              <Eye size={12} className="text-cyan-400 shrink-0" />
                              <span>{c.doc_type || 'Doc'}</span>
                            </button>
                          );
                        })}
                      </div>
                      <span className="text-gray-500 text-xs">•</span>
                      <button
                        onClick={handleChangeDocument}
                        className="text-xs text-gray-400 hover:text-glow underline transition-colors cursor-pointer flex items-center gap-1"
                        title="Choose a different document to edit"
                      >
                        <RefreshCw size={11} />
                        <span>Change Document</span>
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 truncate">
                      Select or request edits on any active contract clauses
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* Fullscreen Toggle */}
                <button
                  onClick={() => setIsFullScreen(!isFullScreen)}
                  className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title={isFullScreen ? 'Exit Fullscreen' : 'Fullscreen'}
                >
                  {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>

                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Close edit chat"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {messages.map((msg) => {
                const isUser = msg.role === 'user';

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    {/* Message Bubble */}
                    <div
                      className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-lg ${
                        isUser
                          ? 'bg-gradient-to-r from-cyan-600/35 to-blue-600/35 text-white border border-glow/40 rounded-tr-xs shadow-[0_0_20px_rgba(0,243,255,0.15)]'
                          : 'bg-white/[0.05] text-gray-200 border border-white/10 rounded-tl-xs backdrop-blur-md'
                      }`}
                    >
                      {msg.content ? (
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      ) : null}

                      {/* Attached file chips in user message bubble (names only) */}
                      {isUser && msg.attachmentNames && msg.attachmentNames.length > 0 && (
                        <div className={`flex flex-wrap gap-1.5 ${msg.content ? 'mt-2.5 pt-2.5 border-t border-white/15' : ''}`}>
                          {msg.attachmentNames.map((name, aIdx) => (
                            <span
                              key={aIdx}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 border border-white/15 text-[11px] text-cyan-200 font-medium shadow-sm"
                            >
                              <FileText size={12} className="text-cyan-400 shrink-0" />
                              <span className="truncate max-w-[170px]" title={name}>
                                {name}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Updated Documents Action Chips if applied */}
                      {msg.appliedDocs && msg.appliedDocs.length > 0 && (
                        <div className="mt-3.5 pt-3 border-t border-white/10 space-y-2 w-full">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                            <CheckCircle2 size={13} className="text-emerald-400" />
                            <span>Updated Document{msg.appliedDocs.length > 1 ? 's' : ''}:</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {msg.appliedDocs.map((doc, dIdx) => (
                              <button
                                key={dIdx}
                                type="button"
                                onClick={() => openDocPreview(doc)}
                                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-blue-500/20 hover:from-emerald-500/30 hover:via-cyan-500/30 hover:to-blue-500/30 text-cyan-200 hover:text-white border border-cyan-500/40 hover:border-glow text-xs font-semibold shadow-[0_0_15px_rgba(0,243,255,0.2)] transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                                title={`View updated ${doc.docType}`}
                              >
                                <Eye size={14} className="text-cyan-400" />
                                <span>View Updated {doc.docType}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Quick Action Chip for greeting */}
                      {msg.showEditChip && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <button
                            onClick={handleOpenPicker}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-glow/15 hover:bg-glow/25 text-glow border border-glow/40 hover:border-glow transition-all duration-200 shadow-[0_0_12px_rgba(0,243,255,0.2)] cursor-pointer"
                          >
                            <FileEdit size={14} />
                            <span>Edit a document</span>
                          </button>
                        </div>
                      )}

                      {/* Interactive Document Picker inside chat */}
                      {msg.showPicker && (
                        <div className="mt-4 pt-3.5 border-t border-white/10 space-y-3 w-full">
                          {pickerLoading ? (
                            <div className="py-6 flex items-center justify-center gap-2 text-xs text-cyan-300">
                              <Loader2 size={16} className="animate-spin" />
                              <span>Loading documents in review...</span>
                            </div>
                          ) : pickerError ? (
                            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-2">
                              <span>{pickerError}</span>
                              <button
                                onClick={loadInReviewContracts}
                                className="underline hover:text-white"
                              >
                                Retry
                              </button>
                            </div>
                          ) : inReviewGroups.length === 0 ? (
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-xs text-center">
                              <p className="font-semibold text-gray-300">No documents in review</p>
                              <p className="text-[11px] text-gray-500 mt-1">
                                Generate a contract in the Generation tab to start editing clauses.
                              </p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                              {inReviewGroups.map((group, gIdx) => {
                                const ndaContract = group.contracts.find(c =>
                                  (c.doc_type || '').toUpperCase().includes('NDA')
                                );
                                const slaContract = group.contracts.find(c =>
                                  (c.doc_type || '').toUpperCase().includes('SLA')
                                );
                                const hasBoth = Boolean(ndaContract && slaContract);

                                return (
                                  <div
                                    key={group.companyName + gIdx}
                                    className="p-3 rounded-2xl bg-black/50 border border-white/10 hover:border-glow/40 transition-all flex flex-col justify-between gap-2.5 shadow-md"
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-lg bg-glow/10 border border-glow/30 flex items-center justify-center text-glow shrink-0">
                                        <Building2 size={13} />
                                      </div>
                                      <span className="font-bold text-white text-xs truncate">
                                        {group.companyName}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {group.contracts.map((c) => (
                                        <button
                                          key={c.id}
                                          onClick={() => handleSelectContractGroup([c], group.companyName)}
                                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white/5 hover:bg-glow/20 text-gray-200 hover:text-glow border border-white/10 hover:border-glow/40 transition-all cursor-pointer"
                                        >
                                          {c.doc_type || 'Doc'}
                                        </button>
                                      ))}

                                      {hasBoth && (
                                        <button
                                          onClick={() =>
                                            handleSelectContractGroup(
                                              [ndaContract, slaContract],
                                              group.companyName
                                            )
                                          }
                                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-glow/20 to-blue-600/20 hover:from-glow/30 hover:to-blue-600/30 text-glow border border-glow/40 hover:border-glow transition-all cursor-pointer shadow-[0_0_10px_rgba(0,243,255,0.15)]"
                                        >
                                          Both (NDA + SLA)
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Proposal Card if attached to assistant message */}
                    {msg.proposal && (
                      <div className="mt-3 w-full max-w-[98%] rounded-3xl bg-[#0e101b] border border-cyan-500/35 p-4 sm:p-5 shadow-[0_8px_30px_rgba(0,0,0,0.7)] space-y-4 text-xs">
                        {/* Proposal Header Banner */}
                        <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-xl bg-glow/15 border border-glow/40 flex items-center justify-center text-glow shrink-0 shadow-[0_0_10px_rgba(0,243,255,0.2)]">
                              <Sparkles size={15} />
                            </div>
                            <span className="font-bold text-white text-xs sm:text-sm uppercase tracking-wider">
                              Proposed Clause Revisions
                            </span>
                          </div>

                          {/* Proposal Status Badge */}
                          {msg.proposal.status === 'applied' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
                              <Check size={13} strokeWidth={2.5} /> Applied
                            </span>
                          )}
                          {msg.proposal.status === 'cancelled' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-zinc-500/20 text-zinc-400 border border-zinc-500/30">
                              <Ban size={13} /> Cancelled
                            </span>
                          )}
                          {msg.proposal.status === 'not_applied' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                              <AlertCircle size={13} /> Not applied
                            </span>
                          )}
                        </div>

                        {/* List of preview items (Option A Side-by-side) */}
                        <div className="space-y-4">
                          {msg.proposal.preview.map((item, pIdx) => {
                            const docType =
                              item.doc_type ||
                              item.document_type ||
                              (selectedContracts.length === 1
                                ? selectedContracts[0].doc_type
                                : 'Contract');
                            const paragraphNum =
                              item.paragraph ||
                              item.paragraph_number ||
                              item.paragraph_index ||
                              item.section ||
                              pIdx + 1;
                            const beforeText = item.before ?? '';
                            const afterText = item.after ?? '';
                            const isRemoved = !afterText || afterText.trim() === '';

                            const { beforeTokens, afterTokens } = computeWordDiff(
                              beforeText,
                              afterText
                            );

                            return (
                              <div
                                key={pIdx}
                                className="rounded-2xl bg-black/40 border border-white/10 p-3.5 sm:p-4 space-y-3 shadow-md"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 uppercase tracking-wide">
                                      {docType}
                                    </span>
                                    <span className="text-xs font-semibold text-gray-200">
                                      Paragraph {paragraphNum}
                                    </span>
                                  </div>
                                  <span className="text-[11px] font-medium text-gray-400 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full">
                                    Clause Revision
                                  </span>
                                </div>

                                {/* Option A: Side-by-side Neon Comparison Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {/* Before Box (Deep Crimson Neon) */}
                                  <div className="space-y-1.5 flex flex-col">
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5 px-0.5">
                                      <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]" />
                                      Original (Before)
                                    </div>
                                    <div className="p-3.5 rounded-2xl bg-[#230910]/80 border border-rose-500/35 text-rose-100/90 text-xs sm:text-sm font-sans leading-relaxed break-words flex-1 shadow-inner">
                                      {beforeTokens.length > 0 ? (
                                        beforeTokens.map((tok, tIdx) => (
                                          <span
                                            key={tIdx}
                                            className={
                                              tok.type === 'removed'
                                                ? 'bg-rose-500/35 text-rose-100 line-through rounded px-1.5 py-0.5 font-medium'
                                                : ''
                                            }
                                          >
                                            {tok.text}
                                          </span>
                                        ))
                                      ) : (
                                        <span className="text-gray-500 italic">(none)</span>
                                      )}
                                    </div>
                                  </div>

                                  {/* After Box (Deep Emerald Cyan Neon) */}
                                  <div className="space-y-1.5 flex flex-col">
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 px-0.5">
                                      <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
                                      Revised (After)
                                    </div>
                                    <div className="p-3.5 rounded-2xl bg-[#04241d]/80 border border-emerald-500/35 text-emerald-100/90 text-xs sm:text-sm font-sans leading-relaxed break-words flex-1 shadow-inner">
                                      {isRemoved ? (
                                        <span className="text-rose-400 font-medium italic">
                                          (paragraph removed)
                                        </span>
                                      ) : afterTokens.length > 0 ? (
                                        afterTokens.map((tok, tIdx) => (
                                          <span
                                            key={tIdx}
                                            className={
                                              tok.type === 'added'
                                                ? 'bg-emerald-500/35 text-emerald-100 font-semibold rounded px-1.5 py-0.5 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                                                : ''
                                            }
                                          >
                                            {tok.text}
                                          </span>
                                        ))
                                      ) : (
                                        afterText
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Proposal Actions */}
                        {msg.proposal.status === 'pending' && (
                          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                            <button
                              onClick={() => handleCancelProposal(msg.id)}
                              disabled={applyingProposalId === msg.proposal.id}
                              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 border border-white/10 transition-all cursor-pointer disabled:opacity-50"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleApplyProposal(msg.id, msg.proposal)}
                              disabled={applyingProposalId === msg.proposal.id}
                              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-dark shadow-[0_0_25px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] transition-all cursor-pointer disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
                            >
                              {applyingProposalId === msg.proposal.id ? (
                                <>
                                  <Loader2 size={14} className="animate-spin" />
                                  <span>Applying Changes...</span>
                                </>
                              ) : (
                                <>
                                  <Check size={15} strokeWidth={2.5} />
                                  <span>Apply Changes</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Typing Indicator */}
              {loading && (
                <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-white/[0.05] border border-white/10 w-24 text-glow shadow-md">
                  <div className="w-2 h-2 rounded-full bg-glow animate-bounce" />
                  <div
                    className="w-2 h-2 rounded-full bg-glow animate-bounce"
                    style={{ animationDelay: '0.15s' }}
                  />
                  <div
                    className="w-2 h-2 rounded-full bg-glow animate-bounce"
                    style={{ animationDelay: '0.3s' }}
                  />
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Form Footer */}
            <form
              onSubmit={handleSendMessage}
              className="p-4 sm:p-5 bg-slate-900/80 border-t border-white/10 shrink-0"
            >
              {/* Attachment Inline Error */}
              {attachmentError && (
                <div className="mb-3 px-3.5 py-2 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between gap-2 shadow-sm animate-fadeIn">
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertCircle size={14} className="shrink-0 text-rose-400" />
                    <span className="truncate">{attachmentError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachmentError(null)}
                    className="text-rose-400 hover:text-white transition-colors p-0.5 rounded cursor-pointer"
                    title="Dismiss"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              {/* Attached Files Chips */}
              {attachedFiles.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2 items-center">
                  {attachedFiles.map((att) => (
                    <div
                      key={att.id}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.08] border border-white/15 text-xs text-gray-200 shadow-sm"
                    >
                      <FileText size={13} className="text-cyan-400 shrink-0" />
                      <span className="max-w-[140px] sm:max-w-[180px] truncate font-medium" title={att.name}>
                        {att.name}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        ({formatFileSize(att.size)})
                      </span>
                      {att.isProcessing ? (
                        <Loader2 size={12} className="animate-spin text-glow ml-0.5" />
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(att.id)}
                          className="text-gray-400 hover:text-rose-400 hover:bg-white/10 transition-colors cursor-pointer p-0.5 rounded ml-0.5"
                          title="Remove attachment"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 bg-black/60 border border-white/15 focus-within:border-glow/70 focus-within:ring-1 focus-within:ring-glow/70 rounded-2xl p-1.5 sm:p-2 pl-3.5 sm:pl-4.5 transition-all shadow-inner">
                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.docx,.pptx,.xlsx,.xls,.csv,.txt,.md"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onPaste={handlePaste}
                  placeholder={
                    selectedContracts.length > 0
                      ? `Ask to edit clauses in ${selectedDocTypes.join(' & ')} (e.g., 'Make payment terms 30 days')...`
                      : 'Ask a question or select a document to start...'
                  }
                  disabled={loading}
                  className="flex-1 min-w-0 bg-transparent py-2 text-xs sm:text-sm text-white placeholder:text-gray-500 focus:outline-none"
                />

                <div className="flex items-center gap-1 shrink-0">
                  {/* Paperclip Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    className="p-2 rounded-xl text-gray-400 hover:text-glow hover:bg-white/10 disabled:opacity-30 transition-all cursor-pointer"
                    title="Attach files (.pdf, .docx, .pptx, images, spreadsheets, text)"
                  >
                    <Paperclip size={16} />
                  </button>

                  {/* Send Button */}
                  <button
                    type="submit"
                    disabled={
                      (!inputMessage.trim() && attachedFiles.length === 0) ||
                      loading ||
                      attachedFiles.some((f) => f.isProcessing)
                    }
                    className="p-2 rounded-xl bg-glow text-dark hover:bg-cyan-300 disabled:opacity-30 disabled:hover:bg-glow transition-all cursor-pointer shadow-[0_0_12px_rgba(0,243,255,0.35)] hover:scale-105 active:scale-95 disabled:hover:scale-100"
                    title="Send message"
                  >
                    <Send size={15} />
                  </button>
                </div>
              </div>
              <div className="mt-2 px-1 flex items-center justify-between text-[11px] text-gray-500">
                <span>Attach references (.pdf, .docx, images) or paste screenshots</span>
                <span>Press Enter to send</span>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    {/* Big Pop-up Document Preview Modal */}
    <AnimatePresence>
      {previewModal.isOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-lg">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={`border border-cyan-500/40 rounded-3xl flex flex-col overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.95),0_0_35px_rgba(0,243,255,0.25)] bg-[#0b0c14] text-white transition-all duration-300 ${
              previewFullScreen ? 'w-full h-full rounded-none' : 'w-full max-w-5xl h-[88vh]'
            }`}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-white/10 bg-slate-900/90 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-xl bg-glow/15 border border-glow/40 flex items-center justify-center text-glow shrink-0 shadow-[0_0_10px_rgba(0,243,255,0.2)]">
                  <FileText size={16} />
                </div>
                <h3 className="font-bold text-white text-sm md:text-base truncate">
                  {previewModal.title}
                </h3>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Open in new tab */}
                {previewModal.url && (
                  <a
                    href={previewModal.url.replace('/preview', '/view').replace('/edit', '/view')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors flex items-center gap-1.5 text-xs font-semibold"
                    title="Open in Google Drive / Docs"
                  >
                    <ExternalLink size={16} />
                    <span className="hidden sm:inline">Open Drive</span>
                  </a>
                )}

                {/* Fullscreen toggle */}
                <button
                  type="button"
                  onClick={() => setPreviewFullScreen(!previewFullScreen)}
                  className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                  title={previewFullScreen ? "Exit Fullscreen" : "Fullscreen"}
                >
                  {previewFullScreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
                </button>

                {/* Close button */}
                <button
                  type="button"
                  onClick={() => setPreviewModal({ isOpen: false, url: '', title: '' })}
                  className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                  title="Close preview"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 w-full h-full bg-slate-950 relative">
              {previewModal.url ? (
                <iframe
                  key={`doc-preview-${previewVersion}-${previewModal.url}`}
                  src={previewModal.url}
                  className="w-full h-full border-none"
                  title={previewModal.title}
                  allow="autoplay; encrypted-media; fullscreen"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-3 p-6 text-center">
                  <AlertCircle size={32} className="text-amber-400" />
                  <p className="font-semibold text-white text-base">Document URL Not Available</p>
                  <p className="text-xs text-gray-400 max-w-md">
                    The document URL was not found in the local session or database records.
                  </p>
                  <button
                    type="button"
                    onClick={() => openDocPreview(selectedContracts[0])}
                    className="mt-2 px-4 py-2 rounded-xl bg-glow/20 text-glow border border-glow/40 hover:bg-glow/30 text-xs font-semibold cursor-pointer"
                  >
                    Retry Loading Document
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </>,
    document.body
  );
}
