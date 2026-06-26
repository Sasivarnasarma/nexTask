import {
  LogOut,
  Menu,
  X,
  LucideIcon
} from 'lucide-react';
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useWebPush } from '@/hooks/useWebPush';
import { useAuthStore } from '@/store/auth.store';
import { useQuery } from '@tanstack/react-query';
import { fetchNotifications } from '@/api/notifications.api';

export interface BaseLayoutNavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

interface BaseLayoutProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  navItems: BaseLayoutNavItem[];
  children?: React.ReactNode;
}

export const BaseLayout: React.FC<BaseLayoutProps> = ({
  isSidebarOpen,
  setIsSidebarOpen,
  navItems,
  children,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const { unsubscribe } = useWebPush();

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    try {
      await unsubscribe();
    } catch (e) {
      console.error('Failed to unsubscribe push notifications on logout:', e);
    }
    logout();
    navigate('/login');
  };

  // Fetch notifications for badge count
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    refetchInterval: 30000,
  });

  const unreadNotificationsCount = notifications.filter((n: any) => !n.isRead).length;

  // Derive display role name
  const displayRole = user?.role === 'PROJECT_MANAGER'
    ? 'Project Manager'
    : user?.role === 'ADMIN'
      ? 'Administrator'
      : 'Collaborator';

  // Avatar BG class based on role
  const avatarBg = user?.role === 'ADMIN'
    ? 'bg-rose-600 shadow-rose-600/10'
    : user?.role === 'PROJECT_MANAGER'
      ? 'bg-blue-600 shadow-blue-600/10'
      : 'bg-emerald-600 shadow-emerald-600/10';

  const avatarText = user?.role === 'ADMIN'
    ? 'text-rose-400'
    : user?.role === 'PROJECT_MANAGER'
      ? 'text-blue-400'
      : 'text-emerald-400';

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden relative font-sans">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-45 md:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Component */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-300 ease-in-out shrink-0 bg-slate-900 border-r border-slate-800/80 w-64 md:relative md:translate-x-0 flex flex-col justify-between h-full`}
      >
        <div className="flex flex-col gap-6 pt-6">
          {/* Header Logo */}
          <div className="px-6 flex items-center justify-between">
            <div className="flex items-center gap-3 select-none">
              <img
                src="/logo.png"
                alt="NexTask Logo"
                className="w-9 h-9 object-contain filter drop-shadow-[0_4px_12px_rgba(110,90,255,0.35)]"
              />
              <span
                className="font-bold text-2xl tracking-tight"
                style={{
                  background: 'linear-gradient(90deg, #7C5CFF, #59A8FF)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                NexTask
              </span>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden text-slate-400 hover:text-slate-100"
            >
              <X size={20} />
            </button>
          </div>

          {/* User Status Card */}
          <div className="px-4">
            <div className="w-full flex items-center gap-3 bg-slate-950/40 border border-slate-800/60 p-3 rounded-xl">
              <div className={`h-9 w-9 rounded-xl ${avatarBg} text-white flex items-center justify-center font-bold text-base shadow-md shrink-0`}>
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex flex-col min-w-0 leading-tight">
                <span className="text-sm font-semibold text-slate-100 truncate">
                  {user?.name || 'User'}
                </span>
                <span className={`text-xs ${avatarText} mt-0.5 font-medium`}>
                  {displayRole}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1 px-3">
            <div className="text-slate-500 font-extrabold text-[10px] tracking-widest uppercase mb-2 px-3">
              WORKSPACE
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                    active
                      ? 'bg-blue-600/10 text-blue-400 border border-blue-500/10'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                      active ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-100'
                    }`}
                  />
                  <span>{item.label}</span>
                  {item.label === 'Notifications' && unreadNotificationsCount > 0 && (
                    <span className="ml-auto bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {unreadNotificationsCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Logout */}
        <div className="px-4 pb-6">
          <button
            onClick={handleLogout}
            className="group flex items-center gap-3 w-full px-4 py-2.5 text-slate-400 hover:text-slate-100 rounded-xl font-medium text-sm transition-all duration-200 hover:bg-slate-800 cursor-pointer text-left"
          >
            <LogOut className="w-5 h-5 shrink-0 text-slate-400 group-hover:text-slate-100 group-hover:-translate-x-0.5 transition-transform duration-200" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950/40 border-l border-slate-900 overflow-hidden h-screen relative">
        {/* Mobile Sidebar Trigger */}
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="md:hidden absolute top-4 left-6 z-40 p-2 bg-slate-900/80 backdrop-blur border border-slate-800 text-slate-400 rounded-lg hover:text-slate-100 transition-colors"
        >
          <Menu size={20} />
        </button>

        {/* Dynamic Route Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 pt-16 md:pt-8 bg-slate-950">
          {children}
        </div>
      </div>
    </div>
  );
};
