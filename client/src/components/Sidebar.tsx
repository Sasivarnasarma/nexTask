import { LayoutDashboard, LogOut, Settings } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useAuthStore } from '@/store/auth.store';

export function Sidebar({ isOpen }: { isOpen: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  const isActive = (path: string) => location.pathname.includes(path);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-full border-r border-slate-200 h-full py-6 bg-slate-50 flex flex-col justify-between transition-all duration-300">
      <div className="flex flex-col gap-8">
        <div
          className={`font-extrabold tracking-tight text-slate-900 transition-all duration-300 ${isOpen ? 'text-2xl px-6' : 'text-xl text-center'}`}
        >
          {isOpen ? 'nexTask' : 'T'}
        </div>

        <div className="flex flex-col gap-6 px-3">
          <div className="flex flex-col gap-1.5">
            {isOpen && (
              <div className="text-slate-400 font-bold text-[10px] tracking-widest uppercase mb-1.5 px-3">
                Main Menu
              </div>
            )}
            <Link
              to="/dashboard"
              title="Dashboard"
              className={`flex items-center gap-3 ${isOpen ? 'px-4 py-2.5 justify-start' : 'h-10 w-10 justify-center mx-auto'} ${
                isActive('/dashboard')
                  ? 'bg-indigo-50 text-indigo-700 font-bold shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
              } rounded-lg text-sm transition-all duration-200`}
            >
              <LayoutDashboard
                className={`w-5 h-5 shrink-0 ${isActive('/dashboard') ? 'text-indigo-700' : 'text-slate-500'}`}
              />
              {isOpen && <span>Dashboard</span>}
            </Link>
          </div>

          <div className="flex flex-col gap-1.5">
            {isOpen && (
              <div className="text-slate-400 font-bold text-[10px] tracking-widest uppercase mb-1.5 px-3">
                General
              </div>
            )}
            <Link
              to="/settings"
              title="Settings"
              className={`flex items-center gap-3 ${isOpen ? 'px-4 py-2.5 justify-start' : 'h-10 w-10 justify-center mx-auto'} ${
                isActive('/settings')
                  ? 'bg-indigo-50 text-indigo-700 font-bold shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
              } rounded-lg text-sm transition-all duration-200`}
            >
              <Settings
                className={`w-5 h-5 shrink-0 ${isActive('/settings') ? 'text-indigo-700' : 'text-slate-500'}`}
              />
              {isOpen && <span>Settings</span>}
            </Link>
          </div>
        </div>
      </div>

      <div className="px-3">
        <button
          onClick={handleLogout}
          title="Log Out"
          className={`group flex items-center gap-3 w-full ${isOpen ? 'px-4 py-2.5 justify-start' : 'h-10 w-10 justify-center mx-auto'} text-slate-500 hover:bg-red-50 hover:text-red-600 rounded-lg font-bold text-sm transition-all duration-200`}
        >
          <LogOut className="w-5 h-5 shrink-0 text-slate-400 group-hover:text-red-600" />
          {isOpen && <span>Log Out</span>}
        </button>
      </div>
    </aside>
  );
}
