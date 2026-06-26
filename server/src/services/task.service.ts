import { CreateTaskRequest, Task as SharedTask, UpdateTaskRequest } from '@nextask/types';
import { NotificationType, Status, Task } from '@prisma/client';

import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/apiError.util';
import { NotificationService } from './notification.service';
import { deleteFile, generateDownloadUrl } from './s3.service';
import { PermissionService } from './permission.service';

export type CreateTaskInput = CreateTaskRequest;
export type UpdateTaskInput = UpdateTaskRequest;

// CREATE
export const createTask = async (data: CreateTaskInput & { createdBy: string }): Promise<Task> => {
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
      createdBy: data.createdBy,
    },
  });

  // Log audit activity
  await prisma.taskActivity.create({
    data: {
      taskId: task.id,
      userId: data.createdBy,
      action: 'TASK_CREATED',
      description: `Task "${task.title}" was created.`,
    },
  });

  return task;
};

// GET ALL FOR PROJECT WITH ROLE SCOPING (Task 3.4 + Scoping)
export const getAllTasks = async (
  projectId: string,
  userId: string,
  userRole: string,
  search?: string,
  status?: SharedTask['status'],
  priority?: SharedTask['priority'],
  tags?: string[],
): Promise<SharedTask[]> => {
  // If Collaborator, we MUST only return tasks assigned to the user
  const assignmentsFilter = userRole === 'COLLABORATOR'
    ? {
        some: {
          userId,
        },
      }
    : undefined;

  const tasks = await prisma.task.findMany({
    where: {
      projectId,
      status: status ?? undefined,
      priority: priority ?? undefined,
      tags: tags && tags.length > 0 ? { hasSome: tags } : undefined,
      assignments: assignmentsFilter,
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

      // Compute backend-only UI hint permissions
      const canEdit = await PermissionService.canPerformAction(userId, userRole as any, task.projectId, 'TASK_UPDATED', task);
      const canDelete = await PermissionService.canPerformAction(userId, userRole as any, task.projectId, 'TASK_DELETED', task);

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
        createdBy: task.createdBy,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        attachments: attachmentsWithUrls,
        assignees: task.assignments.map((a) => ({
          userId: a.userId,
          name: a.user.name,
          email: a.user.email,
          assignedAt: a.assignedAt,
        })),
        permissions: {
          canEdit,
          canDelete,
        },
      };
    }),
  );
};

// GET MY TASKS (Assigned to Collaborator)
export const getMyTasks = async (userId: string): Promise<SharedTask[]> => {
  const tasks = await prisma.task.findMany({
    where: {
      assignments: {
        some: {
          userId,
        },
      },
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
    orderBy: { createdAt: 'desc' },
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

      const canEdit = await PermissionService.canPerformAction(userId, 'COLLABORATOR', task.projectId, 'TASK_STATUS_CHANGED', task);
      const canDelete = await PermissionService.canPerformAction(userId, 'COLLABORATOR', task.projectId, 'TASK_DELETED', task);

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
        createdBy: task.createdBy,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        attachments: attachmentsWithUrls,
        assignees: task.assignments.map((a) => ({
          userId: a.userId,
          name: a.user.name,
          email: a.user.email,
          assignedAt: a.assignedAt,
        })),
        permissions: {
          canEdit,
          canDelete,
        },
      };
    }),
  );
};

// GET ALL TASKS SYSTEM-WIDE (Admin only)
export const getAdminAllTasks = async (adminId: string): Promise<SharedTask[]> => {
  const tasks = await prisma.task.findMany({
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
    orderBy: { createdAt: 'desc' },
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
        createdBy: task.createdBy,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        attachments: attachmentsWithUrls,
        assignees: task.assignments.map((a) => ({
          userId: a.userId,
          name: a.user.name,
          email: a.user.email,
          assignedAt: a.assignedAt,
        })),
        permissions: {
          canEdit: true,
          canDelete: true,
        },
      };
    }),
  );
};

// GET ONE BY ID
export const getTaskById = async (id: string, userId?: string, userRole?: string): Promise<SharedTask | null> => {
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

  // Enforce Collaborator visibility limit
  if (userRole === 'COLLABORATOR' && userId) {
    const isAssigned = await prisma.taskAssignment.findUnique({
      where: {
        taskId_userId: {
          taskId: id,
          userId,
        },
      },
    });
    if (!isAssigned) {
      return null;
    }
  }

  const attachmentsWithUrls = await Promise.all(
    task.attachments.map(async (att) => {
      const presignedUrl = await generateDownloadUrl(att.fileKey);
      return {
        ...att,
        presignedUrl: presignedUrl || undefined,
      };
    }),
  );

  let canEdit = false;
  let canDelete = false;
  if (userId && userRole) {
    canEdit = await PermissionService.canPerformAction(userId, userRole as any, task.projectId, 'TASK_UPDATED', task);
    canDelete = await PermissionService.canPerformAction(userId, userRole as any, task.projectId, 'TASK_DELETED', task);
  }

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
    createdBy: task.createdBy,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    attachments: attachmentsWithUrls,
    assignees: task.assignments.map((a) => ({
      userId: a.userId,
      name: a.user.name,
      email: a.user.email,
      assignedAt: a.assignedAt,
    })),
    permissions: {
      canEdit,
      canDelete,
    },
  };
};

// UPDATE
export const updateTask = async (id: string, data: UpdateTaskInput, userId: string): Promise<Task> => {
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

  // Log audit activity
  if (data.status && data.status !== existing.status) {
    await prisma.taskActivity.create({
      data: {
        taskId: id,
        userId,
        action: 'TASK_STATUS_CHANGED',
        description: `Task status changed from ${existing.status} to ${data.status}.`,
      },
    });

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
  } else {
    await prisma.taskActivity.create({
      data: {
        taskId: id,
        userId,
        action: 'TASK_UPDATED',
        description: `Task details were updated.`,
      },
    });
  }

  return updated;
};

// DELETE
export const deleteTask = async (id: string, userId: string): Promise<Task> => {
  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, 'Task not found.');

  const attachments = await prisma.attachment.findMany({
    where: { taskId: id },
    select: { fileKey: true },
  });

  await Promise.all(attachments.map((att) => deleteFile(att.fileKey)));

  // Log activity (note: it will delete along with cascade, but we can do it right before)
  await prisma.taskActivity.create({
    data: {
      userId,
      action: 'TASK_DELETED',
      description: `Task "${existing.title}" was deleted.`,
    },
  });

  return prisma.task.delete({ where: { id } });
};
