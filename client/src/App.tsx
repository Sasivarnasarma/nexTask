import React, { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Sidebar } from './components/Sidebar';
import './index.css';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { Settings } from './pages/Settings';

// We create an internal component layout wrapper so we can use hooks like useLocation safely
const DashboardLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex min-h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar Wrapper */}
      <div
        className={`transition-all duration-300 ease-in-out shrink-0 ${isSidebarOpen ? 'w-64' : 'w-20'}`}
      >
        <div className="w-full h-full overflow-hidden">
          <Sidebar isOpen={isSidebarOpen} />
        </div>
      </div>

      {/* Main Content Space */}
      <div className="flex-1 flex flex-col bg-white border-l border-slate-200 min-w-0 transition-all duration-300">
        <Navbar onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
        <main className="p-10 flex flex-col items-center justify-center flex-1">
          {/* React Router will automatically inject the active page component here */}
          <Routes>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="settings" element={<Settings />} />
            {/* Fallback internal redirect if path is wrong */}
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  // Application authentication simulation state
  const [auth, setAuth] = useState(false);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Login Route */}
        <Route
          path="/login"
          element={
            auth ? <Navigate to="/dashboard" replace /> : <Login onLogin={() => setAuth(true)} />
          }
        />

        {/* Master Protected Dashboard Route Node */}
        <Route
          path="/*"
          element={
            <ProtectedRoute isAuthenticated={auth}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
