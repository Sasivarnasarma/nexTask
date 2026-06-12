import { z } from 'zod';

export const uploadAttachmentSchema = z.object({
  body: z.object({
    filename: z.string().min(1),
    fileKey: z.string().min(1),
    mimeType: z.string(),
    fileSize: z.number().positive("File size must be greater than 0"),
    
  })
});