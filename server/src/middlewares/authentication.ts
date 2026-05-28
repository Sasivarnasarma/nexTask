import { Request } from 'express';
import jwt from 'jsonwebtoken';

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
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
      return decoded;
    } catch {
      throw { status: 401, message: 'Invalid or expired token.' };
    }
  }

  throw { status: 401, message: 'Unknown security method.' };
}
