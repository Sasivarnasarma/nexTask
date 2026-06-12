import { z } from 'zod';

export const assignUserSchema = z.object({
  params: z.object({
    taskId: z.uuid({ message: 'Invalid Task ID' }),
  }),
  body: z.object({
    userId: z.uuid({ message: 'Invalid User ID' }),
  }),
});

export const unassignUserSchema = z.object({
  params: z.object({
    taskId: z.uuid({ message: 'Invalid Task ID' }),
    userId: z.uuid({ message: 'Invalid User ID' }),
  }),
});

export const bulkAssignSchema = z.object({
  params: z.object({
    taskId: z.uuid({ message: 'Invalid Task ID' }),
  }),
  body: z.object({
    userIds: z.array(z.uuid({ message: 'Invalid User ID' })),
  }),
});

export const getAssigneesSchema = z.object({
  params: z.object({
    taskId: z.uuid({ message: 'Invalid Task ID' }),
  }),
});
