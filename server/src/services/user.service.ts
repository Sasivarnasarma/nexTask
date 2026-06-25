import {
  AdminCreateUserRequest,
  AdminUpdateUserRequest,
  ChangePasswordRequest,
  ProfileUpdateRequest as UpdateProfileRequest,
  UserProfile,
  validatePasswordComplexity,
} from '@nextask/types';

import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/apiError.util';
import { hashPassword, verifyPassword } from '../utils/hash.util';
import { MailService } from './mail.service';
import { deleteFile } from './s3.service';

export type {
  AdminCreateUserRequest,
  AdminUpdateUserRequest,
  ChangePasswordRequest,
  UpdateProfileRequest,
  UserProfile,
};

export class UserService {
  private mailService = new MailService();

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
      isActive: user.isActive,
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
      isActive: updated.isActive,
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

  /**
   * Returns a list of projects a user belongs to
   */
  public async getUserProjects(userId: string): Promise<any[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role === 'ADMIN') {
      return prisma.project.findMany();
    }

    const memberships = await prisma.projectMember.findMany({
      where: { userId },
      include: {
        project: true,
      },
    });
    return memberships.map((m) => m.project);
  }

  /**
   * USER AUTOCOMPLETE SEARCH (Task 3.4)
   */
  public async searchUsersAutocomplete(projectId: string, search: string) {
    return prisma.user.findMany({
      where: {
        AND: [
          {
            projectMemberships: {
              none: {
                projectId,
              },
            },
          },
          {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      take: 10,
    });
  }

  /**
   * List all users with pagination and search (Admin Only)
   */
  public async listUsers(page: number, limit: number, search?: string) {
    const skip = (page - 1) * limit;
    const whereClause = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          mustResetPassword: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.count({ where: whereClause }),
    ]);

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Create user (Admin Only)
   */
  public async createUser(data: AdminCreateUserRequest, actorId: string) {
    const email = data.email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ApiError(409, 'A user with this email address already exists.');
    }

    // Generate a temporary password that satisfies password complexity rules
    const randomPart = Math.random().toString(36).substring(2, 8);
    const randomDigit = Math.floor(Math.random() * 10);
    const tempPassword = `Temp!${randomPart}${randomDigit}`;

    const hashedPassword = await hashPassword(tempPassword);

    const newUser = await prisma.user.create({
      data: {
        email,
        name: data.name ? data.name.trim() : null,
        role: data.role,
        password: hashedPassword,
        mustResetPassword: true,
        isActive: true,
      },
    });

    // Log the action to console for local testing / temporary password retrieval
    console.log(`[USER_CREATED] New user created: ${email} | Temp Password: ${tempPassword}`);

    // Record audit activity
    await prisma.taskActivity.create({
      data: {
        action: 'USER_CREATED',
        userId: actorId,
        description: `Created user ${email} (${data.role})`,
      },
    });

    // Trigger welcome email notification
    try {
      await this.mailService.sendWelcomeEmail(email, newUser.name, tempPassword);
    } catch (mailError) {
      console.error(`[MAIL_ERROR] Failed to dispatch welcome email to ${email}:`, mailError);
    }

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        isActive: newUser.isActive,
        mustResetPassword: newUser.mustResetPassword,
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt,
      },
    };
  }

  /**
   * Update user details (Admin Only)
   */
  public async updateUser(id: string, data: AdminUpdateUserRequest, actorId: string) {
    const userToUpdate = await prisma.user.findUnique({ where: { id } });
    if (!userToUpdate) {
      throw new ApiError(404, 'User not found.');
    }

    const email = data.email.trim().toLowerCase();
    const conflict = await prisma.user.findFirst({
      where: { email, NOT: { id } },
    });
    if (conflict) {
      throw new ApiError(409, 'This email address is already in use by another user.');
    }

    const roleChanged = userToUpdate.role !== data.role;

    const updated = await prisma.user.update({
      where: { id },
      data: {
        email,
        name: data.name ? data.name.trim() : null,
        role: data.role,
      },
    });

    // Record audit activity
    await prisma.taskActivity.create({
      data: {
        action: roleChanged ? 'ROLE_CHANGED' : 'UPDATED',
        userId: actorId,
        description: roleChanged
          ? `Changed role of user ${email} from ${userToUpdate.role} to ${data.role}`
          : `Updated details of user ${email}`,
      },
    });

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      isActive: updated.isActive,
      mustResetPassword: updated.mustResetPassword,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Deactivate user (Admin Only)
   */
  public async deactivateUser(id: string, actorId: string) {
    if (id === actorId) {
      throw new ApiError(400, 'Administrators cannot deactivate their own account.');
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new ApiError(404, 'User not found.');
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    // Record audit activity
    await prisma.taskActivity.create({
      data: {
        action: 'USER_DEACTIVATED',
        userId: actorId,
        description: `Deactivated user ${user.email}`,
      },
    });

    // Trigger deactivation email
    try {
      await this.mailService.sendUserStatusChangedEmail(user.email, user.name, false);
    } catch (mailError) {
      console.error(`[MAIL_ERROR] Failed to dispatch deactivation email to ${user.email}:`, mailError);
    }

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      isActive: updated.isActive,
      mustResetPassword: updated.mustResetPassword,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Activate user (Admin Only)
   */
  public async activateUser(id: string, actorId: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new ApiError(404, 'User not found.');
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: true },
    });

    // Record audit activity
    await prisma.taskActivity.create({
      data: {
        action: 'USER_ACTIVATED',
        userId: actorId,
        description: `Activated user ${user.email}`,
      },
    });

    // Trigger activation email
    try {
      await this.mailService.sendUserStatusChangedEmail(user.email, user.name, true);
    } catch (mailError) {
      console.error(`[MAIL_ERROR] Failed to dispatch activation email to ${user.email}:`, mailError);
    }

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      isActive: updated.isActive,
      mustResetPassword: updated.mustResetPassword,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Delete user (Admin Only)
   */
  public async deleteUser(id: string, actorId: string) {
    if (id === actorId) {
      throw new ApiError(400, 'Administrators cannot delete their own account.');
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        ownedProjects: true,
      },
    });

    if (!user) {
      throw new ApiError(404, 'User not found.');
    }

    if (user.ownedProjects.length > 0) {
      throw new ApiError(
        400,
        `Cannot delete user. They own projects: ${user.ownedProjects.map((p) => p.name).join(', ')}. Transfer project ownership first.`,
      );
    }

    // Fetch all attachments uploaded by this user to clean up S3
    const attachments = await prisma.attachment.findMany({
      where: { uploadedById: id },
      select: { fileKey: true },
    });

    // Clean up S3 files
    if (attachments.length > 0) {
      await Promise.all(
        attachments.map((att) =>
          deleteFile(att.fileKey).catch((err) => {
            console.error(`Failed to delete S3 file ${att.fileKey} during user deletion:`, err);
          }),
        ),
      );
    }

    await prisma.user.delete({ where: { id } });

    // Record audit activity
    await prisma.taskActivity.create({
      data: {
        action: 'DELETED',
        userId: actorId,
        description: `Deleted user ${user.email}`,
      },
    });

    // Trigger deletion email
    try {
      await this.mailService.sendUserRemovedEmail(user.email, user.name);
    } catch (mailError) {
      console.error(`[MAIL_ERROR] Failed to dispatch user removed email to ${user.email}:`, mailError);
    }
  }

  /**
   * Request password reset for a user (Admin Only)
   */
  public async adminResetPassword(id: string, actorId: string): Promise<void> {
    if (id === actorId) {
      throw new ApiError(
        400,
        'Administrators cannot request a password reset for their own account.',
      );
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new ApiError(404, 'User not found.');
    }

    await prisma.user.update({
      where: { id },
      data: { mustResetPassword: true },
    });

    // Record audit activity
    await prisma.taskActivity.create({
      data: {
        action: 'UPDATED',
        userId: actorId,
        description: `Triggered mandatory password reset for user ${user.email}`,
      },
    });

    // Trigger password reset email notification
    try {
      await this.mailService.sendAdminPasswordResetEmail(user.email, user.name);
    } catch (mailError) {
      console.error(
        `[MAIL_ERROR] Failed to dispatch password reset email to ${user.email}:`,
        mailError,
      );
    }
  }

  /**
   * Get user activity audit logs
   */
  public async getUserActivity(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new ApiError(404, 'User not found.');
    }

    return prisma.taskActivity.findMany({
      where: {
        OR: [{ userId }, { description: { contains: user.email } }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  }
}
