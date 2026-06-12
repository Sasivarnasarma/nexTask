import { z } from 'zod';

export const createTaskSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    projectId: z.uuid({ message: 'Invalid Project ID' }),
    dueDate: z.iso.datetime({ message: 'Invalid due date' }).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED']).optional(),
    tags: z.array(z.string()).optional(),
    position: z.number().optional(),
  }),
});

export const updateTaskSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title cannot be empty').optional(),
    description: z.string().optional(),
    dueDate: z.iso.datetime({ message: 'Invalid due date' }).optional().nullable(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED']).optional(),
    tags: z.array(z.string()).optional(),
    position: z.number().optional(),
  }),
});
