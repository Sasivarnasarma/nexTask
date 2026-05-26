import jwt from 'jsonwebtoken';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required.');
  }
  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long.');
  }
  return secret;
}

const JWT_SECRET = getJwtSecret();
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
  return jwt.verify(token, JWT_SECRET) as unknown as JwtPayload;
}
