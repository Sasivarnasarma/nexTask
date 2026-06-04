import { GetPresignedUrlRequest, GetPresignedUrlResponse } from '@nextask/types';
import { Body, Controller, Post, Route, Security, Tags } from 'tsoa';

import { generateUploadUrl } from '../services/s3.service';
import { ApiResponse, successResponse } from '../utils/response.util';

@Route('attachments')
@Tags('Attachments')
@Security('jwt')
export class AttachmentUploadController extends Controller {
  @Post('presigned-url')
  public async getPresignedUrl(
    @Body() body: GetPresignedUrlRequest,
  ): Promise<ApiResponse<GetPresignedUrlResponse>> {
    const urls = await generateUploadUrl(body.filename, body.mimeType, body.fileSize);
    return successResponse('Presigned upload URL generated successfully.', urls);
  }
}
