import { Notification } from '@nextask/types';
import { Bell, Check, X } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
}

const getTitleForType = (type: string, message: string = '') => {
  const msg = message.toLowerCase();

  switch (type) {
    case 'TASK_ASSIGNED':
      return 'Task Assigned';
    case 'STATUS_CHANGED':
      return 'Status Update';
    case 'DEADLINE_ALERT':
      return 'Deadline Approaching';
    case 'COMMENT_ADDED':
      return 'Comment Added';
    case 'ADMIN_UPDATE':
    default:
      if (msg.includes('project')) return 'Project Workspace Notification';
      if (msg.includes('task')) return 'Task Notification';
      return 'System Notification';
  }
};

const formatTime = (date: Date | string) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

export function NotificationPanel({
  isOpen,
  onClose,
  notifications = [],
  unreadCount = 0,
  onMarkAsRead,
  onMarkAllAsRead,
}: NotificationPanelProps) {
  // Prevent scrolling on the main page when the panel is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <>
      {/* Dark Overlay background */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Slide-in Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[400px] bg-card border-l border-border shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-card shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              Notifications
            </h2>
            {unreadCount > 0 && (
              <span className="bg-destructive/15 text-destructive text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Action Bar */}
        {unreadCount > 0 && (
          <div className="px-6 py-3 bg-muted/30 border-b border-border flex justify-end shrink-0">
            <button
              onClick={onMarkAllAsRead}
              className="text-xs font-bold text-primary hover:underline transition-all"
            >
              Mark all as read
            </button>
          </div>
        )}

        {/* Notifications List */}
        <ScrollArea className="flex-1 p-4">
          <div className="flex flex-col gap-3">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 rounded-xl border transition-all duration-200 ${
                  notif.isRead
                    ? 'bg-card border-border/50 opacity-70'
                    : 'bg-primary/5 border-primary/20 shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start gap-2 mb-1">
                  <h4
                    className={`text-xs font-bold ${
                      notif.isRead ? 'text-muted-foreground' : 'text-foreground'
                    }`}
                  >
                    {getTitleForType(notif.type, notif.message)}
                  </h4>
                  <span className="text-[10px] font-semibold text-muted-foreground whitespace-nowrap">
                    {formatTime(notif.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  {notif.message}
                </p>

                {!notif.isRead && (
                  <button
                    onClick={() => onMarkAsRead(notif.id)}
                    className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    <span>Mark as read</span>
                  </button>
                )}
              </div>
            ))}

            {notifications.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-xs">
                No notifications yet.
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </>
  );
}
