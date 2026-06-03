import {
  ApiResponse,
  LoginRequest,
  LoginResponse,
  PasswordResetRequest,
  PasswordResetResponse,
} from '@nextask/types';

import apiClient from './client';

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', payload);
  return data.data;
}

export async function resetPassword(payload: PasswordResetRequest): Promise<PasswordResetResponse> {
  const { data } = await apiClient.post<ApiResponse<PasswordResetResponse>>(
    '/auth/reset-password',
    payload,
  );
  return data.data;
}
