import { ApiResponse } from '@nextask/types';
import { AxiosError } from 'axios';

export function extractApiError(err: unknown, fallback = 'An unexpected error occurred.'): string {
  if (err instanceof AxiosError) {
    const body = err.response?.data as ApiResponse | undefined;
    if (body?.errors) {
      const firstError = Object.values(body.errors)[0];
      if (firstError) return firstError;
    }
    if (body?.message) return body.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
