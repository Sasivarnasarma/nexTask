import { z } from 'zod';

export const createTaskSchema = z.object({
  body: z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    projectId: z.string().uuid("Invalid Project ID"),
    dueDate: z.string().optional(), // Or z.string().datetime() depending on your setup
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(), 
    status: z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED']).optional(), 
    tags: z.array(z.string()).optional(),
    position: z.number().optional()
  })
});