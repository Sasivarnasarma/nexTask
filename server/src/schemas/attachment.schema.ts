import { z } from 'zod';

export const uploadAttachmentSchema = z.object({
  params: z.object({
    taskId: z.uuid({ message: 'Invalid Task ID' }),
  }),
  body: z.object({
    filename: z.string().min(1, 'Filename is required'),
    fileKey: z.string().min(1, 'File key is required'),
    mimeType: z.string().min(1, 'Mime type is required'),
    fileSize: z.number().int().positive('File size must be greater than 0'),
  }),
});

export const getPresignedUrlSchema = z.object({
  body: z.object({
    filename: z.string().min(1, 'Filename is required'),
    mimeType: z.string().min(1, 'Mime type is required'),
    fileSize: z
      .number()
      .int()
      .positive('File size must be greater than 0')
      .max(26214400, 'File size cannot exceed 25MB'),
    projectId: z.string().uuid('Invalid Project ID format'),
  }),
});

export const getAttachmentsSchema = z.object({
  params: z.object({
    taskId: z.uuid({ message: 'Invalid Task ID' }),
  }),
});

export const deleteAttachmentSchema = z.object({
  params: z.object({
    attachmentId: z.uuid({ message: 'Invalid Attachment ID' }),
  }),
});
