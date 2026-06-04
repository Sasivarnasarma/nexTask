import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';

import { Toast, useToastStore } from '@/store/toast.store';

export const ToastContainer: React.FC = () => {
  const toasts = useToastStore((state) => state.toasts);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 w-full max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </div>
  );
};

const ToastCard: React.FC<{ toast: Toast }> = ({ toast }) => {
  const removeToast = useToastStore((state) => state.removeToast);
  const [isMounted, setIsMounted] = useState(false);

  const dismiss = useCallback(() => {
    setIsMounted(false);
    window.setTimeout(() => {
      removeToast(toast.id);
    }, 300);
  }, [removeToast, toast.id]);

  useEffect(() => {
    // Trigger transition after mount
    const raf = requestAnimationFrame(() => setIsMounted(true));

    let dismissTimer: ReturnType<typeof setTimeout> | undefined;
    if (toast.duration && toast.duration > 0) {
      dismissTimer = setTimeout(() => {
        dismiss();
      }, toast.duration);
    }

    return () => {
      cancelAnimationFrame(raf);
      if (dismissTimer) clearTimeout(dismissTimer);
    };
  }, [toast.duration, dismiss]);

  const config = {
    success: {
      icon: <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />,
      border: 'border-l-4 border-l-emerald-500',
      bgGlow: 'bg-emerald-500/5',
    },
    error: {
      icon: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
      border: 'border-l-4 border-l-rose-500',
      bgGlow: 'bg-rose-500/5',
    },
    warning: {
      icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
      border: 'border-l-4 border-l-amber-500',
      bgGlow: 'bg-amber-500/5',
    },
    info: {
      icon: <Info className="w-5 h-5 text-sky-400 shrink-0" />,
      border: 'border-l-4 border-l-sky-500',
      bgGlow: 'bg-sky-500/5',
    },
  }[toast.type];

  return (
    <div
      className={`
        flex gap-3 p-4 rounded-xl shadow-lg shadow-black/35
        bg-zinc-900/90 border border-zinc-800/80 backdrop-blur-md
        pointer-events-auto transition-all duration-300 ease-out
        ${config.border} ${config.bgGlow}
        ${isMounted ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 translate-x-8 scale-95'}
      `}
      style={{ willChange: 'transform, opacity' }}
      role="alert"
    >
      {config.icon}

      <div className="flex-1 text-sm font-medium text-zinc-200 wrap-break-word leading-snug">
        {toast.message}
      </div>

      <button
        onClick={dismiss}
        className="text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:ring-offset-2 focus:ring-offset-zinc-900 shrink-0"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
