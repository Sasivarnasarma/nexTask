import {
  ApiResponse,
  Attachment,
  CreateAttachmentRequest,
  GetPresignedUrlRequest,
  GetPresignedUrlResponse,
} from '@nextask/types';
import axios from 'axios';

import apiClient from './client';

export async function getPresignedUploadUrl(
  payload: GetPresignedUrlRequest,
): Promise<GetPresignedUrlResponse> {
  const { data } = await apiClient.post<ApiResponse<GetPresignedUrlResponse>>(
    '/attachments/presigned-url',
    payload,
  );
  if (!data.data) {
    throw new Error('Failed to get presigned upload URL.');
  }
  return data.data;
}

/**
 * Uploads a raw binary file to the presigned S3/R2 URL.
 * NOTE: We use standard axios directly here instead of apiClient to avoid adding
 * our custom JWT Authorization header, which would break S3 signature verification.
 */
  await axios.put(uploadUrl, file, {
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
  });
}

export async function createTaskAttachment(
  taskId: string,
  payload: CreateAttachmentRequest,
): Promise<Attachment> {
  const { data } = await apiClient.post<ApiResponse<Attachment>>(
    `/tasks/${taskId}/attachments`,
    payload,
  );
  if (!data.data) {
    throw new Error('Failed to register task attachment.');
  }
  return data.data;
}

export async function deleteAttachment(attachmentId: string): Promise<void> {
  await apiClient.delete<ApiResponse<null>>(`/attachments/${attachmentId}`);
}
