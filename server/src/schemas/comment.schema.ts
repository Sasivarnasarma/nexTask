import { z } from 'zod';

export const createCommentSchema = z.object({
  params: z.object({
    taskId: z.uuid({ message: 'Invalid Task ID' }),
  }),
  body: z.object({
    content: z.string().trim().min(1, 'Comment cannot be empty'),
    attachments: z
      .array(
        z.object({
          filename: z.string(),
          fileKey: z.string(),
          mimeType: z.string(),
          fileSize: z.number().int(),
        }),
      )
      .optional(),
  }),
});

export const getCommentsSchema = z.object({
  params: z.object({
    taskId: z.uuid({ message: 'Invalid Task ID' }),
  }),
});

export const deleteCommentSchema = z.object({
  params: z.object({
    commentId: z.uuid({ message: 'Invalid Comment ID' }),
  }),
});
