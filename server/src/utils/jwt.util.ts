import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_please_change_in_production';
const JWT_EXPIRES_IN = '24h';

export interface JwtPayload {
  userId: string;
  role: string;
  mustResetPassword: boolean;
}

/**
 * Generates a signed JWT containing user identity and access details.
 */
export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verifies and decodes a signed JWT.
 * Throws an error if the token is invalid or expired.
 */
export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
