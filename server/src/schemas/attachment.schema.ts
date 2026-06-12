import { z } from 'zod';

export const uploadAttachmentSchema = z.object({
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
    fileSize: z.number().int().positive('File size must be greater than 0'),
});
