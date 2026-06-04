import { CreateAttachmentRequest, Comment as SharedComment } from '@nextask/types';
import { Attachment } from '@prisma/client';

import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/apiError.util';
import { PushService } from './push.service';
import { deleteFile, generateDownloadUrl } from './s3.service';

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

    let createdAttachments: Attachment[] = [];
    if (attachments && attachments.length > 0) {
      createdAttachments = await Promise.all(
        attachments.map((att) => {
          const parsedSize = Math.floor(att.fileSize);
          if (isNaN(parsedSize) || parsedSize <= 0) {
            throw new ApiError(400, 'File size must be a positive integer.');
          }
          return tx.attachment.create({
            data: {
              filename: att.filename,
              fileKey: att.fileKey,
              mimeType: att.mimeType,
              fileSize: parsedSize,
              taskId,
              commentId: newComment.id,
              uploadedById: userId,
            },
          });
        }),
      );
    }

    const attachmentsWithUrls = await Promise.all(
      createdAttachments.map(async (att) => {
        const presignedUrl = await generateDownloadUrl(att.fileKey);
        return {
          ...att,
          presignedUrl: presignedUrl || undefined,
        };
      }),
    );

    return {
      ...newComment,
      attachments: attachmentsWithUrls,
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

  const comments = await prisma.comment.findMany({
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

  return Promise.all(
    comments.map(async (c) => {
      const mappedAttachments = await Promise.all(
        c.attachments.map(async (att) => {
          const presignedUrl = await generateDownloadUrl(att.fileKey);
          return {
            ...att,
            presignedUrl: presignedUrl || undefined,
          };
        }),
      );
      return {
        ...c,
        attachments: mappedAttachments,
      };
    }),
  );
};

export const deleteComment = async (
  commentId: string,
  userId: string,
  userRole: string,
): Promise<void> => {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
  });

  if (!comment) {
    throw new ApiError(404, 'Comment not found.');
  }

  // Only allow deletion if user is the author, or an ADMIN / PROJECT_MANAGER
  if (comment.authorId !== userId && userRole !== 'ADMIN' && userRole !== 'PROJECT_MANAGER') {
    throw new ApiError(403, 'You do not have permission to delete this comment.');
  }

  const attachments = await prisma.attachment.findMany({
    where: { commentId },
    select: { fileKey: true },
  });

  await Promise.all(attachments.map((att) => deleteFile(att.fileKey)));

  await prisma.comment.delete({
    where: { id: commentId },
  });
};
