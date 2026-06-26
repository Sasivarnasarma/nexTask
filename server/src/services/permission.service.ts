import { Role, Task } from '@prisma/client';
import { prisma } from '../lib/prisma';

export type TaskAction =
  | 'TASK_CREATED'
  | 'TASK_UPDATED'
  | 'TASK_DELETED'
  | 'TASK_STATUS_CHANGED'
  | 'TASK_ASSIGNED'
  | 'TASK_COMMENT_ADDED'
  | 'TASK_COMMENT_UPDATED'
  | 'TASK_COMMENT_DELETED'
  | 'TASK_ATTACHMENT_ADDED'
  | 'TASK_ATTACHMENT_DELETED';

export class PermissionService {
  /**
   * Evaluates if a user role can perform the given action in a project context.
   * Derives permissions strictly on the backend.
   */
  public static async canPerformAction(
    userId: string,
    userRole: Role,
    projectId: string,
    action: TaskAction,
    task?: Task | null
  ): Promise<boolean> {
    // 1. ADMIN has global system-wide access
    if (userRole === 'ADMIN') {
      return true;
    }

    // 2. PROJECT_MANAGER role check inside project membership
    if (userRole === 'PROJECT_MANAGER') {
      // Check if project owner
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { ownerId: true },
      });
      if (project?.ownerId === userId) {
        return true;
      }

      // Check if project member with PROJECT_MANAGER role
      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId,
          },
        },
        select: { role: true },
      });
      return member?.role === 'PROJECT_MANAGER';
    }

    // 3. COLLABORATOR checks
    if (userRole === 'COLLABORATOR') {
      // Must be a project member first
      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId,
          },
        },
        select: { role: true },
      });
      if (!member) {
        return false;
      }

      // Collaborator is restricted to status updates, comment operations, and attachment operations
      const allowedActions: TaskAction[] = [
        'TASK_STATUS_CHANGED',
        'TASK_COMMENT_ADDED',
        'TASK_COMMENT_UPDATED',
        'TASK_COMMENT_DELETED',
        'TASK_ATTACHMENT_ADDED',
        'TASK_ATTACHMENT_DELETED',
      ];

      if (allowedActions.includes(action)) {
        // For comments, attachments, or status changes, collaborator must be assigned to the task
        if (task) {
          const assignment = await prisma.taskAssignment.findUnique({
            where: {
              taskId_userId: {
                taskId: task.id,
                userId,
              },
            },
          });
          return !!assignment;
        }
        return true;
      }
    }

    return false;
  }
}
