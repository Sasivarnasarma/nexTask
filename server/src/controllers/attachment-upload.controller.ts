import { GetPresignedUrlRequest, GetPresignedUrlResponse } from '@nextask/types';
import { Body, Controller, Middlewares, Post, Route, Security, Tags } from 'tsoa';

import { validateRequest } from '../middlewares/validate.middleware';
import { getPresignedUrlSchema } from '../schemas/attachment.schema';
import { generateUploadUrl } from '../services/s3.service';
import { ApiResponse, successResponse } from '../utils/response.util';

@Route('attachments')
@Tags('Attachments')
@Security('jwt')
export class AttachmentUploadController extends Controller {
  @Post('presigned-url')
  @Middlewares(validateRequest(getPresignedUrlSchema))
  public async getPresignedUrl(
    @Body() body: GetPresignedUrlRequest,
  ): Promise<ApiResponse<GetPresignedUrlResponse>> {
    const urls = await generateUploadUrl(body.filename, body.mimeType, body.fileSize);
    return successResponse('Presigned upload URL generated successfully.', urls);
  }
}
