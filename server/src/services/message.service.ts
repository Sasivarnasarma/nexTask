import { CreateAttachmentRequest, Message } from '@nextask/types';

import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/apiError.util';
import { generateDownloadUrl } from './s3.service';

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
        attachments: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return Promise.all(
      messages.map(async (m) => {
        const mappedAttachments = await Promise.all(
          m.attachments.map(async (att) => {
            const url = await generateDownloadUrl(att.fileKey);
            return {
              id: att.id,
              filename: att.filename,
              fileKey: att.fileKey,
              mimeType: att.mimeType,
              fileSize: att.fileSize,
              messageId: att.messageId,
              uploadedById: att.uploadedById,
              createdAt: att.createdAt,
              presignedUrl: url || undefined,
            };
          }),
        );

        return {
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
          attachments: mappedAttachments,
        };
      }),
    );
  }

  /**
   * Creates a new message in the database.
   */
  public async createMessage(
    projectId: string,
    senderId: string,
    content: string,
    attachments?: CreateAttachmentRequest[],
  ): Promise<Message> {
    const message = await prisma.$transaction(async (tx) => {
      const msg = await tx.message.create({
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

      const createdAttachments: any[] = [];
      if (attachments && attachments.length > 0) {
        for (const att of attachments) {
          const parsedSize = Math.floor(att.fileSize);
          const created = await tx.messageAttachment.create({
            data: {
              filename: att.filename,
              fileKey: att.fileKey,
              mimeType: att.mimeType,
              fileSize: isNaN(parsedSize) || parsedSize <= 0 ? 0 : parsedSize,
              messageId: msg.id,
              uploadedById: senderId,
            },
          });
          createdAttachments.push(created);
        }
      }

      return {
        ...msg,
        attachments: createdAttachments,
      };
    });

    const mappedAttachments = await Promise.all(
      message.attachments.map(async (att) => {
        const url = await generateDownloadUrl(att.fileKey);
        return {
          id: att.id,
          filename: att.filename,
          fileKey: att.fileKey,
          mimeType: att.mimeType,
          fileSize: att.fileSize,
          messageId: att.messageId,
          uploadedById: att.uploadedById,
          createdAt: att.createdAt,
          presignedUrl: url || undefined,
        };
      }),
    );

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
      attachments: mappedAttachments,
    };
  }
}
