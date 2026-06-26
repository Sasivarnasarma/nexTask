import { z } from 'zod';

export const userAutocompleteQuerySchema = z.object({
  query: z.object({
    projectId: z.uuid({ message: 'Invalid Project ID' }),
    q: z.string().trim(),
  }),
});

export const createUserSchema = z.object({
  body: z.object({
    email: z.string().trim().email('Invalid email address'),
    name: z.string().trim().nullable().optional(),
    role: z.enum(['ADMIN', 'PROJECT_MANAGER', 'COLLABORATOR']),
  }),
});

export const updateUserSchema = z.object({
  params: z.object({
    id: z.uuid({ message: 'Invalid User ID' }),
  }),
  body: z.object({
    email: z.string().trim().email('Invalid email address'),
    name: z.string().trim().nullable().optional(),
    role: z.enum(['ADMIN', 'PROJECT_MANAGER', 'COLLABORATOR']),
  }),
});

export const listUsersQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(1000).default(10),
    search: z.string().trim().optional(),
  }),
});

export const deleteUserSchema = z.object({
  params: z.object({
    id: z.uuid({ message: 'Invalid User ID' }),
  }),
});

export const getUserActivitySchema = z.object({
  params: z.object({
    id: z.uuid({ message: 'Invalid User ID' }),
  }),
});

export const getUserSchema = z.object({
  params: z.object({
    id: z.uuid({ message: 'Invalid User ID' }),
  }),
});
