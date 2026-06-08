import {
  ApiResponse,
  ChangePasswordRequest,
  ProfileUpdateRequest,
  Project,
  User,
} from '@nextask/types';

import apiClient from './client';

export async function getProfile(): Promise<User> {
  const { data } = await apiClient.get<ApiResponse<User>>('/users/me');
  if (data.data === null) {
    throw new Error('Profile response payload is missing.');
  }
  return data.data;
}

export async function updateProfile(payload: ProfileUpdateRequest): Promise<User> {
  const { data } = await apiClient.patch<ApiResponse<User>>('/users/me', payload, {
    skipGlobalToast: true,
  });
  if (data.data === null) {
    throw new Error('Profile update response payload is missing.');
  }
  return data.data;
}

export async function changePassword(payload: ChangePasswordRequest): Promise<void> {
  await apiClient.post<ApiResponse<null>>('/users/me/change-password', payload, {
    skipGlobalToast: true,
  });
}

export async function fetchUserProjects(): Promise<Project[]> {
  const { data } = await apiClient.get<ApiResponse<Project[]>>('/users/me/projects');
  return data.data ?? [];
}
