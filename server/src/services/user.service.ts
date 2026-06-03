import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/apiError.util';
import { hashPassword, verifyPassword } from '../utils/hash.util';
import { validatePasswordComplexity } from '../utils/password.util';

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  role: string;
  mustResetPassword: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export class UserService {
  /**
   * Returns the full profile of the authenticated user (password excluded).
   */
  public async getProfile(userId: string): Promise<UserProfile> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ApiError(404, 'User not found.');

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      mustResetPassword: user.mustResetPassword,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Updates display name and/or email.
   * - Email uniqueness is re-validated before saving.
   */
  public async updateProfile(userId: string, data: UpdateProfileRequest): Promise<UserProfile> {
    if (data.name === undefined && data.email === undefined) {
      throw new ApiError(400, 'At least one field (name or email) must be provided.');
    }

    if (data.name !== undefined && data.name.trim().length === 0) {
      throw new ApiError(400, 'Name cannot be empty.');
    }

    const email = data.email?.trim();
    if (data.email !== undefined && email?.length === 0) {
      throw new ApiError(400, 'Email cannot be empty.');
    }

    if (data.email !== undefined) {
      const conflict = await prisma.user.findFirst({
        where: { email, NOT: { id: userId } },
      });
      if (conflict) throw new ApiError(409, 'This email address is already in use.');
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.email !== undefined && { email }),
      },
    });

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      mustResetPassword: updated.mustResetPassword,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Allows an already-onboarded user to change their password voluntarily.
   * (The first-login forced reset is handled by AuthService.resetPassword)
   */
  public async changePassword(userId: string, data: ChangePasswordRequest): Promise<void> {
    if (data.newPassword !== data.confirmNewPassword) {
      throw new ApiError(400, 'New password and confirmation do not match.');
    }

    const { valid, errors } = validatePasswordComplexity(data.newPassword);
    if (!valid) throw new ApiError(400, errors.join(' '));

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ApiError(404, 'User not found.');

    const isCurrentValid = await verifyPassword(user.password, data.currentPassword);
    if (!isCurrentValid) throw new ApiError(401, 'Current password is incorrect.');

    const isSame = await verifyPassword(user.password, data.newPassword);
    if (isSame) {
      throw new ApiError(400, 'New password must differ from the current password.');
    }

    await prisma.user.update({
      where: { id: userId },
      data: { password: await hashPassword(data.newPassword) },
    });
  }
}
