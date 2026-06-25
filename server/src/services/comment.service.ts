import { CreateAttachmentRequest, Comment as SharedComment } from '@nextask/types';
import { Attachment, NotificationType } from '@prisma/client';

import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/apiError.util';
import { NotificationService } from './notification.service';
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

  // Send push notification to all assigned users, project owner, and project managers (except the author)
  const taskWithProject = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      title: true,
      project: {
        select: {
          name: true,
          ownerId: true,
          members: {
            where: { role: 'PROJECT_MANAGER' },
            select: { userId: true },
          },
        },
      },
    },
  });

  if (taskWithProject) {
    const assignments = await prisma.taskAssignment.findMany({
      where: { taskId },
      select: { userId: true },
    });

    const recipientIds = new Set<string>();

    // 1. Add assignees
    assignments.forEach((a) => recipientIds.add(a.userId));

    // 2. Add project owner
    recipientIds.add(taskWithProject.project.ownerId);

    // 3. Add project managers
    taskWithProject.project.members.forEach((m) => recipientIds.add(m.userId));

    // 4. Exclude the comment author
    recipientIds.delete(userId);

    const author = comment.author;
    const authorName = author?.name || author?.email || 'A teammate';
    const truncatedContent = content.substring(0, 40) + (content.length > 40 ? '...' : '');

    for (const recipientId of recipientIds) {
      NotificationService.createNotification(
        recipientId,
        `${authorName} commented on task "${taskWithProject.title}": "${truncatedContent}"`,
        NotificationType.COMMENT_ADDED,
        taskId,
      ).catch((err) => {
        console.error('Failed to dispatch comment notification:', err);
      });
    }
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
): Promise<string> => {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
  });

  if (!comment) {
    throw new ApiError(404, 'Comment not found.');
  }

  const isAuthor = comment.authorId === userId;
  const isGlobalAdmin = userRole === 'ADMIN';

  let isProjectPM = false;
  if (!isAuthor && !isGlobalAdmin) {
    const task = await prisma.task.findUnique({
      where: { id: comment.taskId },
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

  if (!isAuthor && !isGlobalAdmin && !isProjectPM) {
    throw new ApiError(403, 'You do not have permission to delete this comment.');
  }

  const taskId = comment.taskId;

  const attachments = await prisma.attachment.findMany({
    where: { commentId },
    select: { fileKey: true },
  });

  await Promise.all(attachments.map((att) => deleteFile(att.fileKey)));

  await prisma.comment.delete({
    where: { id: commentId },
  });

  return taskId;
};
