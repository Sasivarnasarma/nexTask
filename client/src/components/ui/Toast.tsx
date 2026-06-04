import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToastStore, Toast } from '@/store/toast.store';

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

  useEffect(() => {
    // Trigger transition after mount
    const raf = requestAnimationFrame(() => setIsMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleDismiss = () => {
    setIsMounted(false);
    setTimeout(() => {
      removeToast(toast.id);
    }, 300);
  };

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
      
      <div className="flex-1 text-sm font-medium text-zinc-200 break-words leading-snug">
        {toast.message}
      </div>

      <button
        onClick={handleDismiss}
        className="text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none shrink-0"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
