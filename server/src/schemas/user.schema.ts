import { z } from 'zod';

export const userAutocompleteQuerySchema = z.object({
  query: z.object({
    projectId: z.uuid({ message: 'Invalid Project ID' }),
    search: z.string().min(1, 'Search query cannot be empty'),
  }),
});
