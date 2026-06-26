import { Notification } from '@nextask/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

import { useWebPush } from '@/hooks/useWebPush';

import {
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../api/notifications.api';
import { useAuthStore } from '../store/auth.store';
import { useToastStore } from '../store/toast.store';
import { NotificationPanel } from './NotificationPanel';
import { Button } from './ui/button';

export function Navbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const queryClient = useQueryClient();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { unsubscribe } = useWebPush();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await unsubscribe();
    } catch (e) {
      console.error('Failed to unsubscribe push notifications on logout:', e);
    }
    logout();
    navigate('/login');
  };

  // Global socket listener for real-time notifications
  useEffect(() => {
    const token = useAuthStore.getState().token;
    if (!token) return;

    const socketUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

    const socket = io(socketUrl, {
      auth: { token },
      transports: ['polling', 'websocket'],
    });

    socket.on('connect', () => {
      console.log('[WS] Global notification socket connected.');
    });

    socket.on('connect_error', (err) => {
      console.error('[WS_ERROR] Global socket connection failed:', err.message);
    });

    socket.on('notification:received', (notif: Notification) => {
      console.log('[WS] Received real-time notification:', notif);
      
      // Instantly refresh the notification list and badge count
      queryClient.invalidateQueries({ queryKey: ['notifications'] });

      // Alert the user via a beautiful toast unless they are already viewing project chat
      const isChat = notif.type === 'CHAT_MESSAGE';
      const isOnMessagesPage = window.location.pathname === '/messages';

      if (!isChat || !isOnMessagesPage) {
        useToastStore.getState().showSuccess(notif.message);
      }
    });

    return () => {
      console.log('[WS] Cleaning up global notification socket.');
      socket.disconnect();
    };
  }, [queryClient]);

  // Fetch notifications
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    refetchInterval: 15000, // Poll notifications every 15 seconds
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return (
    <nav className="h-16 border-b border-border flex items-center justify-between px-6 bg-background text-foreground shrink-0">
      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => onMenuClick?.()}
          className="p-2 -ml-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors md:hidden"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        <div className="font-extrabold text-xl tracking-tight text-foreground md:hidden">
          nexTask
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsNotificationsOpen(true)}
            className="relative h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive animate-pulse" />
            )}
          </Button>
        </div>

        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="h-8 w-8 bg-primary/10 hover:bg-primary/20 text-primary rounded-full flex items-center justify-center transition-colors border border-primary/20 focus:outline-none cursor-pointer"
            aria-label="Toggle profile menu"
          >
            <User size={16} />
          </button>
          
          {isDropdownOpen && (
            <>
              {/* Overlay to close dropdown when clicking outside */}
              <div 
                className="fixed inset-0 z-40 cursor-default" 
                onClick={() => setIsDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-[220px] rounded-xl bg-slate-950/95 backdrop-blur-[12px] border border-slate-800 shadow-[0_10px_30px_rgba(0,0,0,0.5)] p-2 z-50 animate-fade-in origin-top-right">
                {/* User details header */}
                <div className="px-3 py-2 border-b border-slate-800/80 mb-1.5 select-none text-left">
                  <span className="text-sm font-semibold text-slate-100 truncate block">
                    {user?.name || 'Workspace Member'}
                  </span>
                  <span className="text-xs text-slate-400 truncate block mt-0.5">
                    {user?.email || 'member@nextask.com'}
                  </span>
                </div>
                
                {/* Menu items */}
                <Link
                  to="/settings"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors text-left"
                >
                  <span className="text-base select-none">👤</span>
                  <span>My Profile</span>
                </Link>
                
                <Link
                  to="/settings"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors text-left"
                >
                  <span className="text-base select-none">⚙️</span>
                  <span>Settings</span>
                </Link>
                
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    useToastStore.getState().showSuccess("Support center contact: support@nextask.com");
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors text-left cursor-pointer"
                >
                  <span className="text-base select-none">❓</span>
                  <span>Help</span>
                </button>
                
                <div className="h-px bg-slate-800/80 my-1.5" />
                
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-950/30 transition-colors text-left cursor-pointer"
                >
                  <span className="text-base select-none">🚪</span>
                  <span>Logout</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Slide-in Notification Panel */}
      <NotificationPanel
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAsRead={(id) => markAsReadMutation.mutate(id)}
        onMarkAllAsRead={() => markAllAsReadMutation.mutate()}
      />
    </nav>
  );
}
