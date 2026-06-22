import http from 'http';
import { Server } from 'socket.io';

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
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization;

    if (!token) {
      return next(new Error('Authentication error: Token required'));
    }

    const jwtToken = token.startsWith('Bearer ') ? token.substring(7) : token;
    try {
      const payload = verifyToken(jwtToken);
      socket.data = { user: payload };
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.user?.userId;
    console.log(`Socket connected: ${socket.id} (User: ${userId})`);

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
