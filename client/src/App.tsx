import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';

import { refreshSession } from './api/auth.api';
import { ThemeProvider } from './components/ThemeProvider';
import { RedirectIfAuthenticated, RequireAuth } from './components/auth/RouteGuard';
import { ToastContainer } from './components/ui/Toast';
import './index.css';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminDashboardView } from './pages/admin/AdminDashboardView';
import { AdminUsersView } from './pages/admin/AdminUsersView';
import { AdminProjectsView } from './pages/admin/AdminProjectsView';
import { AdminReportsView } from './pages/admin/AdminReportsView';
import { AdminNotificationsView } from './pages/admin/AdminNotificationsView';
import { AdminSettingsView } from './pages/admin/AdminSettingsView';
import { AdminProfileView } from './pages/admin/AdminProfileView';
import { PmLayout } from './pages/pm/PmLayout';
import { PmDashboardView } from './pages/pm/PmDashboardView';
import { PmProjectsView } from './pages/pm/PmProjectsView';
import { PmTasksView } from './pages/pm/PmTasksView';
import { PmReportsView } from './pages/pm/PmReportsView';
import { PmNotificationsView } from './pages/pm/PmNotificationsView';
import { PmProfileView } from './pages/pm/PmProfileView';
import { CollaboratorLayout } from './pages/collaborator/CollaboratorLayout';
import { CollaboratorDashboardView } from './pages/collaborator/CollaboratorDashboardView';
import { CollaboratorTasksView } from './pages/collaborator/CollaboratorTasksView';
import { CollaboratorProjectsView } from './pages/collaborator/CollaboratorProjectsView';
import { CollaboratorNotificationsView } from './pages/collaborator/CollaboratorNotificationsView';
import { CollaboratorProfileView } from './pages/collaborator/CollaboratorProfileView';
import ForceResetPage from './pages/auth/ForceResetPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import LoginPage from './pages/auth/LoginPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
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
  const { user } = useAuthStore();
  const location = useLocation();

  if (user?.role === 'ADMIN') {
    if (!location.pathname.startsWith('/admin')) {
      if (location.pathname === '/settings') {
        return <Navigate to="/admin/settings" replace />;
      }
      if (location.pathname === '/profile') {
        return <Navigate to="/admin/profile" replace />;
      }
      return <Navigate to="/admin/dashboard" replace />;
    }

    return (
      <AdminLayout isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen}>
        <Routes>
          <Route path="admin/dashboard" element={<AdminDashboardView />} />
          <Route path="admin/users" element={<AdminUsersView />} />
          <Route path="admin/projects" element={<AdminProjectsView />} />
          <Route path="admin/reports" element={<AdminReportsView />} />
          <Route path="admin/notifications" element={<AdminNotificationsView />} />
          <Route path="admin/settings" element={<AdminSettingsView />} />
          <Route path="admin/profile" element={<AdminProfileView />} />
          <Route path="*" element={<Navigate to="admin/dashboard" replace />} />
        </Routes>
      </AdminLayout>
    );
  }

  if (user?.role === 'PROJECT_MANAGER') {
    if (!location.pathname.startsWith('/pm')) {
      if (location.pathname === '/profile' || location.pathname === '/settings') {
        return <Navigate to="/pm/profile" replace />;
      }
      return <Navigate to="/pm/dashboard" replace />;
    }

    return (
      <PmLayout isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen}>
        <Routes>
          <Route path="pm/dashboard" element={<PmDashboardView />} />
          <Route path="pm/projects" element={<PmProjectsView />} />
          <Route path="pm/tasks" element={<PmTasksView />} />
          <Route path="pm/reports" element={<PmReportsView />} />
          <Route path="pm/notifications" element={<PmNotificationsView />} />
          <Route path="pm/profile" element={<PmProfileView />} />
          <Route path="*" element={<Navigate to="pm/dashboard" replace />} />
        </Routes>
      </PmLayout>
    );
  }

  if (user?.role === 'COLLABORATOR') {
    if (!location.pathname.startsWith('/collaborator')) {
      if (location.pathname === '/profile' || location.pathname === '/settings') {
        return <Navigate to="/collaborator/profile" replace />;
      }
      return <Navigate to="/collaborator/dashboard" replace />;
    }

    return (
      <CollaboratorLayout isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen}>
        <Routes>
          <Route path="collaborator/dashboard" element={<CollaboratorDashboardView />} />
          <Route path="collaborator/tasks" element={<CollaboratorTasksView />} />
          <Route path="collaborator/projects" element={<CollaboratorProjectsView />} />
          <Route path="collaborator/notifications" element={<CollaboratorNotificationsView />} />
          <Route path="collaborator/profile" element={<CollaboratorProfileView />} />
          <Route path="*" element={<Navigate to="collaborator/dashboard" replace />} />
        </Routes>
      </CollaboratorLayout>
    );
  }

  // Redirect users away from incorrect prefixes if logged in but role mismatch
  if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/pm') || location.pathname.startsWith('/collaborator')) {
    if (user?.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
    if (user?.role === 'PROJECT_MANAGER') return <Navigate to="/pm/dashboard" replace />;
    if (user?.role === 'COLLABORATOR') return <Navigate to="/collaborator/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
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
