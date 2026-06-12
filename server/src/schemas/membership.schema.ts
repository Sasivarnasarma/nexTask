import { z } from 'zod';

export const addProjectMemberSchema = z.object({
  body: z.object({
    userId: z.string().uuid({ message: 'Invalid User ID' }),
    role: z.enum(['PROJECT_MANAGER', 'COLLABORATOR']).optional(),
  }),
});

export const updateProjectMemberSchema = z.object({
  body: z.object({
    role: z.enum(['PROJECT_MANAGER', 'COLLABORATOR']),
  }),
});
