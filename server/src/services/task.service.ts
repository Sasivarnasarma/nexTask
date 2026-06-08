import { Task as SharedTask } from '@nextask/types';
import { Priority, Status, Task } from '@prisma/client';

import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/apiError.util';
import { deleteFile, generateDownloadUrl } from './s3.service';

// Shape of data needed to create a task
export interface CreateTaskInput {
  title: string;
  description?: string;
  projectId: string;
  dueDate?: Date;
  priority?: Priority;
  status?: Status;
  tags?: string[];
  position?: number;
}

// Shape of data allowed when updating a task
export interface UpdateTaskInput {
  title?: string;
  description?: string;
  dueDate?: Date;
  priority?: Priority;
  status?: Status;
  tags?: string[];
  position?: number;
}

// CREATE
export const createTask = async (data: CreateTaskInput): Promise<Task> => {
  if (data.dueDate && new Date(data.dueDate) <= new Date()) {
    throw new ApiError(400, 'Due date must be in the future.');
  }

  // Validate project exists
  const projectExists = await prisma.project.findUnique({
    where: { id: data.projectId },
  });
  if (!projectExists) {
    throw new ApiError(400, 'Referenced project does not exist.');
  }

  // Calculate default position if not provided
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

// GET ALL
export const getAllTasks = async (projectId?: string): Promise<Task[]> => {
  return prisma.task.findMany({
    where: projectId ? { projectId } : undefined,
    orderBy: { position: 'asc' },
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
    tags: task.tags,
    position: task.position,
    projectId: task.projectId,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    attachments: attachmentsWithUrls,
  };
};

// UPDATE
export const updateTask = async (id: string, data: UpdateTaskInput): Promise<Task> => {
  if (data.dueDate && new Date(data.dueDate) <= new Date()) {
    throw new ApiError(400, 'Due date must be in the future.');
  }

  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, 'Task not found.');

  // If status changes and position is not provided, compute status-specific position
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
