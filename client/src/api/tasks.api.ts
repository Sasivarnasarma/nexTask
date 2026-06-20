import { ApiResponse, CreateTaskRequest, Task, UpdateTaskRequest } from '@nextask/types';

import apiClient from './client';

// ─── Mapping Helpers ─────────────────────────────────────────────────────────

export function mapStatusToBackend(status: string): 'TODO' | 'IN_PROGRESS' | 'COMPLETED' {
  switch (status) {
    case 'To Do':
    case 'TODO':
      return 'TODO';
    case 'In Progress':
    case 'IN_PROGRESS':
      return 'IN_PROGRESS';
    case 'Done':
    case 'COMPLETED':
      return 'COMPLETED';
    default:
      return 'TODO';
  }
}

export function mapStatusToFrontend(status: string): string {
  switch (status) {
    case 'TODO':
      return 'To Do';
    case 'IN_PROGRESS':
      return 'In Progress';
    case 'COMPLETED':
      return 'Done';
    default:
      return 'To Do';
  }
}

export function mapPriorityToBackend(priority: string): 'LOW' | 'MEDIUM' | 'HIGH' {
  switch (priority) {
    case 'Low':
    case 'LOW':
      return 'LOW';
    case 'Medium':
    case 'MEDIUM':
      return 'MEDIUM';
    case 'High':
    case 'HIGH':
      return 'HIGH';
    default:
      return 'MEDIUM';
  }
}

export function mapPriorityToFrontend(priority: string): string {
  switch (priority) {
    case 'LOW':
      return 'Low';
    case 'MEDIUM':
      return 'Medium';
    case 'HIGH':
      return 'High';
    default:
      return 'Medium';
  }
}

// ─── API Requests ───────────────────────────────────────────────────────────

export async function fetchTasks(
  projectId: string,
  filters?: {
    search?: string;
    status?: string;
    priority?: string;
    tags?: string[];
  },
): Promise<Task[]> {
  const params: Record<string, string | string[]> = { projectId };
  if (filters?.search) params.search = filters.search;
  if (filters?.status) params.status = mapStatusToBackend(filters.status);
  if (filters?.priority) params.priority = mapPriorityToBackend(filters.priority);
  if (filters?.tags && filters.tags.length > 0) params.tags = filters.tags;

  const { data } = await apiClient.get<ApiResponse<Task[]>>('/tasks', {
    params,
  });
  return data.data ?? [];
}

export async function fetchTaskById(id: string): Promise<Task> {
  const { data } = await apiClient.get<ApiResponse<Task>>(`/tasks/${id}`);
  if (!data.data) {
    throw new Error('Task not found.');
  }
  return data.data;
}

export async function createTask(payload: CreateTaskRequest): Promise<Task> {
  const { data } = await apiClient.post<ApiResponse<Task>>('/tasks', payload);
  if (!data.data) {
    throw new Error('Failed to create task.');
  }
  return data.data;
}

export async function updateTask(id: string, payload: UpdateTaskRequest): Promise<Task> {
  const { data } = await apiClient.put<ApiResponse<Task>>(`/tasks/${id}`, payload);
  if (!data.data) {
    throw new Error('Failed to update task.');
  }
  return data.data;
}

export async function deleteTask(id: string): Promise<void> {
  await apiClient.delete<ApiResponse<null>>(`/tasks/${id}`);
}
