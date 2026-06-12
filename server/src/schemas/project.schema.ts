import { z } from 'zod';

export const createProjectSchema = z.object({
  body: z.object({
    name: z.string().min(3, 'Project name must be at least 3 characters'),
    description: z.string().optional(),
  }),
});

export const updateProjectSchema = z.object({
  params: z.object({
    id: z.uuid({ message: 'Invalid Project ID' }),
  }),
  body: z.object({
    name: z.string().min(3, 'Project name must be at least 3 characters'),
    description: z.string().optional(),
  }),
});

export const getProjectSchema = z.object({
  params: z.object({
    id: z.uuid({ message: 'Invalid Project ID' }),
  }),
});

export const completeProjectSchema = z.object({
  params: z.object({
    id: z.uuid({ message: 'Invalid Project ID' }),
  }),
});

export const archiveProjectSchema = z.object({
  params: z.object({
    id: z.uuid({ message: 'Invalid Project ID' }),
  }),
});

export const deleteProjectSchema = z.object({
  params: z.object({
    id: z.uuid({ message: 'Invalid Project ID' }),
  }),
});

