import { ApiResponse, ChangePasswordRequest, ProfileUpdateRequest, User } from '@nextask/types';

import apiClient from './client';

export async function getProfile(): Promise<User> {
  const { data } = await apiClient.get<ApiResponse<User>>('/users/me');
  return data.data;
}

export async function updateProfile(payload: ProfileUpdateRequest): Promise<User> {
  const { data } = await apiClient.patch<ApiResponse<User>>('/users/me', payload);
  return data.data;
}

export async function changePassword(payload: ChangePasswordRequest): Promise<void> {
  await apiClient.post<ApiResponse<null>>('/users/me/change-password', payload);
}
