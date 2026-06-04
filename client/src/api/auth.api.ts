import { ApiResponse, LoginRequest, LoginResponse, PasswordResetRequest } from '@nextask/types';

import apiClient from './client';

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', payload, {
    skipGlobalToast: true,
  });
  if (data.data === null) {
    throw new Error('Login response payload is missing.');
  }
  return data.data;
}

export async function resetPassword(payload: PasswordResetRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<ApiResponse<LoginResponse>>(
    '/auth/reset-password',
    payload,
    { skipGlobalToast: true },
  );
  if (data.data === null) {
    throw new Error('Reset password response payload is missing.');
  }
  return data.data;
}
