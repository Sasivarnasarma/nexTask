import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { refreshSession } from './api/auth.api';
import { Navbar } from './components/Navbar';
import { PushNotificationPrompt } from './components/PushNotificationPrompt';
import { Sidebar } from './components/Sidebar';
import { ThemeProvider } from './components/ThemeProvider';
import { RedirectIfAuthenticated, RequireAuth } from './components/auth/RouteGuard';
import { ToastContainer } from './components/ui/Toast';
import './index.css';
import { Calendar } from './pages/Calendar';
import { Dashboard } from './pages/Dashboard';
import MessagesPage from './pages/MessagesPage';
import { Settings } from './pages/Settings';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import ForceResetPage from './pages/auth/ForceResetPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import LoginPage from './pages/auth/LoginPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import ProfilePage from './pages/profile/ProfilePage';
import { useAuthStore } from './store/auth.store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

const DashboardLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    // Changed bg-slate-50 to bg-background and added text-foreground
    <div className="flex h-screen bg-background text-foreground overflow-hidden relative transition-colors duration-300">
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          // Changed bg-slate-950/40 to bg-background/80 for a universal theme blur
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 focus:ring-2 focus:ring-primary"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-300 ease-in-out shrink-0 bg-background md:relative md:translate-x-0 ${
          isSidebarOpen ? 'md:w-64' : 'md:w-20'
        }`}
      >
        <div className="w-full h-full overflow-hidden">
          <Sidebar isOpen={isSidebarOpen} />
        </div>
      </div>

      {/* Changed bg-white and border-slate-200 to theme variables */}
      <div className="flex-1 flex flex-col bg-background border-l border-border min-w-0 transition-all duration-300 h-screen">
        <Navbar onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
        {/* Changed bg-zinc-950 to bg-background */}
        <main className="flex-1 flex flex-col min-h-0 bg-background overflow-y-auto">
          <Routes>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="admin" element={<AdminDashboard />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Routes>
        </main>
      </div>
      <PushNotificationPrompt />
    </div>
  );
};

// Helper to decode JWT payload client-side without external dependencies
function decodeJwt(token: string): { exp: number } | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

// Proactive background session refresher component
const TokenRefresher: React.FC = () => {
  const { token, setAuth, logout } = useAuthStore();

  useEffect(() => {
    if (!token) return;

    const payload = decodeJwt(token);
    if (!payload || !payload.exp) return;

    const expirationTime = payload.exp * 1000;
    const remainingTime = expirationTime - Date.now();

    if (remainingTime <= 0) return;

    // Refresh when there is 6 hours remaining, or after 10 seconds if already in buffer
    const bufferTime = 6 * 60 * 60 * 1000; // 6 hours
    const delay = remainingTime > bufferTime ? remainingTime - bufferTime : 10000;

    console.log(
      `[SESSION] Token expires in ${Math.round(remainingTime / 60000)} minutes. Scheduling background refresh in ${Math.round(delay / 60000)} minutes.`,
    );

    const timeoutId = setTimeout(async () => {
      try {
        console.log('[SESSION] Triggering proactive background session refresh...');
        const data = await refreshSession();
        const currentUser = useAuthStore.getState().user;
        if (currentUser) {
          setAuth(data.token, { ...currentUser, mustResetPassword: data.mustResetPassword });
          console.log('[SESSION] Session refreshed successfully.');
        }
      } catch (err) {
        console.error('[SESSION] Background session refresh failed:', err);
      }
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [token, setAuth, logout]);

  return null;
};

const App: React.FC = () => {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TokenRefresher />
          <Routes>
            {/* 1. Unauthenticated Routes */}
            <Route
              path="/login"
              element={
                <RedirectIfAuthenticated>
                  <LoginPage />
                </RedirectIfAuthenticated>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <RedirectIfAuthenticated>
                  <ForgotPasswordPage />
                </RedirectIfAuthenticated>
              }
            />
            <Route
              path="/reset-password"
              element={
                <RedirectIfAuthenticated>
                  <ResetPasswordPage />
                </RedirectIfAuthenticated>
              }
            />
            <Route
              path="/force-reset"
              element={
                <RequireAuth>
                  <ForceResetPage />
                </RequireAuth>
              }
            />

            {/* 2. Secured Routes (Requires Login) */}
            <Route
              path="/*"
              element={
                <RequireAuth>
                  <DashboardLayout />
                </RequireAuth>
              }
            />
          </Routes>
          <ToastContainer />
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
