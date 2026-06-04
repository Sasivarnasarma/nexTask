import { CreateAttachmentRequest, Attachment as SharedAttachment } from '@nextask/types';

import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/apiError.util';
import { deleteFile, generateDownloadUrl } from './s3.service';

export const createTaskAttachment = async (
  userId: string,
  taskId: string,
  data: CreateAttachmentRequest,
): Promise<SharedAttachment> => {
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

  const attachment = await prisma.attachment.create({
    data: {
      filename: data.filename,
      fileKey: data.fileKey,
      mimeType: data.mimeType,
      fileSize: parsedSize,
      taskId,
      uploadedById: userId,
    },
  });

  const presignedUrl = await generateDownloadUrl(attachment.fileKey);

  return {
    ...attachment,
    presignedUrl: presignedUrl || undefined,
  };
};

export const getAttachmentsByTaskId = async (taskId: string): Promise<SharedAttachment[]> => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    throw new ApiError(404, 'Task not found.');
  }

  const attachments = await prisma.attachment.findMany({
    where: { taskId },
    orderBy: { createdAt: 'desc' },
  });

  return Promise.all(
    attachments.map(async (att) => {
      const presignedUrl = await generateDownloadUrl(att.fileKey);
      return {
        ...att,
        presignedUrl: presignedUrl || undefined,
      };
    }),
  );
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

  if (
    attachment.uploadedById !== userId &&
    userRole !== 'ADMIN' &&
    userRole !== 'PROJECT_MANAGER'
  ) {
    throw new ApiError(403, 'You do not have permission to delete this attachment.');
  }

  await deleteFile(attachment.fileKey);

  await prisma.attachment.delete({
    where: { id: attachmentId },
  });
};
