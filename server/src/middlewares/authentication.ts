import { Request } from 'express';

import { verifyToken } from '../utils/jwt.util';

/**
 * Routes that a user with mustResetPassword=true is still allowed to call.
 * Everything else is gated until they reset their password.
 */
const RESET_ALLOWED_PATHS: Array<{ method: string; path: string }> = [
  { method: 'POST', path: '/auth/reset-password' },
];

export async function expressAuthentication(
  request: Request,
  securityName: string,
  _scopes?: string[],
): Promise<unknown> {
  if (securityName === 'jwt') {
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw { status: 401, message: 'No token provided.' };
    }

    const token = authHeader.split(' ')[1];

    try {
      const payload = verifyToken(token);

      // ── mustResetPassword gate ──────────────────────────────────────────
      // If the user's account requires a password reset (e.g. first login),
      // block all endpoints EXCEPT the reset-password route itself.
      if (payload.mustResetPassword) {
        const isAllowed = RESET_ALLOWED_PATHS.some(
          (entry) => entry.method === request.method && request.path === entry.path,
        );

        if (!isAllowed) {
          throw {
            status: 403,
            message:
              'Your account requires a password reset before you can continue. ' +
              'Please POST to /auth/reset-password.',
          };
        }
      }
      // ────────────────────────────────────────────────────────────────────

      return payload;
    } catch (err: any) {
      // Re-throw errors that already carry a status (our own structured errors)
      if (err && typeof err === 'object' && 'status' in err) throw err;
      throw { status: 401, message: 'Invalid or expired token.' };
    }
  }

  throw { status: 401, message: 'Unknown security method.' };
}
