import {
  ForgotPasswordResetRequest,
  LoginRequest,
  LoginResponse,
  PasswordResetRequest as ResetPasswordRequest,
  validatePasswordComplexity,
} from '@nextask/types';
import jwt from 'jsonwebtoken';

import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/apiError.util';
import { hashPassword, verifyPassword } from '../utils/hash.util';
import { generateToken } from '../utils/jwt.util';
import { MailService } from './mail.service';

export class AuthService {
  public async login(data: LoginRequest): Promise<LoginResponse> {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new ApiError(401, 'Invalid email or password.');
    }

    if (!user.isActive) {
      throw new ApiError(
        403,
        'Your account has been deactivated. Please contact an administrator.',
      );
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
  public async resetPassword(userId: string, data: ResetPasswordRequest): Promise<LoginResponse> {
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

  /**
   * Generates a fresh JWT for an active session.
   * Since this is called under an authenticated route, the user identity
   * has already been verified, but we re-validate their active status in the DB.
   */
  public async refreshSession(userId: string): Promise<LoginResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiError(404, 'User not found.');
    }

    if (!user.isActive) {
      throw new ApiError(
        403,
        'Your account has been deactivated. Please contact an administrator.',
      );
    }

    const token = generateToken({
      userId: user.id,
      role: user.role,
      mustResetPassword: user.mustResetPassword,
    });

    return { token, mustResetPassword: user.mustResetPassword };
  }

  /**
   * Generates a short-lived password reset token and sends it to the user via email.
   * This is stateless and does not record the token in the database.
   */
  public async forgotPassword(email: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Security: Do not reveal if the email exists or not
    if (!user) {
      console.log(`[AUTH] Forgot password requested for non-existent email: ${email}`);
      return;
    }

    if (!user.isActive) {
      console.log(`[AUTH] Forgot password requested for deactivated account: ${email}`);
      return;
    }

    // Dynamic secret: combines global JWT secret and current user password hash
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required.');
    }
    const secret = jwtSecret + user.password;

    // Generate token valid for 15 minutes
    const token = jwt.sign({ userId: user.id, email: user.email }, secret, { expiresIn: '15m' });

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetLink = `${clientUrl}/reset-password?token=${token}`;

    const mailService = new MailService();
    await mailService.sendForgotPasswordEmail(user.email, user.name, resetLink);
  }

  /**
   * Validates the forgot-password JWT token and updates the user's password.
   * Signature is verified dynamically using the user's current password hash,
   * rendering the token strictly single-use.
   */
  public async selfResetPassword(data: ForgotPasswordResetRequest): Promise<void> {
    const { token, newPassword } = data;

    // 1. Decode the token (without verification) to get user details
    const decoded = jwt.decode(token) as { userId: string; email: string } | null;
    if (!decoded || !decoded.userId) {
      throw new ApiError(400, 'Invalid or malformed password reset token.');
    }

    // 2. Fetch the user from the database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      throw new ApiError(404, 'User not found.');
    }

    if (!user.isActive) {
      throw new ApiError(403, 'Your account has been deactivated.');
    }

    // 3. Re-create the verification secret using the user's CURRENT password hash
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required.');
    }
    const secret = jwtSecret + user.password;

    // 4. Verify the token signature and expiration
    try {
      jwt.verify(token, secret);
    } catch {
      throw new ApiError(400, 'The password reset link is invalid or has expired.');
    }

    // 5. Validate the new password complexity
    const { valid, errors } = validatePasswordComplexity(newPassword);
    if (!valid) {
      throw new ApiError(400, errors.join(' '));
    }

    // 6. Check that the new password differs from the current one
    const isSamePassword = await verifyPassword(user.password, newPassword);
    if (isSamePassword) {
      throw new ApiError(400, 'New password must be different from the current password.');
    }

    // 7. Hash the new password and save it
    const hashedNewPassword = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedNewPassword,
        mustResetPassword: false, // Clear any force-reset flag on a successful reset
      },
    });

    console.log(`[AUTH] Successfully reset password for user: ${user.email}`);
  }
}
