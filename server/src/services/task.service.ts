import { Priority, Status, Task } from '@prisma/client';

import { prisma } from '../lib/prisma';

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
    throw new Error('Due date must be in the future.');
  }

  if (data.assignedUserId) {
    const userExists = await prisma.user.findUnique({
      where: { id: data.assignedUserId },
    });
    if (!userExists) {
      throw new Error('Assigned user does not exist.');
    }
  }

  return prisma.task.create({ data });
};

// GET ALL
export const getAllTasks = async (): Promise<Task[]> => {
  return prisma.task.findMany({
    orderBy: { createdAt: 'desc' },
  });
};

// GET ONE
export const getTaskById = async (id: string): Promise<Task | null> => {
  return prisma.task.findUnique({ where: { id } });
};

// UPDATE
export const updateTask = async (id: string, data: UpdateTaskInput): Promise<Task> => {
  if (data.dueDate && data.dueDate <= new Date()) {
    throw new Error('Due date must be in the future.');
  }

  if (data.assignedUserId) {
    const userExists = await prisma.user.findUnique({
      where: { id: data.assignedUserId },
    });
    if (!userExists) {
      throw new Error('Assigned user does not exist.');
    }
  }

  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) throw new Error('Task not found.');

  return prisma.task.update({ where: { id }, data });
};

// DELETE
export const deleteTask = async (id: string): Promise<Task> => {
  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) throw new Error('Task not found.');

  return prisma.task.delete({ where: { id } });
};
