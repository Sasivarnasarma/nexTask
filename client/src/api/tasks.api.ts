import { ApiResponse, Task } from '@nextask/types';

import apiClient from './client';

export interface CreateTaskPayload {
  title: string;
  description?: string;
  projectId: string;
  assignedUserId?: string;
  dueDate?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  status?: 'TODO' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  assignedUserId?: string;
  dueDate?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  status?: 'TODO' | 'IN_PROGRESS' | 'COMPLETED';
}

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

export async function fetchTasks(projectId: string): Promise<Task[]> {
  const { data } = await apiClient.get<ApiResponse<Task[]>>('/tasks', {
    params: { projectId },
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

export async function createTask(payload: CreateTaskPayload): Promise<Task> {
  const { data } = await apiClient.post<ApiResponse<Task>>('/tasks', payload);
  if (!data.data) {
    throw new Error('Failed to create task.');
  }
  return data.data;
}

export async function updateTask(id: string, payload: UpdateTaskPayload): Promise<Task> {
  const { data } = await apiClient.put<ApiResponse<Task>>(`/tasks/${id}`, payload);
  if (!data.data) {
    throw new Error('Failed to update task.');
  }
  return data.data;
}

export async function deleteTask(id: string): Promise<void> {
  await apiClient.delete<ApiResponse<null>>(`/tasks/${id}`);
}
