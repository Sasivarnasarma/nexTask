import { CreateAttachmentRequest } from '@nextask/types';
import { Attachment } from '@prisma/client';

import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/apiError.util';

export const createTaskAttachment = async (
  userId: string,
  taskId: string,
  data: CreateAttachmentRequest,
): Promise<Attachment> => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    throw new ApiError(404, 'Task not found.');
  }

  const parsedSize = Math.floor(data.fileSize);
  if (isNaN(parsedSize) || parsedSize <= 0) {
    throw new ApiError(400, 'File size must be a positive integer.');
  }

  return prisma.attachment.create({
    data: {
      filename: data.filename,
      fileUrl: data.fileUrl,
      mimeType: data.mimeType,
      fileSize: parsedSize,
      taskId,
      uploadedById: userId,
    },
  });
};

export const getAttachmentsByTaskId = async (taskId: string): Promise<Attachment[]> => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    throw new ApiError(404, 'Task not found.');
  }

  return prisma.attachment.findMany({
    where: { taskId },
    orderBy: { createdAt: 'desc' },
  });
};

export const deleteAttachment = async (
  attachmentId: string,
  userId: string,
  userRole: string,
): Promise<void> => {
  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
  });

  if (!attachment) {
    throw new ApiError(404, 'Attachment not found.');
  }

  // Only allow deletion if user is the uploader, or an ADMIN / PROJECT_MANAGER
  if (
    attachment.uploadedById !== userId &&
    userRole !== 'ADMIN' &&
    userRole !== 'PROJECT_MANAGER'
  ) {
    throw new ApiError(403, 'You do not have permission to delete this attachment.');
  }

  await prisma.attachment.delete({
    where: { id: attachmentId },
  });
};
