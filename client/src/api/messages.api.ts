import { ApiResponse, Message } from '@nextask/types';

import apiClient from './client';

export async function fetchProjectMessages(projectId: string): Promise<Message[]> {
  const { data } = await apiClient.get<ApiResponse<Message[]>>(`/messages/${projectId}`);
  return data.data ?? [];
}
