import {
  CreateAttachmentRequest,
  Attachment as SharedAttachment,
  Comment as SharedComment,
} from '@nextask/types';

import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/apiError.util';
import { PushService } from './push.service';

export const postComment = async (
  userId: string,
  taskId: string,
  content: string,
  attachments?: CreateAttachmentRequest[],
): Promise<SharedComment> => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    throw new ApiError(404, 'Task not found.');
  }

  const comment = await prisma.$transaction(async (tx) => {
    const newComment = await tx.comment.create({
      data: {
        content,
        taskId,
        authorId: userId,
      },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
    });

    let createdAttachments: SharedAttachment[] = [];
    if (attachments && attachments.length > 0) {
      createdAttachments = await Promise.all(
        attachments.map((att) =>
          tx.attachment.create({
            data: {
              filename: att.filename,
              fileUrl: att.fileUrl,
              mimeType: att.mimeType,
              fileSize: att.fileSize,
              taskId,
              commentId: newComment.id,
              uploadedById: userId,
            },
          }),
        ),
      );
    }

    return {
      ...newComment,
      attachments: createdAttachments,
    };
  });

  // Send push notification to assigned user if they are not the author
  if (task.assignedUserId && task.assignedUserId !== userId) {
    const author = comment.author;
    const authorName = author?.name || author?.email || 'A teammate';

    PushService.sendNotificationToUser(task.assignedUserId, {
      title: 'New Comment on Task',
      body: `${authorName} commented: "${content.substring(0, 60)}${content.length > 60 ? '...' : ''}"`,
      data: { url: `/tasks/${taskId}` },
    }).catch((err) => {
      console.error('Failed to dispatch comment push notification:', err);
    });
  }

  return comment;
};

export const getCommentsByTaskId = async (taskId: string): Promise<SharedComment[]> => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    throw new ApiError(404, 'Task not found.');
  }

  return prisma.comment.findMany({
    where: { taskId },
    include: {
      author: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      },
      attachments: true,
    },
    orderBy: { createdAt: 'asc' },
  });
};
