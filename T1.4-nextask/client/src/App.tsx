// client/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RequireAuth, RedirectIfAuthenticated } from "@/components/auth/RouteGuard";
import LoginPage from "@/pages/auth/LoginPage";
import ForceResetPage from "@/pages/auth/ForceResetPage";
import ProfilePage from "@/pages/profile/ProfilePage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

// Placeholder dashboard – replace with your actual dashboard component
function Dashboard() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-10">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-zinc-400 mt-2">Welcome to nexTask!</p>
      <a href="/profile" className="mt-4 inline-block text-indigo-400 underline text-sm">
        Go to Profile Settings →
      </a>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* ── Public routes ──────────────────────────────────────────── */}
          <Route
            path="/login"
            element={
              <RedirectIfAuthenticated>
                <LoginPage />
              </RedirectIfAuthenticated>
            }
          />

          {/* ── Force reset – accessible only while mustResetPassword=true  */}
          {/* RequireAuth allows it; RouteGuard redirects others away       */}
          <Route
            path="/force-reset"
            element={
              <RequireAuth>
                <ForceResetPage />
              </RequireAuth>
            }
          />

          {/* ── Protected routes ───────────────────────────────────────── */}
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />

          <Route
            path="/profile"
            element={
              <RequireAuth>
                <ProfilePage />
              </RequireAuth>
            }
          />

          {/* Default → dashboard (or login if not authenticated) */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
