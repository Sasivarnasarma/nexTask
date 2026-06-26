import { Notification } from '@nextask/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';

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

        <Link
          to="/profile"
          title="Profile Settings"
          className="h-8 w-8 bg-primary/10 hover:bg-primary/20 text-primary rounded-full flex items-center justify-center transition-colors border border-primary/20"
        >
          <User size={16} />
        </Link>
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
