import {
  AdminCreateUserRequest,
  AdminUpdateUserRequest,
  ApiResponse,
  User,
  UserActivityResponse,
} from '@nextask/types';

import apiClient from './client';

export interface PaginatedUsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateUserResponse {
  user: User;
  tempPassword?: string;
}

// 1. GET /users (View All Users with search and pagination)
export async function listUsers(
  page: number = 1,
  limit: number = 10,
  search?: string,
): Promise<PaginatedUsersResponse> {
  const { data } = await apiClient.get<ApiResponse<PaginatedUsersResponse>>('/users', {
    params: { page, limit, search },
  });
  if (!data.data) {
    throw new Error('Failed to retrieve users.');
  }
  return data.data;
}

// 2. POST /users (Create User)
export async function createUser(payload: AdminCreateUserRequest): Promise<CreateUserResponse> {
  const { data } = await apiClient.post<ApiResponse<CreateUserResponse>>('/users', payload);
  if (!data.data) {
    throw new Error('Failed to create user.');
  }
  return data.data;
}

// 3. GET /users/:id (View Single User metadata)
export async function fetchUserById(id: string): Promise<User> {
  const { data } = await apiClient.get<ApiResponse<User>>(`/users/${id}`);
  if (!data.data) {
    throw new Error('User not found.');
  }
  return data.data;
}

// 4. PUT /users/:id (Update User details)
export async function updateUser(id: string, payload: AdminUpdateUserRequest): Promise<User> {
  const { data } = await apiClient.put<ApiResponse<User>>(`/users/${id}`, payload);
  if (!data.data) {
    throw new Error('Failed to update user.');
  }
  return data.data;
}

// 5. PATCH /users/:id/deactivate (Deactivate User)
export async function deactivateUser(id: string): Promise<User> {
  const { data } = await apiClient.patch<ApiResponse<User>>(`/users/${id}/deactivate`);
  if (!data.data) {
    throw new Error('Failed to deactivate user.');
  }
  return data.data;
}

// 6. PATCH /users/:id/activate (Activate User)
export async function activateUser(id: string): Promise<User> {
  const { data } = await apiClient.patch<ApiResponse<User>>(`/users/${id}/activate`);
  if (!data.data) {
    throw new Error('Failed to activate user.');
  }
  return data.data;
}

// 7. DELETE /users/:id (Delete User)
export async function deleteUser(id: string): Promise<void> {
  await apiClient.delete<ApiResponse<null>>(`/users/${id}`);
}

// 8. GET /users/:id/activity (Audit User Actions)
export async function getUserActivity(id: string): Promise<UserActivityResponse[]> {
  const { data } = await apiClient.get<ApiResponse<UserActivityResponse[]>>(
    `/users/${id}/activity`,
  );
  return data.data ?? [];
}
