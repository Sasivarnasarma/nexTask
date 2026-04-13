import * as argon2 from 'argon2';

/**
 * Hashes a plaintext password using Argon2 asynchronously.
 * @param plainPassword The raw password string.
 * @returns The encoded argon2 hash string.
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  return await argon2.hash(plainPassword);
}

/**
 * Verifies a plaintext password against an Argon2 hash.
 * @param hash The encoded argon2 hash string.
 * @param plainPassword The raw password string.
 * @returns Boolean indicating if the password matches.
 */
export async function verifyPassword(hash: string, plainPassword: string): Promise<boolean> {
  return await argon2.verify(hash, plainPassword);
}
