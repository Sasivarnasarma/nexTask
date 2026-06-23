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
): Promise<string> => {
  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
  });

  if (!attachment) {
    throw new ApiError(404, 'Attachment not found.');
  }

  const isUploader = attachment.uploadedById === userId;
  const isGlobalAdmin = userRole === 'ADMIN';

  let isProjectPM = false;
  if (!isUploader && !isGlobalAdmin) {
    const task = await prisma.task.findUnique({
      where: { id: attachment.taskId },
      select: { projectId: true },
    });
    if (task) {
      const project = await prisma.project.findUnique({
        where: { id: task.projectId },
        select: { ownerId: true },
      });
      if (project && project.ownerId === userId) {
        isProjectPM = true;
      } else {
        const membership = await prisma.projectMember.findUnique({
          where: {
            projectId_userId: {
              projectId: task.projectId,
              userId,
            },
          },
          select: { role: true },
        });
        if (membership && membership.role === 'PROJECT_MANAGER') {
          isProjectPM = true;
        }
      }
    }
  }

  if (!isUploader && !isGlobalAdmin && !isProjectPM) {
    throw new ApiError(403, 'You do not have permission to delete this attachment.');
  }

  const taskId = attachment.taskId;

  await deleteFile(attachment.fileKey);

  await prisma.attachment.delete({
    where: { id: attachmentId },
  });

  return taskId;
};
