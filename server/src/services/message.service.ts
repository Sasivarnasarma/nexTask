import { Message } from '@nextask/types';

import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/apiError.util';

export class MessageService {
  /**
   * Fetches message history for a given project.
   * Access control should be verified before calling this.
   */
  public async getProjectMessages(projectId: string): Promise<Message[]> {
    const projectExists = await prisma.project.findUnique({ where: { id: projectId } });
    if (!projectExists) {
      throw new ApiError(404, 'Project not found.');
    }

    const messages = await prisma.message.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
    });

    return messages.map((m) => ({
      id: m.id,
      content: m.content,
      projectId: m.projectId,
      senderId: m.senderId,
      sender: {
        id: m.sender.id,
        email: m.sender.email,
        name: m.sender.name,
        role: m.sender.role,
      },
      createdAt: m.createdAt,
    }));
  }

  /**
   * Creates a new message in the database.
   */
  public async createMessage(
    projectId: string,
    senderId: string,
    content: string,
  ): Promise<Message> {
    const message = await prisma.message.create({
      data: {
        content,
        projectId,
        senderId,
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
    });

    return {
      id: message.id,
      content: message.content,
      projectId: message.projectId,
      senderId: message.senderId,
      sender: {
        id: message.sender.id,
        email: message.sender.email,
        name: message.sender.name,
        role: message.sender.role,
      },
      createdAt: message.createdAt,
    };
  }
}
