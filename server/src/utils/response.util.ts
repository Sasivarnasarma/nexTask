import { ApiResponse } from '@nextask/types';

export type { ApiResponse };

export function successResponse<T>(message: string, data: T): ApiResponse<T> {
  return {
    success: true,
    message,
    data,
    errors: null,
  };
}

export function errorResponse(
  message: string,
  errors: Record<string, string> | null = null,
): ApiResponse<null> {
  return {
    success: false,
    message,
    data: null,
    errors: errors || { error: message },
  };
}
