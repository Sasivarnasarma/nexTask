import { MessageListResponse } from '@nextask/types';
import type { Request as ExRequest } from 'express';
import { Controller, Get, Path, Request, Route, Security, SuccessResponse, Tags } from 'tsoa';

import { prisma } from '../lib/prisma';
import { MessageService } from '../services/message.service';
import { ApiError } from '../utils/apiError.util';
import { successResponse } from '../utils/response.util';

@Route('messages')
@Tags('Messages')
@Security('jwt')
export class MessageController extends Controller {
  private messageService: MessageService;

  constructor() {
    super();
    this.messageService = new MessageService();
  }

  /**
   * Fetches the real-time chat history of a project.
   * Access is restricted to authorized project members only.
   */
  @SuccessResponse('200', 'OK')
  @Get('{projectId}')
  public async getMessages(
    @Path() projectId: string,
    @Request() request: ExRequest,
  ): Promise<MessageListResponse> {
    const { userId, role } = (request as any).user;

    // Authorization check: Admin, Project Owner, or Project Member
    let hasAccess = role === 'ADMIN';

    if (!hasAccess) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { ownerId: true },
      });
      if (project && project.ownerId === userId) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      const membership = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId,
          },
        },
      });
      if (membership) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      throw new ApiError(403, 'Access denied. You are not a member of this project.');
    }

    const messages = await this.messageService.getProjectMessages(projectId);
    return successResponse('Messages retrieved successfully.', messages);
  }
}
