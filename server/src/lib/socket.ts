import http from 'http';
import { Server } from 'socket.io';

import { MessageService } from '../services/message.service';
import { verifyToken } from '../utils/jwt.util';
import { prisma } from './prisma';

let io: Server | null = null;

/**
 * Initializes the Socket.io server and registers connection middlewares and listeners.
 */
export const initSocket = (server: http.Server) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
  });

  // JWT Authentication Middleware for Sockets
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;

    if (!token) {
      return next(new Error('Authentication error: Token required'));
    }

    const jwtToken = token.startsWith('Bearer ') ? token.substring(7) : token;
    try {
      const payload = verifyToken(jwtToken);
      socket.data = { user: payload };
      next();
    } catch {
      next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.user?.userId;
    console.log(`Socket connected: ${socket.id} (User: ${userId})`);

    if (userId) {
      socket.join(`user:${userId}`);
      console.log(`Socket ${socket.id} joined user room: user:${userId}`);
    }

    // Room Isolation & Authorization Check
    socket.on('join-project', async (projectId: string) => {
      const currentUserId = socket.data.user?.userId;
      const currentUserRole = socket.data.user?.role;
      if (!currentUserId) {
        return socket.emit('error', 'Unauthorized: Invalid socket user context.');
      }

      try {
        // 1. Global Admin bypass
        let hasAccess = currentUserRole === 'ADMIN';

        // 2. Project Owner check
        if (!hasAccess) {
          const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { ownerId: true },
          });
          if (project && project.ownerId === currentUserId) {
            hasAccess = true;
          }
        }

        // 3. Project Member check
        if (!hasAccess) {
          const membership = await prisma.projectMember.findUnique({
            where: {
              projectId_userId: {
                projectId,
                userId: currentUserId,
              },
            },
          });
          if (membership) {
            hasAccess = true;
          }
        }

        if (hasAccess) {
          socket.join(`project:${projectId}`);
          console.log(`Socket ${socket.id} joined room project:${projectId}`);
          socket.emit('joined-project', { projectId });
        } else {
          console.warn(`Access denied for User ${currentUserId} to room project:${projectId}`);
          socket.emit('error', 'Access denied. You are not a member of this project.');
        }
      } catch (err) {
        console.error('Error verifying project room access:', err);
        socket.emit('error', 'Internal server error while joining project.');
      }
    });

    socket.on('leave-project', (projectId: string) => {
      socket.leave(`project:${projectId}`);
      console.log(`Socket ${socket.id} left room project:${projectId}`);
      socket.emit('left-project', { projectId });
    });

    socket.on(
      'send-message',
      async (data: { projectId: string; content: string; attachments?: any[] }) => {
        const currentUserId = socket.data.user?.userId;
        if (!currentUserId) return;

        try {
          const messageService = new MessageService();
          const message = await messageService.createMessage(
            data.projectId,
            currentUserId,
            data.content,
            data.attachments,
          );
          broadcastToProject(data.projectId, 'receive-message', message);

          // Proactively notify other project members via in-app notifications
          const project = await prisma.project.findUnique({
            where: { id: data.projectId },
            include: {
              members: { select: { userId: true } },
            },
          });

          if (project) {
            const memberIds = new Set<string>();
            if (project.ownerId !== currentUserId) {
              memberIds.add(project.ownerId);
            }
            project.members.forEach((m) => {
              if (m.userId !== currentUserId) {
                memberIds.add(m.userId);
              }
            });

            const senderName = socket.data.user?.name || socket.data.user?.email || 'A teammate';
            const truncatedContent = data.content.substring(0, 40) + (data.content.length > 40 ? '...' : '');

            const { NotificationService } = await import('../services/notification.service');

            for (const memberId of memberIds) {
              NotificationService.createNotification(
                memberId,
                `${senderName} in "${project.name}": "${truncatedContent}"`,
                'CHAT_MESSAGE' as any,
                undefined,
              ).catch((err) => console.error('Failed to create chat notification:', err));
            }
          }
        } catch (err) {
          console.error('Failed to handle send-message socket event:', err);
        }
      },
    );

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

/**
 * Retrieves the initialized Socket.io Server instance.
 */
export const getIo = (): Server => {
  if (!io) {
    throw new Error('Socket.io has not been initialized.');
  }
  return io;
};

/**
 * Broadcasts an event to all sockets in a specific project room.
 */
export const broadcastToProject = (projectId: string, eventName: string, data: any) => {
  if (io) {
    io.to(`project:${projectId}`).emit(eventName, data);
  }
};

/**
 * Broadcasts an event to a specific user's private room.
 */
export const sendNotificationToUser = (userId: string, eventName: string, data: any) => {
  if (io) {
    io.to(`user:${userId}`).emit(eventName, data);
  }
};

