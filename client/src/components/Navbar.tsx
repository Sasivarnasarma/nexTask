import { Notification } from '@nextask/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, User } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import {
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../api/notifications.api';
import { NotificationPanel } from './NotificationPanel';
import { Button } from './ui/button';

export function Navbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const queryClient = useQueryClient();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

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
