export interface ApiResponse<T = null> {
  status: 'success' | 'error';
  message: string;
  data: T | null;
  error: string | null;
}

export function successResponse<T>(message: string, data: T): ApiResponse<T> {
  return {
    status: 'success',
    message,
    data,
    error: null,
  };
}

export function errorResponse(message: string, error?: string): ApiResponse<null> {
  return {
    status: 'error',
    message,
    data: null,
    error: error || message,
  };
}
