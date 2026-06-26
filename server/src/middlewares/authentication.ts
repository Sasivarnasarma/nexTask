import { Request } from 'express';

import { prisma } from '../lib/prisma';
import { verifyToken } from '../utils/jwt.util';

/**
 * Routes that a user with mustResetPassword=true is still allowed to call.
 * Everything else is gated until they reset their password.
 */
const RESET_ALLOWED_PATHS: Array<{ method: string; path: string }> = [
  { method: 'POST', path: '/auth/reset-password' },
];

/**
 * Helper to resolve the projectId context from the Express Request object.
 */
async function getProjectIdFromRequest(request: Request): Promise<string | null> {
  const { params, query, body, path, method } = request;

  // 1. Project ID direct path parameter (e.g. /projects/:id or /tasks/project/:projectId)
  if (params.projectId && typeof params.projectId === 'string') {
    return params.projectId;
  }

  if (path.startsWith('/projects/') && params.id && typeof params.id === 'string') {
    return params.id;
  }

  // 2. Task ID path parameter (e.g. /tasks/:id or /tasks/:taskId/comments)
  const taskId =
    typeof params.taskId === 'string'
      ? params.taskId
      : path.startsWith('/tasks/') && typeof params.id === 'string'
        ? params.id
        : undefined;
  if (taskId) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { projectId: true },
    });
    return task?.projectId || null;
  }

  // 3. Comment ID path parameter (e.g. /comments/:commentId or /comments/:id)
  const commentId =
    typeof params.commentId === 'string'
      ? params.commentId
      : path.startsWith('/comments/') && typeof params.id === 'string'
        ? params.id
        : undefined;
  if (commentId) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { taskId: true },
    });
    if (comment?.taskId) {
      const task = await prisma.task.findUnique({
        where: { id: comment.taskId },
        select: { projectId: true },
      });
      return task?.projectId || null;
    }
  }

  // 4. Attachment ID path parameter (e.g. /attachments/:attachmentId or /attachments/:id)
  const attachmentId =
    typeof params.attachmentId === 'string'
      ? params.attachmentId
      : path.startsWith('/attachments/') && typeof params.id === 'string'
        ? params.id
        : undefined;
  if (attachmentId) {
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      select: { taskId: true },
    });
    if (attachment?.taskId) {
      const task = await prisma.task.findUnique({
        where: { id: attachment.taskId },
        select: { projectId: true },
      });
      return task?.projectId || null;
    }
  }

  // 5. Body property check (ONLY for resource creation, e.g. POST /tasks)
  if (method === 'POST' && body && body.projectId && typeof body.projectId === 'string') {
    return body.projectId;
  }

  // 6. Query parameter check (ONLY for resource listing, e.g. GET /tasks)
  if (method === 'GET' && query.projectId && typeof query.projectId === 'string') {
    return query.projectId;
  }

  return null;
}

export async function expressAuthentication(
  request: Request,
  securityName: string,
  scopes?: string[],
): Promise<unknown> {
  if (securityName === 'jwt') {
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw { status: 401, message: 'No token provided.' };
    }

    const token = authHeader.split(' ')[1];

    try {
      const payload = verifyToken(token);

      // ── Database Verification of User Status & Roles ─────────────────────
      // Query the database to ensure the user exists, is active, and matches JWT role/reset claims.
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { isActive: true, role: true, mustResetPassword: true },
      });

      if (!user) {
        throw { status: 401, message: 'User not found.' };
      }

      if (!user.isActive) {
        throw {
          status: 403,
          message: 'Your account has been deactivated. Please contact an administrator.',
        };
      }

      // Detect if user's role has been updated or demoted in the database, invalidating the stale JWT claims
      if (user.role !== payload.role) {
        throw {
          status: 401,
          message: 'User role has changed. Please log in again to refresh your session.',
        };
      }

      // Detect if user's password reset status has changed, invalidating the stale JWT claims
      if (user.mustResetPassword !== payload.mustResetPassword) {
        throw {
          status: 401,
          message: 'Security credentials updated. Please log in again to refresh your session.',
        };
      }

      // ── mustResetPassword gate ──────────────────────────────────────────
      // If the user's account requires a password reset (e.g. first login),
      // block all endpoints EXCEPT the reset-password route itself.
      if (user.mustResetPassword) {
        const isAllowed = RESET_ALLOWED_PATHS.some(
          (entry) => entry.method === request.method && request.path === entry.path,
        );

        if (!isAllowed) {
          throw {
            status: 403,
            message:
              'Your account requires a password reset before you can continue. ' +
              'Please POST to /auth/reset-password.',
          };
        }
      }
      // ────────────────────────────────────────────────────────────────────

      // ── Scopes Authorization checks ─────────────────────────────────────
      if (scopes && scopes.length > 0) {
        for (const scope of scopes) {
          if (scope === 'global:admin') {
            if (payload.role !== 'ADMIN') {
              throw { status: 403, message: 'Access denied. Administrator privileges required.' };
            }
          } else if (scope === 'global:pm') {
            if (payload.role !== 'ADMIN' && payload.role !== 'PROJECT_MANAGER') {
              throw { status: 403, message: 'Access denied. PM or Admin privileges required.' };
            }
          } else if (scope === 'project:member' || scope === 'project:manager') {
            const projectId = await getProjectIdFromRequest(request);
            if (!projectId) {
              throw { status: 400, message: 'Project context is required for this request.' };
            }

            // Global Admins bypass project-level checks
            if (payload.role === 'ADMIN') {
              continue;
            }

            const project = await prisma.project.findUnique({
              where: { id: projectId },
              select: { ownerId: true },
            });
            if (!project) {
              throw { status: 404, message: 'Project not found.' };
            }

            // Project owner automatically bypasses membership checks
            if (project.ownerId === payload.userId) {
              continue;
            }

            const membership = await prisma.projectMember.findUnique({
              where: {
                projectId_userId: {
                  projectId,
                  userId: payload.userId,
                },
              },
              select: { role: true },
            });

            if (!membership) {
              throw {
                status: 403,
                message: 'Access denied. You are not a member of this project.',
              };
            }

            if (scope === 'project:manager') {
              if (membership.role !== 'PROJECT_MANAGER') {
                throw {
                  status: 403,
                  message: 'Access denied. Project Manager privileges required for this project.',
                };
              }
            }
          }
        }
      }
      // ────────────────────────────────────────────────────────────────────

      return payload;
    } catch (err: any) {
      // Re-throw errors that already carry a status (our own structured errors)
      if (err && typeof err === 'object' && 'status' in err) throw err;
      throw { status: 401, message: 'Invalid or expired token.' };
    }
  }

  throw { status: 401, message: 'Unknown security method.' };
}
