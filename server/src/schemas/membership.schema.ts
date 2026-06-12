import { z } from 'zod';

export const addProjectMemberSchema = z.object({
  body: z.object({
    userId: z.uuid({ message: 'Invalid User ID' }),
    role: z.enum(['PROJECT_MANAGER', 'COLLABORATOR']),
  }),
});

export const updateProjectMemberSchema = z.object({
  body: z.object({
    role: z.enum(['PROJECT_MANAGER', 'COLLABORATOR']),
  }),
});
