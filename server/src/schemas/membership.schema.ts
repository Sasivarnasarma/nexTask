import { z } from 'zod';

export const addProjectMemberSchema = z.object({
  params: z.object({
    id: z.uuid({ message: 'Invalid Project ID' }),
  }),
  body: z.object({
    userId: z.uuid({ message: 'Invalid User ID' }),
    role: z.enum(['PROJECT_MANAGER', 'COLLABORATOR']),
  }),
});

export const updateProjectMemberSchema = z.object({
  params: z.object({
    id: z.uuid({ message: 'Invalid Project ID' }),
    userId: z.uuid({ message: 'Invalid User ID' }),
  }),
  body: z.object({
    role: z.enum(['PROJECT_MANAGER', 'COLLABORATOR']),
  }),
});

export const getProjectMembersSchema = z.object({
  params: z.object({
    id: z.uuid({ message: 'Invalid Project ID' }),
  }),
});

export const getProjectMemberDetailsSchema = z.object({
  params: z.object({
    id: z.uuid({ message: 'Invalid Project ID' }),
    userId: z.uuid({ message: 'Invalid User ID' }),
  }),
});

export const assignProjectManagerSchema = z.object({
  params: z.object({
    id: z.uuid({ message: 'Invalid Project ID' }),
    userId: z.uuid({ message: 'Invalid User ID' }),
  }),
});

export const assignCollaboratorSchema = z.object({
  params: z.object({
    id: z.uuid({ message: 'Invalid Project ID' }),
    userId: z.uuid({ message: 'Invalid User ID' }),
  }),
});

export const removeProjectMemberSchema = z.object({
  params: z.object({
    id: z.uuid({ message: 'Invalid Project ID' }),
    userId: z.uuid({ message: 'Invalid User ID' }),
  }),
});
