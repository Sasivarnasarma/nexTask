import { ApiResponse, Notification } from '@nextask/types';

import apiClient from './client';


export async function fetchNotifications(): Promise<Notification[]> {
  const { data } = await apiClient.get<ApiResponse<Notification[]>>('/notifications');
  return data.data ?? [];
}

export async function markNotificationAsRead(id: string): Promise<Notification> {
  const { data } = await apiClient.patch<ApiResponse<Notification>>(`/notifications/${id}/read`);
  if (!data.data) {
    throw new Error('Failed to mark notification as read.');
  }
  return data.data;
}

export async function markAllNotificationsAsRead(): Promise<void> {
  await apiClient.post<ApiResponse<null>>('/notifications/mark-all-read');
}
