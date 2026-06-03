import axios from 'axios';

import { useAuthStore } from '@/store/auth.store';

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

// ─── Response interceptor – handle 401 globally ──────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthUrl =
      error.config?.url?.includes('/auth/login') ||
      error.config?.url?.includes('/auth/reset-password');
    if (error.response?.status === 401 && !isAuthUrl) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default apiClient;
