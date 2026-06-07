import { ApiResponse, Comment, CreateCommentRequest } from '@nextask/types';

import apiClient from './client';

export async function fetchComments(taskId: string): Promise<Comment[]> {
  const { data } = await apiClient.get<ApiResponse<Comment[]>>(`/tasks/${taskId}/comments`);
  return data.data ?? [];
}

export async function postComment(taskId: string, payload: CreateCommentRequest): Promise<Comment> {
  const { data } = await apiClient.post<ApiResponse<Comment>>(`/tasks/${taskId}/comments`, payload);
  if (!data.data) {
    throw new Error('Failed to post comment.');
  }
  return data.data;
}

export async function deleteComment(commentId: string): Promise<void> {
  await apiClient.delete<ApiResponse<null>>(`/comments/${commentId}`);
}
