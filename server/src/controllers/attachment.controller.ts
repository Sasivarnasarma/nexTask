import { Attachment, CreateAttachmentRequest } from '@nextask/types';
import type { Request as ExRequest } from 'express';
import { Middlewares } from 'tsoa';
import { Body, Controller, Delete, Get, Path, Post, Request, Route, Security, Tags } from 'tsoa';

import { validateRequest } from '../middlewares/validate.middleware';
import {
  deleteAttachmentSchema,
  getAttachmentsSchema,
  uploadAttachmentSchema,
} from '../schemas/attachment.schema';
import {
  createTaskAttachment,
  deleteAttachment,
  getAttachmentsByTaskId,
} from '../services/attachment.service';
import { ApiResponse, successResponse } from '../utils/response.util';

@Route('tasks')
@Tags('Attachments')
@Security('jwt')
export class AttachmentController extends Controller {
  /**
   * Retrieves all attachments for a specific task.
   */
  @Get('{taskId}/attachments')
  @Middlewares(validateRequest(getAttachmentsSchema))
  @Security('jwt', ['project:member'])
  public async getAttachments(@Path() taskId: string): Promise<ApiResponse<Attachment[]>> {
    const attachments = await getAttachmentsByTaskId(taskId);
    return successResponse('Attachments retrieved successfully.', attachments);
  }

  /**
   * Uploads file metadata directly to a task.
   */
  @Post('{taskId}/attachments')
  @Middlewares(validateRequest(uploadAttachmentSchema))
  @Security('jwt', ['project:member'])
  public async uploadAttachmentMetadata(
    @Path() taskId: string,
    @Body() body: CreateAttachmentRequest,
    @Request() request: ExRequest,
  ): Promise<ApiResponse<Attachment>> {
    const { userId } = (request as any).user;
    const attachment = await createTaskAttachment(userId, taskId, body);
    return successResponse('Attachment metadata registered successfully.', attachment);
  }
}

@Route('attachments')
@Tags('Attachments')
@Security('jwt')
export class AttachmentDeleteController extends Controller {
  /**
   * Deletes an attachment metadata record by ID.
   */
  @Delete('{attachmentId}')
  @Middlewares(validateRequest(deleteAttachmentSchema))
  @Security('jwt', ['project:member'])
  public async removeAttachment(
    @Path() attachmentId: string,
    @Request() request: ExRequest,
  ): Promise<ApiResponse<null>> {
    const { userId, role } = (request as any).user;
    await deleteAttachment(attachmentId, userId, role);
    return successResponse('Attachment deleted successfully.', null);
  }
}
