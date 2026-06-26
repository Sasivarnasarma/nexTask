import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, CheckSquare, Loader2, Search } from 'lucide-react';
import React, { useState } from 'react';

import {
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/api/notifications.api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToastStore } from '@/store/toast.store';
import { extractApiError } from '@/lib/apiError';
import { Notification } from '@nextask/types';

export const PmNotificationsView: React.FC = () => {
  const queryClient = useQueryClient();
  const showSuccess = useToastStore((s) => s.showSuccess);
  const showError = useToastStore((s) => s.showError);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'UNREAD'>('ALL');

  // Fetch Notifications
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
  });

  // Mutations
  const markAsReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      showSuccess('Notification marked as read.');
    },
    onError: (err) => showError(extractApiError(err, 'Failed to update notification.')),
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      showSuccess('All notifications marked as read.');
    },
    onError: (err) => showError(extractApiError(err, 'Failed to update notifications.')),
  });

  // Filters
  const filteredNotifications = notifications.filter((n) => {
    const matchesSearch = n.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRead = filterMode === 'ALL' || !n.isRead;
    return matchesSearch && matchesRead;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full text-slate-100 bg-transparent">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-900 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Inbox Notifications</h1>
          <p className="text-slate-400 mt-1 text-sm">
            Read assignments, status modifications, comment updates, and deadline reminders.
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 py-2.5"
          >
            <CheckSquare size={14} /> Clear All Unread
          </Button>
        )}
      </div>

      {/* Filters & Search */}
      <div className="bg-slate-900 border border-slate-805 p-4 rounded-2xl flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search inbox..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-slate-950 border-slate-800 text-xs rounded-xl h-9"
          />
        </div>
        <div className="bg-slate-950 border border-slate-850 p-1 rounded-xl flex w-full sm:w-auto">
          {(['ALL', 'UNREAD'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${
                filterMode === mode ? 'bg-blue-600 text-white shadow-md' : 'text-slate-455 hover:text-slate-200'
              }`}
            >
              {mode === 'ALL' ? 'All Alerts' : `Unread (${unreadCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="text-xs font-semibold">Reading inbox feed...</span>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="py-16 text-center text-slate-500 text-xs italic bg-slate-900 border border-slate-805 rounded-2xl">
          Your inbox is completely clear.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notif) => (
            <Card
              key={notif.id}
              className={`border transition-all rounded-xl ${
                notif.isRead
                  ? 'bg-slate-900/40 border-slate-850 text-slate-350'
                  : 'bg-slate-900 border-slate-800/80 shadow-md shadow-blue-500/2 text-slate-100'
              }`}
            >
              <CardContent className="p-4 flex items-start justify-between gap-4">
                <div className="min-w-0 flex gap-3">
                  <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${notif.isRead ? 'bg-slate-950 text-slate-500' : 'bg-blue-500/10 text-blue-400'}`}>
                    <Bell size={14} />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-medium leading-relaxed leading-snug">{notif.message}</p>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      {new Date(notif.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {!notif.isRead && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => markAsReadMutation.mutate(notif.id)}
                    disabled={markAsReadMutation.isPending}
                    className="h-8 w-8 text-slate-455 hover:text-emerald-400 hover:bg-emerald-950/20 rounded-lg shrink-0"
                  >
                    <Check size={14} />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
