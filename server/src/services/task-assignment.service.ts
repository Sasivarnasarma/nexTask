import { TaskAssignee } from '@nextask/types';
import { TaskAssignment } from '@prisma/client';

import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/apiError.util';
import { verifyProjectManagerAccess, verifyProjectMemberAccess } from './project-member.service';
import { PushService } from './push.service';

/**
 * Assigns a user to a task.
 */
export async function assignUserToTask(
  taskId: string,
  userId: string,
  requestorId: string,
  requestorRole: string,
): Promise<TaskAssignment> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true },
  });
  if (!task) {
    throw new ApiError(404, 'Task not found.');
  }

  // Requester must be a PM/Owner/Admin of the project
  await verifyProjectManagerAccess(task.projectId, requestorId, requestorRole);

  // Target user must exist
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    throw new ApiError(404, 'User not found.');
  }

  // Target user must be a member of the project (or the project owner)
  const isOwner = task.project.ownerId === userId;
  const membership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId: task.projectId,
        userId,
      },
    },
  });
  if (!isOwner && !membership) {
    throw new ApiError(400, 'User is not a member of the project.');
  }

  // Check if already assigned
  const existing = await prisma.taskAssignment.findUnique({
    where: {
      taskId_userId: {
        taskId,
        userId,
      },
    },
  });
  if (existing) {
    throw new ApiError(409, 'User is already assigned to this task.');
  }

  // Create task assignment
  const assignment = await prisma.taskAssignment.create({
    data: {
      taskId,
      userId,
    },
  });

  // Optional: Send push notification
  if (userId !== requestorId) {
    PushService.sendNotificationToUser(userId, {
      title: 'Task Assigned',
      body: `You have been assigned to task "${task.title}".`,
      data: { url: `/tasks/${taskId}` },
    }).catch((err) => {
      console.error('Failed to send push notification for task assignment:', err);
    });
  }

  return assignment;
}

/**
 * Unassigns a user from a task.
 */
export async function unassignUserFromTask(
  taskId: string,
  userId: string,
  requestorId: string,
  requestorRole: string,
): Promise<void> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
  });
  if (!task) {
    throw new ApiError(404, 'Task not found.');
  }

  // Requester must be a PM/Owner/Admin of the project
  await verifyProjectManagerAccess(task.projectId, requestorId, requestorRole);

  // Check if assignment exists
  const existing = await prisma.taskAssignment.findUnique({
    where: {
      taskId_userId: {
        taskId,
        userId,
      },
    },
  });
  if (!existing) {
    throw new ApiError(404, 'Task assignment not found.');
  }

  await prisma.taskAssignment.delete({
    where: {
      taskId_userId: {
        taskId,
        userId,
      },
    },
  });
}

/**
 * Bulk assigns users to a task.
 * Note: Overwrites existing assignments.
 */
export async function bulkAssignUsersToTask(
  taskId: string,
  userIds: string[],
  requestorId: string,
  requestorRole: string,
): Promise<TaskAssignment[]> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true },
  });
  if (!task) {
    throw new ApiError(404, 'Task not found.');
  }

  // Requester must be a PM/Owner/Admin of the project
  await verifyProjectManagerAccess(task.projectId, requestorId, requestorRole);

  // If userIds is empty, just clear all assignments
  if (userIds.length === 0) {
    await prisma.taskAssignment.deleteMany({
      where: { taskId },
    });
    return [];
  }

  // De-duplicate userIds
  const uniqueUserIds = Array.from(new Set(userIds));

  // Check if all users exist
  const users = await prisma.user.findMany({
    where: { id: { in: uniqueUserIds } },
  });
  if (users.length !== uniqueUserIds.length) {
    throw new ApiError(404, 'One or more users not found.');
  }

  // Check if all users are members of the project (or the project owner)
  const memberships = await prisma.projectMember.findMany({
    where: {
      projectId: task.projectId,
      userId: { in: uniqueUserIds },
    },
    select: { userId: true },
  });

  const memberIds = new Set(memberships.map((m) => m.userId));
  if (task.project.ownerId) {
    memberIds.add(task.project.ownerId);
  }

  const allAreMembers = uniqueUserIds.every((uid) => memberIds.has(uid));
  if (!allAreMembers) {
    throw new ApiError(400, 'One or more users are not members of the project.');
  }

  // Find previously assigned user IDs to see who is newly assigned (for notifications)
  const oldAssignments = await prisma.taskAssignment.findMany({
    where: { taskId },
    select: { userId: true },
  });
  const oldUserIds = new Set(oldAssignments.map((a) => a.userId));

  // Perform bulk replacement in transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Delete all existing assignments
    await tx.taskAssignment.deleteMany({
      where: { taskId },
    });

    // 2. Create new assignments
    await tx.taskAssignment.createMany({
      data: uniqueUserIds.map((uid) => ({
        taskId,
        userId: uid,
      })),
    });

    // 3. Query and return the new assignments
    return tx.taskAssignment.findMany({
      where: { taskId },
    });
  });

  // Notify newly assigned users
  for (const uid of uniqueUserIds) {
    if (!oldUserIds.has(uid) && uid !== requestorId) {
      PushService.sendNotificationToUser(uid, {
        title: 'Task Assigned',
        body: `You have been assigned to task "${task.title}".`,
        data: { url: `/tasks/${taskId}` },
      }).catch((err) => {
        console.error('Failed to send push notification for task assignment:', err);
      });
    }
  }

  return result;
}

/**
 * Lists all assignees for a given task.
 */
export async function getTaskAssignees(
  taskId: string,
  requestorId: string,
  requestorRole: string,
): Promise<TaskAssignee[]> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
  });
  if (!task) {
    throw new ApiError(404, 'Task not found.');
  }

  // Requester must have project read/member access
  await verifyProjectMemberAccess(task.projectId, requestorId, requestorRole);

  const assignments = await prisma.taskAssignment.findMany({
    where: { taskId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { assignedAt: 'asc' },
  });

  return assignments.map((a) => ({
    userId: a.userId,
    name: a.user.name,
    email: a.user.email,
    assignedAt: a.assignedAt,
  }));
}
