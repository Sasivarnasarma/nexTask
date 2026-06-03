// server/src/services/auth.service.ts
import { UserPublic } from "@nextask/types";
import { prisma } from "../lib/prisma";
import { hashPassword, verifyPassword, isPasswordComplex, getPasswordErrors } from "../lib/password";
import { signToken } from "../lib/jwt";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toPublicUser(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl: string | null;
  bio: string | null;
  phone: string | null;
  timezone: string;
  mustResetPassword: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): UserPublic {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as UserPublic["role"],
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    phone: user.phone,
    timezone: user.timezone,
    mustResetPassword: user.mustResetPassword,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

// ─── Login ────────────────────────────────────────────────────────────────────

export interface LoginResult {
  token: string;
  user: UserPublic;
  mustResetPassword: boolean;
}

export async function loginUser(
  email: string,
  password: string
): Promise<LoginResult> {
  if (!email || !password) {
    throw { status: 400, message: "Email and password are required." };
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  // Use consistent error to prevent user enumeration
  const invalidError = { status: 401, message: "Invalid email or password." };

  if (!user || !user.isActive) throw invalidError;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) throw invalidError;

  // Issue token – carry mustReset flag so middleware can gate routes
  const token = signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    mustReset: user.mustResetPassword,
  });

  return { token, user: toPublicUser(user), mustResetPassword: user.mustResetPassword };
}

// ─── Force Password Reset (first-login flow) ──────────────────────────────────

export async function forceResetPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<{ message: string; token: string; user: UserPublic }> {
  // 1. Field presence
  if (!currentPassword || !newPassword || !confirmPassword) {
    throw { status: 400, message: "All three password fields are required." };
  }

  // 2. Confirmation match
  if (newPassword !== confirmPassword) {
    throw { status: 400, message: "New passwords do not match." };
  }

  // 3. Complexity (server-side – mirrors frontend rules exactly)
  if (!isPasswordComplex(newPassword)) {
    const errors = getPasswordErrors(newPassword);
    throw {
      status: 422,
      message: "Password does not meet complexity requirements.",
      errors: { newPassword: errors },
    };
  }

  // 4. Load fresh user
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw { status: 404, message: "User not found." };

  // 5. Verify current password
  const validCurrent = await verifyPassword(currentPassword, user.passwordHash);
  if (!validCurrent) {
    throw { status: 401, message: "Current password is incorrect." };
  }

  // 6. Cannot reuse same password
  const sameAsOld = await verifyPassword(newPassword, user.passwordHash);
  if (sameAsOld) {
    throw {
      status: 400,
      message: "New password must be different from your current password.",
    };
  }

  // 7. Persist – hash new password AND clear mustResetPassword flag
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: await hashPassword(newPassword),
      mustResetPassword: false, // ← KEY: clears the first-login gate
    },
  });

  // 8. Issue a fresh token (mustReset now false)
  const token = signToken({
    sub: updated.id,
    email: updated.email,
    role: updated.role,
    mustReset: false,
  });

  return {
    message: "Password updated successfully. Welcome to nexTask!",
    token,
    user: toPublicUser(updated),
  };
}
