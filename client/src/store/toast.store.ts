import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  addToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (type, message, duration = 4000) => {
    const id = (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)) as string;
    set((state) => ({
      toasts: [...state.toasts, { id, type, message, duration }],
    }));
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
  showSuccess: (message, duration) => {
    useToastStore.getState().addToast('success', message, duration);
  },
  showError: (message, duration) => {
    useToastStore.getState().addToast('error', message, duration);
  },
  showWarning: (message, duration) => {
    useToastStore.getState().addToast('warning', message, duration);
  },
  showInfo: (message, duration) => {
    useToastStore.getState().addToast('info', message, duration);
  },
}));
