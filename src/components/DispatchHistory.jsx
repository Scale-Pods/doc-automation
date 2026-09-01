import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Search, Eye, Loader2, X, ChevronDown, Maximize, Minimize } from 'lucide-react';

export default function DispatchHistory() {
  const [historyData, setHistoryData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeDropdownRow, setActiveDropdownRow] = useState(null);
  const [modalState, setModalState] = useState({ isOpen: false, url: null, title: '' });
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch('https://n8n.srv1711190.hstgr.cloud/webhook/9d00921b-435e-457c-a4ab-7176bc3953d5');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        // Handle n8n array response or object containing an array
        const records = Array.isArray(data) ? data : (data.data || []);
        setHistoryData([...records].reverse());
      } catch (error) {
        console.error('Error fetching dispatch history:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchHistory();
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdownRow(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getEmbedUrl = (url) => {
    if (!url) return '';
    let cleanUrl = url.trim();
    if (cleanUrl.startsWith('[')) cleanUrl = cleanUrl.substring(1);
    if (cleanUrl.endsWith(']')) cleanUrl = cleanUrl.substring(0, cleanUrl.length - 1);
    
    if (cleanUrl.includes('drive.google.com/file/d/')) {
      return cleanUrl.replace('/view', '/preview');
    }
    return cleanUrl;
  };

  const openModal = (url, title) => {
    setModalState({ isOpen: true, url: getEmbedUrl(url), title });
    setIsFullScreen(false);
    setActiveDropdownRow(null);
  };

  const closeModal = () => {
    setModalState({ isOpen: false, url: null, title: '' });
  };

  const toggleDropdown = (id) => {
    setActiveDropdownRow(prev => prev === id ? null : id);
  };

  const filteredData = historyData.filter(row => {
    if (!searchQuery.trim()) return true;
    const lowerQuery = searchQuery.toLowerCase();
    const company = (row.company || row['Client Company'] || row.client_company_name || '').toString().toLowerCase();
    const email = (row.email || row['Client Email'] || row.client_email || row.client_email_address || '').toString().toLowerCase();
    return company.includes(lowerQuery) || email.includes(lowerQuery);
  });

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-12 relative overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="max-w-6xl mx-auto mt-16 md:mt-0"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight flex items-center gap-4">
            <History className="text-glow" size={40} />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 py-2">Dispatch History</span>
          </h1>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search records..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-auto pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-glow transition-colors"
            />
          </div>
        </div>

        <div className="glass-panel rounded-3xl overflow-visible relative border border-white/10">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-glow to-transparent opacity-50" />
          
          <div className="w-full">
            <table className="w-full text-left border-collapse block md:table">
              <thead className="hidden md:table-header-group">
                <tr className="bg-white/5 border-b border-white/10 md:table-row flex flex-col">
                  <th className="px-4 py-4 md:px-6 md:py-4 text-sm font-semibold text-gray-300 md:table-cell block">Date</th>
                  <th className="px-4 py-4 md:px-6 md:py-4 text-sm font-semibold text-gray-300 md:table-cell block">Client Company</th>
                  <th className="px-4 py-4 md:px-6 md:py-4 text-sm font-semibold text-gray-300 md:table-cell block">Client Email</th>
                  <th className="px-4 py-4 md:px-6 md:py-4 text-sm font-semibold text-gray-300 md:table-cell block">Documents</th>
                  <th className="px-4 py-4 md:px-6 md:py-4 text-sm font-semibold text-gray-300 text-right md:table-cell block">Actions</th>
                </tr>
              </thead>
              <tbody className="block md:table-row-group">
                {isLoading ? (
                  <tr className="block md:table-row">
                    <td colSpan="5" className="block md:table-cell px-6 py-12 text-center text-gray-400">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Loader2 className="animate-spin text-glow" size={32} />
                        <span>Loading records...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr className="block md:table-row">
                    <td colSpan="5" className="block md:table-cell px-6 py-12 text-center text-gray-400">
                      {historyData.length === 0 ? "No dispatch records found." : "No records match your search."}
                    </td>
                  </tr>
                ) : (
                  filteredData.map((row, i) => {
                    const rowId = row.id || i;
                    const date = row.date || row.Date || row.timestamp || '-';
                    const company = row.company || row['Client Company'] || row.client_company_name || '-';
                    const email = row.email || row['Client Email'] || row.client_email || row.client_email_address || '-';
                    const docsRaw = row.documents || row.Documents || row.docs || [];
                    const docs = Array.isArray(docsRaw) ? docsRaw : (typeof docsRaw === 'string' ? docsRaw.split(',').map(s => s.trim()) : []);
                    
                    const slaLink = row['SLA Link'] || row.sla_link || row.slaLink;
                    const ndaLink = row['NDA Link'] || row.nda_link || row.ndaLink;
                    
                    return (
                      <tr key={rowId} className="block md:table-row border border-white/10 md:border-0 md:border-b md:border-white/5 hover:bg-white/5 transition-colors mb-4 md:mb-0 rounded-xl md:rounded-none p-4 md:p-0">
                        <td className="block md:table-cell px-4 py-3 md:px-6 md:py-4 text-gray-300 break-words">
                          <span className="inline-block md:hidden font-semibold text-gray-400 w-24">Date:</span>
                          {date}
                        </td>
                        <td className="block md:table-cell px-4 py-3 md:px-6 md:py-4 font-medium text-white break-words">
                          <span className="inline-block md:hidden font-semibold text-gray-400 w-24">Company:</span>
                          {company}
                        </td>
                        <td className="block md:table-cell px-4 py-3 md:px-6 md:py-4 text-gray-300 break-words">
                          <span className="inline-block md:hidden font-semibold text-gray-400 w-24">Email:</span>
                          {email}
                        </td>
                        <td className="block md:table-cell px-4 py-3 md:px-6 md:py-4">
                          <div className="flex flex-wrap gap-2 items-center">
                            <span className="inline-block md:hidden font-semibold text-gray-400 w-24">Docs:</span>
                            {docs.filter(Boolean).map(doc => (
                              <span key={doc} className="px-2 py-1 text-xs rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                {doc}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="block md:table-cell px-4 py-3 md:px-6 md:py-4 md:text-right mt-2 md:mt-0 border-t border-white/10 md:border-t-0 relative">
                          <div className="flex items-center justify-start md:justify-end">
                            <div className="relative" ref={activeDropdownRow === rowId ? dropdownRef : null}>
                              <button 
                                onClick={() => toggleDropdown(rowId)}
                                className="text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg w-full md:w-auto"
                              >
                                <Eye size={18} />
                                <span className="font-medium text-sm">View</span>
                                <ChevronDown size={14} className={`transition-transform ${activeDropdownRow === rowId ? 'rotate-180' : ''}`} />
                              </button>
                              
                              {/* Dropdown Menu */}
                              <AnimatePresence>
                                {activeDropdownRow === rowId && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute right-0 mt-2 w-48 bg-gray-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
                                  >
                                    <div className="p-1">
                                      <button 
                                        onClick={() => openModal(slaLink, 'SLA Document')}
                                        disabled={!slaLink}
                                        className={`w-full text-left px-4 py-2 text-sm rounded-lg transition-colors ${slaLink ? 'text-gray-300 hover:bg-white/10 hover:text-white' : 'text-gray-600 cursor-not-allowed'}`}
                                      >
                                        View SLA
                                      </button>
                                      <button 
                                        onClick={() => openModal(ndaLink, 'NDA Document')}
                                        disabled={!ndaLink}
                                        className={`w-full text-left px-4 py-2 text-sm rounded-lg transition-colors ${ndaLink ? 'text-gray-300 hover:bg-white/10 hover:text-white' : 'text-gray-600 cursor-not-allowed'}`}
                                      >
                                        View NDA
                                      </button>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>

      {/* Document Viewer Modal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {modalState.isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[99999] flex items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className={`bg-gray-900 border border-white/10 ${isFullScreen ? 'w-[100vw] h-[100vh] max-w-[100vw] rounded-none' : 'w-[90vw] h-[90vh] max-w-[90vw] rounded-2xl'} shadow-2xl flex flex-col overflow-hidden relative transition-all duration-300`}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gray-900 relative z-10 shrink-0">
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Eye className="text-glow" size={20} />
                    {modalState.title}
                  </h2>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setIsFullScreen(!isFullScreen)}
                      className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                      title={isFullScreen ? "Minimize" : "Maximize"}
                    >
                      {isFullScreen ? <Minimize size={20} /> : <Maximize size={20} />}
                    </button>
                    <button 
                      onClick={closeModal}
                      className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                      title="Close"
                    >
                      <X size={24} />
                    </button>
                  </div>
                </div>
                
                {/* Modal Body / Iframe */}
                <div className="flex-grow w-full bg-gray-800 relative overflow-hidden">
                  {modalState.url ? (
                    <iframe 
                      src={modalState.url} 
                      className="w-full h-full bg-white border-0 m-0 p-0"
                      title={modalState.title}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                      <Eye size={48} className="mb-4 opacity-50" />
                      <p>Document URL not available</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

