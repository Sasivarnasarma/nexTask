import { GetPresignedUrlRequest, GetPresignedUrlResponseWrapper } from '@nextask/types';
import type { Request as ExRequest } from 'express';
import { Body, Controller, Middlewares, Post, Request, Route, Security, Tags } from 'tsoa';

import { validateRequest } from '../middlewares/validate.middleware';
import { getPresignedUrlSchema } from '../schemas/attachment.schema';
import { verifyProjectMemberAccess } from '../services/project-member.service';
import { generateUploadUrl } from '../services/s3.service';
import { ApiError } from '../utils/apiError.util';
import { successResponse } from '../utils/response.util';

@Route('attachments')
@Tags('Attachments')
@Security('jwt')
export class AttachmentUploadController extends Controller {
  /**
   * Generates a cryptographically signed S3 PUT URL.
   * Requires project membership validation and enforces a 25MB file size boundary.
   */
  @Post('presigned-url')
  @Middlewares(validateRequest(getPresignedUrlSchema))
  public async getPresignedUrl(
    @Body() body: GetPresignedUrlRequest,
    @Request() request: ExRequest,
  ): Promise<GetPresignedUrlResponseWrapper> {
    const { userId, role } = (request as any).user;

    // Enforce project boundary - user must belong to the project to upload files
    await verifyProjectMemberAccess(body.projectId, userId, role);

    // Enforce strict upper bound of 25MB for uploaded files
    const maxLimit = 25 * 1024 * 1024; // 25MB
    if (body.fileSize > maxLimit) {
      throw new ApiError(400, 'File size exceeds the maximum limit of 25MB.');
    }

    const urls = await generateUploadUrl(body.filename, body.mimeType, body.fileSize);
    return successResponse('Presigned upload URL generated successfully.', urls);
  }
}
