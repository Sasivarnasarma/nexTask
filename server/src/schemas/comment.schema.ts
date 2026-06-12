import { z } from 'zod';

export const createCommentSchema = z.object({
  body: z.object({
    content: z.string().trim().min(1, "Comment cannot be empty"),
    attachments: z.array(
      z.object({
        filename: z.string(),
        fileKey: z.string(),
        mimeType: z.string(),
        fileSize: z.number()
      })
    ).optional()
  })
});