import {
  ApiResponse,
  CreateProjectRequest,
  Project,
  TaskAssignee,
  UpdateProjectRequest,
} from '@nextask/types';

import apiClient from './client';

export interface AddMemberInput {
  userId: string;
  role: 'PROJECT_MANAGER' | 'COLLABORATOR';
}

export interface UpdateMemberRoleInput {
  role: 'PROJECT_MANAGER' | 'COLLABORATOR';
}

// ─── Project APIs ────────────────────────────────────────────────────────────

export async function createProject(payload: CreateProjectRequest): Promise<Project> {
  const { data } = await apiClient.post<ApiResponse<Project>>('/projects', payload);
  if (!data.data) {
    throw new Error('Failed to create project.');
  }
  return data.data;
}

export async function fetchProjectById(id: string): Promise<Project> {
  const { data } = await apiClient.get<ApiResponse<Project>>(`/projects/${id}`);
  if (!data.data) {
    throw new Error('Project not found.');
  }
  return data.data;
}

export async function updateProject(id: string, payload: UpdateProjectRequest): Promise<Project> {
  const { data } = await apiClient.put<ApiResponse<Project>>(`/projects/${id}`, payload);
  if (!data.data) {
    throw new Error('Failed to update project.');
  }
  return data.data;
}

export async function completeProject(id: string): Promise<Project> {
  const { data } = await apiClient.patch<ApiResponse<Project>>(`/projects/${id}/complete`);
  if (!data.data) {
    throw new Error('Failed to complete project.');
  }
  return data.data;
}

export async function archiveProject(id: string): Promise<Project> {
  const { data } = await apiClient.patch<ApiResponse<Project>>(`/projects/${id}/archive`);
  if (!data.data) {
    throw new Error('Failed to archive project.');
  }
  return data.data;
}

export async function deleteProject(id: string): Promise<void> {
  await apiClient.delete<ApiResponse<null>>(`/projects/${id}`);
}

// ─── Project Member APIs ──────────────────────────────────────────────────────

export async function fetchProjectMembers(id: string): Promise<any[]> {
  const { data } = await apiClient.get<ApiResponse<any[]>>(`/projects/${id}/members`);
  return data.data ?? [];
}

export async function addProjectMember(id: string, body: AddMemberInput): Promise<any> {
  const { data } = await apiClient.post<ApiResponse<any>>(`/projects/${id}/members`, body);
  return data.data;
}

export async function updateProjectMemberRole(
  id: string,
  userId: string,
  body: UpdateMemberRoleInput,
): Promise<void> {
  await apiClient.patch<ApiResponse<null>>(`/projects/${id}/members/${userId}`, body);
}

export async function removeProjectMember(id: string, userId: string): Promise<void> {
  await apiClient.delete<ApiResponse<null>>(`/projects/${id}/members/${userId}`);
}

// ─── Autocomplete / User Search ──────────────────────────────────────────────

export async function fetchTeamMembersAutocomplete(
  projectId: string,
  search: string,
): Promise<any[]> {
  const { data } = await apiClient.get<ApiResponse<any[]>>('/users/search', {
    params: { projectId, q: search },
  });
  return data.data ?? [];
}

// ─── Task Assignment APIs ─────────────────────────────────────────────────────

export async function fetchTaskAssignees(taskId: string): Promise<TaskAssignee[]> {
  const { data } = await apiClient.get<ApiResponse<TaskAssignee[]>>(`/tasks/${taskId}/assignments`);
  return data.data ?? [];
}

export async function assignTaskUser(taskId: string, userId: string): Promise<any> {
  const { data } = await apiClient.post<ApiResponse<any>>(`/tasks/${taskId}/assignments`, {
    userId,
  });
  return data.data;
}

export async function unassignTaskUser(taskId: string, userId: string): Promise<void> {
  await apiClient.delete<ApiResponse<null>>(`/tasks/${taskId}/assignments/${userId}`);
}
