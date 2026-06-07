import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { Navbar } from './components/Navbar';
import { PushNotificationPrompt } from './components/PushNotificationPrompt';
import { Sidebar } from './components/Sidebar';
import { ThemeProvider } from './components/ThemeProvider';
import { RedirectIfAuthenticated, RequireAuth } from './components/auth/RouteGuard';
import { ToastContainer } from './components/ui/Toast';
import './index.css';
import { Dashboard } from './pages/Dashboard';
import { Settings } from './pages/Settings';
import ForceResetPage from './pages/auth/ForceResetPage';
import LoginPage from './pages/auth/LoginPage';
import ProfilePage from './pages/profile/ProfilePage';

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

const App: React.FC = () => {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
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
            <Route path="/force-reset" element={<ForceResetPage />} />

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
