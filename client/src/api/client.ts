import axios from 'axios';

import { useAuthStore } from '@/store/auth.store';
import { useToastStore } from '@/store/toast.store';
import { extractApiError } from '@/lib/apiError';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ─── Request interceptor – attach JWT ────────────────────────────────────────
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor – handle 401 globally & error toasts ───────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthUrl =
      error.config?.url?.includes('/auth/login') ||
      error.config?.url?.includes('/auth/reset-password');
    if (error.response?.status === 401 && !isAuthUrl) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    } else {
      const skipGlobalToast = (error.config as Record<string, unknown> & { skipGlobalToast?: boolean })?.skipGlobalToast;
      if (!skipGlobalToast && !isAuthUrl) {
        const message = extractApiError(error);
        useToastStore.getState().showError(message);
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;

