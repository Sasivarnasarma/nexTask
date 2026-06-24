import { CreateTaskRequest, Task as SharedTask, UpdateTaskRequest } from '@nextask/types';
import { NotificationType, Status, Task } from '@prisma/client';

import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/apiError.util';
import { NotificationService } from './notification.service';
import { deleteFile, generateDownloadUrl } from './s3.service';

export type CreateTaskInput = CreateTaskRequest;
export type UpdateTaskInput = UpdateTaskRequest;

// CREATE
export const createTask = async (data: CreateTaskInput): Promise<Task> => {
  if (data.dueDate && new Date(data.dueDate) <= new Date()) {
    throw new ApiError(400, 'Due date must be in the future.');
  }

  const projectExists = await prisma.project.findUnique({
    where: { id: data.projectId },
  });
  if (!projectExists) {
    throw new ApiError(400, 'Referenced project does not exist.');
  }

  let taskPosition = data.position;
  if (taskPosition === undefined) {
    const taskStatus = data.status || Status.TODO;
    const lastTask = await prisma.task.findFirst({
      where: { projectId: data.projectId, status: taskStatus },
      orderBy: { position: 'desc' },
    });
    taskPosition = lastTask ? lastTask.position + 1000 : 1000;
  }

  const task = await prisma.task.create({
    data: {
      title: data.title,
      description: data.description,
      projectId: data.projectId,
      dueDate: data.dueDate,
      priority: data.priority,
      status: data.status,
      tags: data.tags || [],
      position: taskPosition,
    },
  });

  return task;
};

// GET ALL WITH SEARCH AND FILTERS (Task 3.4)
export const getAllTasks = async (
  projectId: string,
  search?: string,
  status?: SharedTask['status'],
  priority?: SharedTask['priority'],
  tags?: string[],
): Promise<SharedTask[]> => {
  const tasks = await prisma.task.findMany({
    where: {
      projectId,
      status: status ?? undefined,
      priority: priority ?? undefined,
      tags: tags && tags.length > 0 ? { hasSome: tags } : undefined,
      OR: search
        ? [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ]
        : undefined,
    },
    include: {
      attachments: {
        orderBy: { createdAt: 'desc' },
      },
      assignments: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: { assignedAt: 'asc' },
      },
    },
    orderBy: { position: 'asc' },
  });

  return Promise.all(
    tasks.map(async (task) => {
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
        tags: task.tags,
        position: task.position,
        projectId: task.projectId,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        attachments: attachmentsWithUrls,
        assignees: task.assignments.map((a) => ({
          userId: a.userId,
          name: a.user.name,
          email: a.user.email,
          assignedAt: a.assignedAt,
        })),
      };
    }),
  );
};
// GET ONE
export const getTaskById = async (id: string): Promise<SharedTask | null> => {
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      attachments: {
        orderBy: { createdAt: 'desc' },
      },
      assignments: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: { assignedAt: 'asc' },
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
    tags: task.tags,
    position: task.position,
    projectId: task.projectId,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    attachments: attachmentsWithUrls,
    assignees: task.assignments.map((a) => ({
      userId: a.userId,
      name: a.user.name,
      email: a.user.email,
      assignedAt: a.assignedAt,
    })),
  };
};

// UPDATE
export const updateTask = async (id: string, data: UpdateTaskInput): Promise<Task> => {
  if (data.dueDate && new Date(data.dueDate) <= new Date()) {
    throw new ApiError(400, 'Due date must be in the future.');
  }

  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, 'Task not found.');

  let taskPosition = data.position;
  if (data.status && data.status !== existing.status && taskPosition === undefined) {
    const lastTask = await prisma.task.findFirst({
      where: { projectId: existing.projectId, status: data.status },
      orderBy: { position: 'desc' },
    });
    taskPosition = lastTask ? lastTask.position + 1000 : 1000;
  }

  const updated = await prisma.task.update({
    where: { id },
    data: {
      ...data,
      position: taskPosition,
    },
  });

  if (data.status && data.status !== existing.status) {
    const assignments = await prisma.taskAssignment.findMany({
      where: { taskId: id },
      select: { userId: true },
    });
    for (const assign of assignments) {
      NotificationService.createNotification(
        assign.userId,
        `Task "${existing.title}" status changed to ${data.status}.`,
        NotificationType.STATUS_CHANGED,
        id,
      ).catch((err) => console.error('Failed to dispatch status change notification:', err));
    }
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
