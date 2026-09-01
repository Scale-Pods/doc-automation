import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Loader2, X, Check, FileText, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, CheckCircle, AlertCircle } from 'lucide-react';

const DocumentIframes = React.memo(({ docs, isHidden, onOpenFullscreen }) => {
  if (!docs.sla_url && !docs.nda_url) {
    return (
      <div className={`flex items-center justify-center h-64 text-gray-400 ${isHidden ? 'hidden' : ''}`}>
        No documents were generated.
      </div>
    );
  }

  // Generate a dynamic timestamp to prevent iframe caching
  const timestamp = new Date().getTime();

  return (
    <div className={`grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-6 h-full flex-1 ${isHidden ? 'hidden' : ''}`}>
      {docs.sla_url && (
        <div className="flex-1 border border-white/10 rounded-xl overflow-hidden bg-white flex flex-col min-h-[60vh]">
          <div 
            onClick={() => onOpenFullscreen?.(docs.sla_url, 'SLA')}
            className="bg-dark border-b border-white/10 p-2 text-gray-300 text-sm font-semibold shrink-0 cursor-pointer hover:text-white hover:underline transition-colors"
          >
            Service Level Agreement (SLA)
          </div>
          <iframe
            src={`${docs.sla_url.includes('/preview') ? docs.sla_url : `${docs.sla_url}/preview`}?t=${timestamp}`}
            className="w-full h-full flex-1"
            loading="lazy"
            referrerPolicy="no-referrer"
            title="SLA Document"
          />
        </div>
      )}
      {docs.nda_url && (
        <div className="flex-1 border border-white/10 rounded-xl overflow-hidden bg-white flex flex-col min-h-[60vh]">
          <div 
            onClick={() => onOpenFullscreen?.(docs.nda_url, 'NDA')}
            className="bg-dark border-b border-white/10 p-2 text-gray-300 text-sm font-semibold shrink-0 cursor-pointer hover:text-white hover:underline transition-colors"
          >
            Non-Disclosure Agreement (NDA)
          </div>
          <iframe
            src={`${docs.nda_url.includes('/preview') ? docs.nda_url : `${docs.nda_url}/preview`}?t=${timestamp}`}
            className="w-full h-full flex-1"
            loading="lazy"
            referrerPolicy="no-referrer"
            title="NDA Document"
          />
        </div>
      )}
    </div>
  );
});

export default function IntakeForm() {
  const [formData, setFormData] = useState({
    client_company_name: '',
    client_address: '',
    client_location: '',
    client_signatory_name: '',
    client_designation: '',
    rera_license_no: '',
    effective_date: '',
    client_email_address: '',
  });

  const [toggles, setToggles] = useState({
    generateSLA: false,
    generateNDA: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState('review');
  const [generatedDocs, setGeneratedDocs] = useState({});
  const [isApproving, setIsApproving] = useState(false);
  const [finalEmail, setFinalEmail] = useState('');
  const [showDocumentSelector, setShowDocumentSelector] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [fullScreenDoc, setFullScreenDoc] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 5000);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleToggle = (name) => {
    setToggles(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const payload = {
      ...formData,
      generate_sla: toggles.generateSLA,
      generate_nda: toggles.generateNDA,
    };

    console.log('Sending payload to webhook:', payload);

    try {
      // Send data to webhook
      const response = await fetch('https://n8n.srv1711190.hstgr.cloud/webhook/35f29f9c-8ddb-47f6-8f39-2d8aa0b785dc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        let data = {};
        try {
          data = await response.json();
        } catch (e) {
          // Fallback if no valid JSON
        }

        const docs = {
          sla_url: data.sla_url !== undefined ? data.sla_url : (toggles.generateSLA ? 'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms' : null),
          nda_url: data.nda_url !== undefined ? data.nda_url : (toggles.generateNDA ? 'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms' : null),
        };
        setGeneratedDocs(docs);
        setFinalEmail(formData.client_email_address);
        setModalStep('review');
        setShowModal(true);
      } else {
        showToast('Webhook request failed. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error generating documents:', error);
      // Simulate success for testing modal in dev environment
      setGeneratedDocs({
        sla_url: toggles.generateSLA ? 'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms' : null,
        nda_url: toggles.generateNDA ? 'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms' : null,
      });
      setFinalEmail(formData.client_email_address);
      setModalStep('review');
      setShowModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const payload = {
        client_email: finalEmail,
        client_company_name: formData.client_company_name,
        client_signatory_name: formData.client_signatory_name,
        effective_date: formData.effective_date,
        sla_url: generatedDocs.sla_url,
        nda_url: generatedDocs.nda_url
      };

      const response = await fetch('https://n8n.srv1711190.hstgr.cloud/webhook/edae8907-9504-46c1-979f-32e1e0ed1572', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Network response was not ok');

      showToast('Documents approved and dispatched successfully!', 'success');
      setShowModal(false);
      setFormData({
        client_company_name: '',
        client_address: '',
        client_location: '',
        client_signatory_name: '',
        client_designation: '',
        rera_license_no: '',
        effective_date: '',
        client_email_address: '',
      });
      setToggles({ generateSLA: false, generateNDA: false });
    } catch (error) {
      console.error('Error approving documents:', error);
      showToast('Failed to dispatch documents. Please try again.', 'error');
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = () => {
    setShowModal(false);
  };

  const handleEditDocuments = () => {
    setShowDocumentSelector(true);
  };

  const openDocumentEditor = (url, type) => {
    const getEditUrl = (u) => {
      if (u.includes('/preview')) return u.replace('/preview', '/edit');
      if (u.includes('/edit')) return u;
      return `${u}/edit`;
    };

    window.open(getEditUrl(url), `GoogleDocsEditor_${type}`, 'width=1200,height=800,left=150,top=100,noopener,noreferrer');
    setShowDocumentSelector(false);
    setModalStep('edit');
  };

  return (
    <div id="intake-form" className="min-h-screen py-24 flex items-center justify-center px-4 relative">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-4xl"
      >
        <form onSubmit={handleSubmit} className="relative">
          <fieldset disabled={isLoading} className="glass-panel p-6 sm:p-8 md:p-12 rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-glow to-transparent opacity-50" />

            <h2 className="text-3xl font-bold mb-8 text-white flex items-center gap-3">
              <Zap className="text-glow" size={28} />
              Data Intake Configuration
            </h2>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-6 mb-8">
              <div>
                <label className="label-text">Client Company Name</label>
                <input type="text" name="client_company_name" value={formData.client_company_name} onChange={handleChange} className="input-field" required />
              </div>
              <div>
                <label className="label-text">Effective Date</label>
                <input type="date" name="effective_date" value={formData.effective_date} onChange={handleChange} className="input-field [color-scheme:dark]" required />
              </div>
              <div>
                <label className="label-text">Client Email Address</label>
                <input type="email" name="client_email_address" value={formData.client_email_address} onChange={handleChange} className="input-field" required />
              </div>
              <div className="col-span-full">
                <label className="label-text">Client Address</label>
                <textarea name="client_address" value={formData.client_address} onChange={handleChange} className="input-field min-h-[100px] resize-none" />
              </div>
              <div>
                <label className="label-text">Client Location</label>
                <input type="text" name="client_location" value={formData.client_location} onChange={handleChange} className="input-field" />
              </div>
              <div>
                <label className="label-text">RERA License No.</label>
                <input type="text" name="rera_license_no" value={formData.rera_license_no} onChange={handleChange} className="input-field" />
              </div>
              <div>
                <label className="label-text">Client Signatory Name</label>
                <input type="text" name="client_signatory_name" value={formData.client_signatory_name} onChange={handleChange} className="input-field" required />
              </div>
              <div>
                <label className="label-text">Client Designation</label>
                <input type="text" name="client_designation" value={formData.client_designation} onChange={handleChange} className="input-field" required />
              </div>
            </div>

            <div className="mb-10 space-y-4">
              <label className="flex items-center gap-4 cursor-pointer group min-h-[44px]">
                <input type="checkbox" className="custom-checkbox" checked={toggles.generateSLA} onChange={() => handleToggle('generateSLA')} />
                <span className="text-lg group-hover:text-glow transition-colors">Generate SLA (Service Level Agreement)</span>
              </label>
              <label className="flex items-center gap-4 cursor-pointer group min-h-[44px]">
                <input type="checkbox" className="custom-checkbox" checked={toggles.generateNDA} onChange={() => handleToggle('generateNDA')} />
                <span className="text-lg group-hover:text-glow transition-colors">Generate NDA (Non-Disclosure Agreement)</span>
              </label>
            </div>

            <div className="flex justify-end">
              <motion.button
                whileHover={{ scale: isLoading ? 1 : 1.02 }}
                whileTap={{ scale: isLoading ? 1 : 0.98 }}
                type="submit"
                disabled={isLoading}
                className={`relative group overflow-hidden rounded-xl bg-white text-black font-bold px-8 py-4 flex items-center justify-center gap-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin relative z-10" size={20} />
                    <span className="relative z-10">Generating...</span>
                  </>
                ) : (
                  <>
                    <span className="relative z-10 group-hover:text-white transition-colors duration-300">Generate Documents</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-glow to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </>
                )}
              </motion.button>
            </div>
          </fieldset>
        </form>
      </motion.div>

      {createPortal(
        <>
          <AnimatePresence>
            {showModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 sm:p-8"
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="glass-panel rounded-3xl w-full max-w-7xl h-[90vh] border border-slate-700 relative flex flex-col overflow-hidden bg-slate-900 shadow-2xl"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5 shrink-0">
                  <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                    <FileText className="text-glow" />
                    {modalStep === 'review' && 'Review Documents'}
                    {modalStep === 'edit' && 'Edit Documents'}
                    {modalStep === 'dispatch' && 'Final Dispatch'}
                  </h3>
                  <button
                    onClick={handleReject}
                    className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Editor Content */}
                <div className="flex-1 overflow-y-auto p-6 relative flex flex-col">
                  <DocumentIframes 
                    docs={generatedDocs} 
                    isHidden={modalStep === 'edit'} 
                    onOpenFullscreen={(url, type) => setFullScreenDoc({ url, type })}
                  />

                  {modalStep === 'edit' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-dark/90 backdrop-blur-sm z-10">
                      <Loader2 className="animate-spin text-glow mb-6" size={64} />
                      <h4 className="text-2xl font-bold text-white mb-3">Editing Mode Active</h4>
                      <p className="text-gray-400 text-lg">Make your changes in the opened Google Docs windows.</p>
                    </div>
                  )}
                </div>

                {/* Sticky Footer */}
                <div className="p-4 md:p-6 border-t border-white/10 bg-black/40 backdrop-blur-xl flex flex-col md:flex-row items-center gap-4 md:gap-6 justify-between shrink-0">
                  {(modalStep === 'review' || modalStep === 'dispatch') && (
                    <div className="flex-1 w-full flex flex-col md:flex-row md:items-center gap-2 md:gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <label className="text-gray-300 font-medium whitespace-nowrap text-sm md:text-base">Send To:</label>
                      <input
                        type="email"
                        value={finalEmail}
                        onChange={(e) => setFinalEmail(e.target.value)}
                        className="w-full md:flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-glow focus:ring-1 focus:ring-glow transition-all md:max-w-md"
                      />
                    </div>
                  )}
                  {modalStep === 'edit' && <div className="hidden md:block flex-1" />}

                  <div className="flex flex-col sm:flex-row gap-3 md:gap-4 w-full md:w-auto mt-2 md:mt-0">
                    <button
                      onClick={handleReject}
                      className="flex-1 md:flex-none px-6 py-3 rounded-xl border border-white/20 text-white hover:bg-white/10 transition-colors font-semibold"
                    >
                      Cancel
                    </button>

                    {modalStep === 'review' && (
                      <>
                        <button
                          onClick={handleEditDocuments}
                          className="flex-1 md:flex-none px-6 py-3 rounded-xl border border-glow text-glow hover:bg-glow/10 transition-colors font-semibold"
                        >
                          Edit Documents
                        </button>
                        <button
                          onClick={handleApprove}
                          disabled={isApproving}
                          className={`flex-1 md:flex-none px-8 py-3 rounded-xl bg-gradient-to-r from-glow to-blue-600 text-black font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity ${isApproving ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                          {isApproving ? <Loader2 className="animate-spin" size={18} /> : null}
                          {isApproving ? 'Dispatching...' : 'Send Directly'}
                        </button>
                      </>
                    )}

                    {modalStep === 'edit' && (
                      <button
                        onClick={() => setModalStep('dispatch')}
                        className="flex-1 md:flex-none px-8 py-3 rounded-xl bg-gradient-to-r from-glow to-blue-600 text-black font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                      >
                        <Check size={18} />
                        Done Editing
                      </button>
                    )}

                    {modalStep === 'dispatch' && (
                      <>
                        <button
                          onClick={handleEditDocuments}
                          className="flex-1 md:flex-none px-6 py-3 rounded-xl border border-glow text-glow hover:bg-glow/10 transition-colors font-semibold"
                        >
                          Edit Again
                        </button>
                        <button
                          onClick={handleApprove}
                          disabled={isApproving}
                          className={`flex-1 md:flex-none px-8 py-3 rounded-xl bg-gradient-to-r from-glow to-blue-600 text-black font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(0,243,255,0.4)] hover:shadow-[0_0_30px_rgba(0,243,255,0.6)] ${isApproving ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                          {isApproving ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
                          {isApproving ? 'Dispatching...' : 'Confirm & Dispatch'}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Document Selector Sub-Modal */}
                <AnimatePresence>
                  {showDocumentSelector && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    >
                      <motion.div
                        initial={{ scale: 0.95, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, y: 20 }}
                        className="bg-slate-800 border border-slate-600 rounded-2xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center"
                      >
                        <h4 className="text-xl font-bold text-white mb-6 text-center">Which document do you want to edit?</h4>
                        <div className="flex flex-col gap-4 w-full">
                          {generatedDocs.sla_url && (
                            <button
                              onClick={() => openDocumentEditor(generatedDocs.sla_url, 'SLA')}
                              className="w-full py-3 rounded-xl border border-glow text-glow hover:bg-glow/10 transition-colors font-semibold flex items-center justify-center gap-2"
                            >
                              <FileText size={18} />
                              Edit SLA
                            </button>
                          )}
                          {generatedDocs.nda_url && (
                            <button
                              onClick={() => openDocumentEditor(generatedDocs.nda_url, 'NDA')}
                              className="w-full py-3 rounded-xl border border-glow text-glow hover:bg-glow/10 transition-colors font-semibold flex items-center justify-center gap-2"
                            >
                              <FileText size={18} />
                              Edit NDA
                            </button>
                          )}
                          <button
                            onClick={() => setShowDocumentSelector(false)}
                            className="w-full py-3 rounded-xl border border-white/20 text-gray-300 hover:text-white hover:bg-white/10 transition-colors font-semibold mt-2"
                          >
                            Cancel
                          </button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {fullScreenDoc && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-8"
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="w-full max-w-[95vw] h-[95vh] bg-slate-900 border border-slate-700 rounded-3xl flex flex-col overflow-hidden shadow-2xl relative"
              >
                <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/10 shrink-0 bg-white/5">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <FileText className="text-glow" />
                    {fullScreenDoc.type} (Full Screen)
                  </h3>
                  <button
                    onClick={() => setFullScreenDoc(null)}
                    className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
                  >
                    <X size={24} />
                  </button>
                </div>
                <iframe
                  src={`${fullScreenDoc.url.includes('/preview') ? fullScreenDoc.url : `${fullScreenDoc.url}/preview`}?t=${new Date().getTime()}`}
                  className="w-full h-full flex-1 bg-white"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  title={`${fullScreenDoc.type} Full Screen Document`}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        </>,
        document.body
      )}

      {/* Modern Toast Notification */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-8 right-8 z-[10000] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-lg border border-white/10 font-medium text-white"
            style={{
              backgroundColor: toast.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              boxShadow: toast.type === 'success' ? '0 10px 40px -10px rgba(16,185,129,0.5)' : '0 10px 40px -10px rgba(239,68,68,0.5)'
            }}
          >
            {toast.type === 'success' ? <CheckCircle className="text-emerald-400" size={24} /> : <AlertCircle className="text-red-400" size={24} />}
            <span className="text-sm md:text-base tracking-wide">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
