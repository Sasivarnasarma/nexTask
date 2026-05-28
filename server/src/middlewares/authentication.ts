import { Request } from 'express';

import { verifyToken } from '../utils/jwt.util';

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
      return verifyToken(token);
    } catch {
      throw { status: 401, message: 'Invalid or expired token.' };
    }
  }

  throw { status: 401, message: 'Unknown security method.' };
}
