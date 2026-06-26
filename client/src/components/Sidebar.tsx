import {
  Calendar,
  LayoutDashboard,
  LogOut,
  Settings,
  Shield,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useWebPush } from '@/hooks/useWebPush';
import { useAuthStore } from '@/store/auth.store';

export function Sidebar(_props: { isOpen?: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const { unsubscribe } = useWebPush();

  const isActive = (path: string) => location.pathname.includes(path);

  const handleLogout = async () => {
    try {
      await unsubscribe();
    } catch (e) {
      console.error('Failed to unsubscribe push notifications on logout:', e);
    }
    logout();
    navigate('/login');
  };

  const formatRole = (role?: string) => {
    if (!role) return 'Workspace Member';
    if (role === 'ADMIN') return 'Administrator';
    if (role === 'PROJECT_MANAGER') return 'Project Manager';
    return role
      .split('_')
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <aside className="w-full border-r border-slate-800/60 h-full pb-6 bg-slate-950 flex flex-col justify-between transition-all duration-300">
      <div className="flex flex-col gap-6">
        {/* Header Section */}
        <div className="pt-[28px] pl-[24px]">
          <div className="flex items-center gap-[12px] select-none group cursor-pointer">
            <img 
              src="/logo.png" 
              alt="NexTask Logo" 
              className="w-[32px] h-[32px] sm:w-[36px] sm:h-[36px] md:w-[40px] md:h-[40px] object-contain transition-all duration-[250ms] ease-in-out group-hover:scale-[1.05] filter drop-shadow-[0_4px_12px_rgba(110,90,255,0.35)] group-hover:drop-shadow-[0_0_12px_rgba(110,90,255,0.6)]" 
            />
            <span 
              className="font-bold text-[28px] tracking-[-0.5px]"
              style={{
                background: 'linear-gradient(90deg, #7C5CFF, #59A8FF)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                color: 'transparent'
              }}
            >
              NexTask
            </span>
          </div>
        </div>

        {/* User Profile Card */}
        <div className="px-4">
          <div className="w-full flex items-center gap-3 bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl">
            <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-base shrink-0 shadow-md shadow-blue-600/10">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex flex-col min-w-0 leading-tight">
              <span className="text-sm font-semibold text-slate-100 truncate">
                {user?.name || 'User'}
              </span>
              <span className="text-xs text-slate-400 mt-0.5 truncate">
                {formatRole(user?.role)}
              </span>
            </div>
          </div>
        </div>

        {/* Main Menu Section */}
        <div className="flex flex-col gap-1 px-3">
          <div className="text-slate-500 font-extrabold text-[10px] tracking-widest uppercase mb-2 px-3">
            MAIN
          </div>

          {/* Dashboard */}
          <Link
            to="/dashboard"
            title="Dashboard"
            className={`flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
              isActive('/dashboard')
                ? 'bg-blue-600/10 text-blue-400 border border-blue-500/10'
                : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-100'
            }`}
          >
            <LayoutDashboard
              className={`w-5 h-5 shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                isActive('/dashboard') ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-100'
              }`}
            />
            <span>Dashboard</span>
          </Link>

          {/* Calendar */}
          <Link
            to="/calendar"
            title="Calendar"
            className={`flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
              isActive('/calendar')
                ? 'bg-blue-600/10 text-blue-400 border border-blue-500/10'
                : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-100'
            }`}
          >
            <Calendar
              className={`w-5 h-5 shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                isActive('/calendar') ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-100'
              }`}
            />
            <span>Calendar</span>
          </Link>

          {/* Admin Portal (Conditional) */}
          {user?.role === 'ADMIN' && (
            <>
              <div className="h-px bg-slate-800/60 my-2 mx-1" />
              <Link
                to="/admin"
                title="Admin Portal"
                className={`flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                  isActive('/admin')
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-500/10'
                    : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-100'
                }`}
              >
                <Shield
                  className={`w-5 h-5 shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                    isActive('/admin') ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-100'
                  }`}
                />
                <span>Admin Portal</span>
              </Link>
            </>
          )}

          {/* Settings */}
          <div className="h-px bg-slate-800/60 my-2 mx-1" />
          <Link
            to="/settings"
            title="Settings"
            className={`flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
              isActive('/settings')
                ? 'bg-blue-600/10 text-blue-400 border border-blue-500/10'
                : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-100'
            }`}
          >
            <Settings
              className={`w-5 h-5 shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                isActive('/settings') ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-100'
              }`}
            />
            <span>Settings</span>
          </Link>
        </div>
      </div>

      {/* Footer Section */}
      <div className="px-4">
        <button
          onClick={handleLogout}
          title="Log Out"
          className="group flex items-center gap-3.5 w-full px-4 py-2.5 text-slate-400 hover:text-slate-100 rounded-xl font-medium text-sm transition-all duration-200 hover:bg-slate-900/50 cursor-pointer"
        >
          <LogOut className="w-5 h-5 shrink-0 text-slate-400 group-hover:text-slate-100 group-hover:-translate-x-0.5 transition-transform duration-200" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}
