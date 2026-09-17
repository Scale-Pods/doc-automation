import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  AlertCircle 
} from 'lucide-react';
import BackgroundAnimation from './BackgroundAnimation';

const STATUS_CONFIGS = {
  signing_complete: {
    type: 'success',
    title: 'Document signed',
    message: "Thanks — your signature has been recorded. The other party will be notified automatically, and you'll receive a copy of the fully executed document by email once it's finalized.",
    icon: CheckCircle2,
    iconColor: 'text-glow',
    iconBg: 'bg-glow/10 border-glow/30 shadow-[0_0_20px_rgba(0,243,255,0.2)]',
    badge: 'Completed',
    badgeClass: 'bg-glow/10 text-glow border-glow/30',
  },
  signing_complete_revision: {
    type: 'success',
    title: 'Changes signed',
    message: "Thank you — your updated document has been signed and recorded. The other party will be notified automatically, and you'll receive a copy of the finalized document by email.",
    icon: CheckCircle2,
    iconColor: 'text-glow',
    iconBg: 'bg-glow/10 border-glow/30 shadow-[0_0_20px_rgba(0,243,255,0.2)]',
    badge: 'Completed',
    badgeClass: 'bg-glow/10 text-glow border-glow/30',
  },
  decline: {
    type: 'error',
    title: 'Signing declined',
    message: "You've declined to sign this document. The sender has been notified and will follow up with you directly.",
    icon: XCircle,
    iconColor: 'text-rose-400',
    iconBg: 'bg-rose-500/10 border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.2)]',
    badge: 'Declined',
    badgeClass: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
  },
  cancel: {
    type: 'warning',
    title: 'Signing cancelled',
    message: "You closed the signing window before finishing. Nothing has been submitted — reopen the link the sender provided whenever you're ready to continue.",
    icon: AlertTriangle,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/10 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.2)]',
    badge: 'Cancelled',
    badgeClass: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  },
  ttl_expired: {
    type: 'error',
    title: 'Link expired',
    message: "This signing link has expired for security reasons. Contact the sender to have a new link issued.",
    icon: Clock,
    iconColor: 'text-rose-400',
    iconBg: 'bg-rose-500/10 border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.2)]',
    badge: 'Expired',
    badgeClass: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
  },
  session_timeout: {
    type: 'warning',
    title: 'Session timed out',
    message: "Your signing session timed out before you finished. Contact the sender to have a new link issued.",
    icon: Clock,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/10 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.2)]',
    badge: 'Timeout',
    badgeClass: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  },
  exception: {
    type: 'error',
    title: 'Something went wrong',
    message: "We hit an unexpected error during signing. Contact the sender and they'll issue a fresh link.",
    icon: AlertCircle,
    iconColor: 'text-rose-400',
    iconBg: 'bg-rose-500/10 border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.2)]',
    badge: 'Error',
    badgeClass: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
  }
};

export default function SigningComplete() {
  const { event, envelopeId, revision } = useMemo(() => {
    if (typeof window === 'undefined') {
      return { event: 'signing_complete', envelopeId: null, revision: null };
    }

    // Helper to safely extract a parameter from standard query search, hash, and href
    const getParam = (name) => {
      // 1. Standard search params parsing (e.g. ?revision=2&event=signing_complete)
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const val = searchParams.get(name);
        if (val != null && val !== '') return val;
      } catch (e) {}

      // 2. Hash query params parsing (e.g. #/signing-complete?revision=2&event=signing_complete)
      try {
        if (window.location.hash && window.location.hash.includes('?')) {
          const hashQuery = window.location.hash.slice(window.location.hash.indexOf('?') + 1);
          const hashParams = new URLSearchParams(hashQuery);
          const val = hashParams.get(name);
          if (val != null && val !== '') return val;
        }
      } catch (e) {}

      // 3. Fallback regex extraction across the entire href (handles secondary '?' or multiple query blocks)
      try {
        const href = window.location.href;
        const regex = new RegExp(`[?&]${name}=([^&#]*)`, 'i');
        const match = href.match(regex);
        if (match && match[1] != null && match[1] !== '') {
          return decodeURIComponent(match[1]);
        }
      } catch (e) {}

      return null;
    };

    const eventParam = getParam('event');
    const envelopeParam = getParam('envelopeId') || getParam('envelope_id');
    const revisionParam = getParam('revision');

    return {
      event: eventParam ? eventParam.toLowerCase().trim() : 'signing_complete',
      envelopeId: envelopeParam ? envelopeParam.trim() : null,
      revision: revisionParam ? revisionParam.trim() : null
    };
  }, []);

  const config = useMemo(() => {
    const isSuccess = !event || event === 'signing_complete' || event === 'completed' || event === 'success';
    if (isSuccess) {
      const revNum = parseInt(revision, 10);
      if (!isNaN(revNum) && revNum >= 2) {
        return STATUS_CONFIGS.signing_complete_revision;
      }
      return STATUS_CONFIGS.signing_complete;
    }
    if (event === 'decline' || event === 'declined') {
      return STATUS_CONFIGS.decline;
    }
    if (event === 'cancel' || event === 'cancelled') {
      return STATUS_CONFIGS.cancel;
    }
    if (event === 'ttl_expired' || event === 'expired') {
      return STATUS_CONFIGS.ttl_expired;
    }
    if (event === 'session_timeout' || event === 'timeout') {
      return STATUS_CONFIGS.session_timeout;
    }
    if (event === 'exception' || event === 'error' || event === 'failed') {
      return STATUS_CONFIGS.exception;
    }
    // Unrecognized event fallback
    return STATUS_CONFIGS.exception;
  }, [event, revision]);

  const IconComponent = config.icon;

  return (
    <div className="relative w-full min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-dark text-white font-sans antialiased selection:bg-glow selection:text-dark">
      <BackgroundAnimation />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-lg flex flex-col items-center"
      >
        {/* Main Status Card */}
        <div className="glass-panel w-full p-8 sm:p-10 rounded-3xl relative overflow-hidden border border-white/10 shadow-2xl flex flex-col items-center text-center">
          {/* Subtle top glowing line */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-glow to-transparent opacity-70" />

          {/* Status Icon */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 border ${config.iconBg}`}
          >
            <IconComponent size={40} className={config.iconColor} />
          </motion.div>

          {/* Status Badge */}
          <span className={`text-[11px] font-semibold tracking-wider uppercase px-3 py-1 rounded-full border mb-4 ${config.badgeClass}`}>
            {config.badge}
          </span>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3 tracking-tight">
            {config.title}
          </h1>

          {/* Message */}
          <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-4 max-w-md">
            {config.message}
          </p>

          {/* Safe to close text */}
          <p className="text-xs sm:text-sm text-gray-400 font-medium">
            You can safely close this tab now.
          </p>

          {/* Envelope ID (if present) */}
          {envelopeId && (
            <div className="mt-8 pt-6 border-t border-white/10 w-full">
              <p className="text-xs text-gray-500 font-mono tracking-wider break-all">
                Envelope: <span className="text-gray-400 select-all">{envelopeId}</span>
              </p>
            </div>
          )}
        </div>

        {/* Small Muted Guidance Text Below Card */}
        <p className="text-xs text-gray-400/90 text-center max-w-md mt-6 leading-relaxed px-2">
          If you believe this document needs changes before it's finalized, contact the sender directly — they can reissue it for a new signature.
        </p>
      </motion.div>
    </div>
  );
}
