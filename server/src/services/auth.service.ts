import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/apiError.util';
import { hashPassword, verifyPassword } from '../utils/hash.util';
import { generateToken } from '../utils/jwt.util';
import { validatePasswordComplexity } from '../utils/password.util';

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthData {
  token: string;
  mustResetPassword: boolean;
}

export interface ResetPasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export class AuthService {
  public async register(data: RegisterRequest): Promise<AuthData> {
    const isPublicRegistrationAllowed = process.env.ALLOW_PUBLIC_REGISTRATION === 'true';

    if (!isPublicRegistrationAllowed) {
      throw new ApiError(403, 'Public registration is currently disabled.');
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ApiError(409, 'An account with this email already exists.');
    }

    const hashedPassword = await hashPassword(data.password);

    const newUser = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        mustResetPassword: true,
      },
    });

    const token = generateToken({
      userId: newUser.id,
      role: newUser.role,
      mustResetPassword: newUser.mustResetPassword,
    });

    return { token, mustResetPassword: newUser.mustResetPassword };
  }

  public async login(data: LoginRequest): Promise<AuthData> {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new ApiError(401, 'Invalid email or password.');
    }

    const isPasswordValid = await verifyPassword(user.password, data.password);
    if (!isPasswordValid) {
      throw new ApiError(401, 'Invalid email or password.');
    }

    const token = generateToken({
      userId: user.id,
      role: user.role,
      mustResetPassword: user.mustResetPassword,
    });

    return { token, mustResetPassword: user.mustResetPassword };
  }

  /**
   * Handles first-login (and any subsequent) password reset.
   * - Verifies the current password.
   * - Validates new password complexity.
   * - Ensures the new password differs from the current one.
   * - Clears the mustResetPassword flag on success.
   * - Returns a fresh JWT so the client can continue without re-logging in.
   */
  public async resetPassword(userId: string, data: ResetPasswordRequest): Promise<AuthData> {
    // --- Confirm passwords match ---
    if (data.newPassword !== data.confirmNewPassword) {
      throw new ApiError(400, 'New password and confirmation do not match.');
    }

    // --- Complexity check (frontend mirrors this rule) ---
    const { valid, errors } = validatePasswordComplexity(data.newPassword);
    if (!valid) {
      throw new ApiError(400, errors.join(' '));
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new ApiError(404, 'User not found.');
    }

    // --- Verify current password ---
    const isCurrentValid = await verifyPassword(user.password, data.currentPassword);
    if (!isCurrentValid) {
      throw new ApiError(401, 'Current password is incorrect.');
    }

    // --- Prevent reuse ---
    const isSamePassword = await verifyPassword(user.password, data.newPassword);
    if (isSamePassword) {
      throw new ApiError(400, 'New password must be different from the current password.');
    }

    const hashedNewPassword = await hashPassword(data.newPassword);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedNewPassword,
        mustResetPassword: false, // ← clears the first-login gate
      },
    });

    // Issue a fresh token with mustResetPassword = false
    const token = generateToken({
      userId: updatedUser.id,
      role: updatedUser.role,
      mustResetPassword: updatedUser.mustResetPassword,
    });

    return { token, mustResetPassword: updatedUser.mustResetPassword };
  }
}
