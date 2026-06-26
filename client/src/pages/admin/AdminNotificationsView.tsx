import { Notification } from '@nextask/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, CheckCircle2, Eye, Loader2, Search } from 'lucide-react';
import React, { useState } from 'react';

import {
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/api/notifications.api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { extractApiError } from '@/lib/apiError';
import { useToastStore } from '@/store/toast.store';

export const AdminNotificationsView: React.FC = () => {
  const queryClient = useQueryClient();
  const showSuccess = useToastStore((s) => s.showSuccess);
  const showError = useToastStore((s) => s.showError);

  // States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');
  const [viewingNotification, setViewingNotification] = useState<Notification | null>(null);

  // 1. Fetch Notifications
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['admin-notifications-list'],
    queryFn: fetchNotifications,
  });

  // Mutations
  const markAsReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications-list'] });
      showSuccess('Notification marked as read.');
    },
    onError: (err) => {
      showError(extractApiError(err, 'Failed to update notification.'));
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications-list'] });
      showSuccess('All notifications marked as read.');
    },
    onError: (err) => {
      showError(extractApiError(err, 'Failed to clear notifications.'));
    },
  });

  // Action Handlers
  const handleViewDetails = (noti: Notification) => {
    setViewingNotification(noti);
    if (!noti.isRead) {
      markAsReadMutation.mutate(noti.id);
    }
  };

  // Calculations
  const totalCount = notifications.length;
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const readCount = notifications.filter((n) => n.isRead).length;

  // Filter application
  const filteredNotifications = notifications.filter((n) => {
    const statusMatches =
      statusFilter === 'ALL' ||
      (statusFilter === 'UNREAD' && !n.isRead) ||
      (statusFilter === 'READ' && n.isRead);
    const searchMatches = n.message.toLowerCase().includes(searchQuery.toLowerCase());
    return statusMatches && searchMatches;
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full text-slate-100 bg-transparent">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-900 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <Bell className="h-8 w-8 text-indigo-400" /> Notifications Board
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Read platform-related alerts and toggle read indicators.
          </p>
        </div>
        <Button
          onClick={() => markAllAsReadMutation.mutate()}
          disabled={unreadCount === 0 || markAllAsReadMutation.isPending}
          className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 text-xs px-4 py-2 flex items-center gap-2 rounded-xl shrink-0"
        >
          <CheckCheck className="w-4 h-4 text-emerald-450" /> Mark All as Read
        </Button>
      </div>

      {/* 2. Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Alerts', value: totalCount, color: 'text-indigo-400' },
          { label: 'Unread Alerts', value: unreadCount, color: 'text-amber-400' },
          { label: 'Read Alerts', value: readCount, color: 'text-slate-400' },
        ].map((card, i) => (
          <div
            key={i}
            className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between"
          >
            <span className="text-xs text-slate-400 font-semibold">{card.label}</span>
            <h3 className={`text-2xl font-extrabold mt-2 tracking-tight ${card.color}`}>
              {card.value}
            </h3>
          </div>
        ))}
      </div>

      {/* 3. Search & Filters */}
      <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-2xl flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search notification messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-550 focus-visible:ring-indigo-500 rounded-xl"
          />
        </div>
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <span className="text-xs text-slate-400 shrink-0 font-medium">Filter:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-9 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">All Alerts</option>
            <option value="UNREAD">Unread Only</option>
            <option value="READ">Read Only</option>
          </select>
        </div>
      </div>

      {/* 4. Notification List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <span className="text-sm font-medium">Fetching notifications list...</span>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="text-center py-20 text-slate-500 text-sm font-medium italic border border-slate-900 rounded-2xl">
          No notifications found matching filters.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((noti) => (
            <div
              key={noti.id}
              onClick={() => handleViewDetails(noti)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex gap-4 items-start ${
                noti.isRead
                  ? 'bg-slate-900/40 border-slate-900/60 hover:bg-slate-900/60'
                  : 'bg-indigo-950/10 border-indigo-900/35 hover:bg-indigo-950/15'
              }`}
            >
              <div
                className={`w-2.5 h-2.5 rounded-full mt-2 shrink-0 ${
                  noti.isRead ? 'bg-slate-700' : 'bg-indigo-500 animate-pulse'
                }`}
              />
              <div className="flex-1 min-w-0 leading-tight">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-bold text-slate-200 capitalize tracking-wide">
                    {noti.type.toLowerCase().replace('_', ' ')}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(noti.createdAt).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>
                <p className="text-sm text-slate-350 mt-1.5 break-words line-clamp-2">
                  {noti.message}
                </p>
              </div>
              <div className="shrink-0 self-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-450 hover:text-slate-100 hover:bg-slate-800 rounded-lg"
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Viewing Details Dialog */}
      <Dialog open={!!viewingNotification} onOpenChange={(open) => !open && setViewingNotification(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="capitalize text-indigo-400 font-bold">
              Notification Details
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              Alert type: {viewingNotification?.type.replace('_', ' ')}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3 text-slate-200 border-t border-b border-slate-850 my-2">
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              {viewingNotification?.message}
            </div>
            <div className="text-[10px] text-slate-500 pt-2 flex items-center justify-between">
              <span>
                Received:{' '}
                {viewingNotification &&
                  new Date(viewingNotification.createdAt).toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-450" /> Already read
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={() => setViewingNotification(null)}
              className="bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-xl px-4 text-xs font-semibold"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
