import { Task as SharedTask } from '@nextask/types';
import { Priority, Status, Task } from '@prisma/client';

import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/apiError.util';
import { PushService } from './push.service';
import { deleteFile, generateDownloadUrl } from './s3.service';

// Shape of data needed to create a task
export interface CreateTaskInput {
  title: string;
  description?: string;
  assignedUserId?: string;
  dueDate?: Date;
  priority?: Priority;
  status?: Status;
}

// Shape of data allowed when updating a task
export interface UpdateTaskInput {
  title?: string;
  description?: string;
  assignedUserId?: string;
  dueDate?: Date;
  priority?: Priority;
  status?: Status;
}

// CREATE
export const createTask = async (data: CreateTaskInput): Promise<Task> => {
  if (data.dueDate && data.dueDate <= new Date()) {
    throw new ApiError(400, 'Due date must be in the future.');
  }

  if (data.assignedUserId) {
    const userExists = await prisma.user.findUnique({
      where: { id: data.assignedUserId },
    });
    if (!userExists) {
      throw new ApiError(400, 'Assigned user does not exist.');
    }
  }

  const task = await prisma.task.create({ data });

  if (task.assignedUserId) {
    PushService.sendNotificationToUser(task.assignedUserId, {
      title: 'New Task Assigned',
      body: `You have been assigned to task: "${task.title}"`,
      data: { url: '/dashboard' },
    }).catch((err) => console.error('Failed to dispatch assignment push notification:', err));
  }

  return task;
};

// GET ALL
export const getAllTasks = async (): Promise<Task[]> => {
  return prisma.task.findMany({
    orderBy: { createdAt: 'desc' },
  });
};

// GET ONE
export const getTaskById = async (id: string): Promise<SharedTask | null> => {
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      attachments: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!task) return null;

  const attachmentsWithUrls = await Promise.all(
    task.attachments.map(async (att) => {
      const presignedUrl = await generateDownloadUrl(att.fileKey);
      return {
        ...att,
        presignedUrl: presignedUrl || undefined,
      };
    }),
  );

  return {
    id: task.id,
    title: task.title,
    description: task.description ?? undefined,
    dueDate: task.dueDate ?? undefined,
    priority: task.priority as SharedTask['priority'],
    status: task.status as SharedTask['status'],
    assignedUserId: task.assignedUserId ?? undefined,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    attachments: attachmentsWithUrls,
  };
};

// UPDATE
export const updateTask = async (id: string, data: UpdateTaskInput): Promise<Task> => {
  if (data.dueDate && data.dueDate <= new Date()) {
    throw new ApiError(400, 'Due date must be in the future.');
  }

  if (data.assignedUserId) {
    const userExists = await prisma.user.findUnique({
      where: { id: data.assignedUserId },
    });
    if (!userExists) {
      throw new ApiError(400, 'Assigned user does not exist.');
    }
  }

  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, 'Task not found.');

  const updated = await prisma.task.update({ where: { id }, data });

  // If newly assigned or reassigned to a different user, send a notification
  if (updated.assignedUserId && updated.assignedUserId !== existing.assignedUserId) {
    PushService.sendNotificationToUser(updated.assignedUserId, {
      title: 'New Task Assigned',
      body: `You have been assigned to task: "${updated.title}"`,
      data: { url: '/dashboard' },
    }).catch((err) => console.error('Failed to dispatch assignment push notification:', err));
  }

  return updated;
};

// DELETE
export const deleteTask = async (id: string): Promise<Task> => {
  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, 'Task not found.');

  const attachments = await prisma.attachment.findMany({
    where: { taskId: id },
    select: { fileKey: true },
  });

  await Promise.all(attachments.map((att) => deleteFile(att.fileKey)));

  return prisma.task.delete({ where: { id } });
};
