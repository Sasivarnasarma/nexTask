import { z } from 'zod';

export const addProjectMemberSchema = z.object({
  body: z.object({
    userId: z.string().uuid("Invalid User ID"),
    role: z.enum(['PROJECT_MANAGER', 'COLLABORATOR']).optional()
  })
});