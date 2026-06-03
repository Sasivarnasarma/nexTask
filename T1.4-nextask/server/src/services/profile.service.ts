// server/src/services/profile.service.ts
import { UserPublic, ProfileUpdateRequest } from "@nextask/types";
import { prisma } from "../lib/prisma";

const SUPPORTED_TIMEZONES = new Set(Intl.supportedValuesOf("timeZone"));

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

// ─── Get Profile ──────────────────────────────────────────────────────────────

export async function getUserProfile(userId: string): Promise<UserPublic> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) {
    throw { status: 404, message: "User not found." };
  }
  return toPublicUser(user);
}

// ─── Update Profile ───────────────────────────────────────────────────────────

export async function updateUserProfile(
  userId: string,
  body: ProfileUpdateRequest
): Promise<UserPublic> {
  // Collect and validate only the provided fields
  const updates: {
    name?: string;
    bio?: string | null;
    phone?: string | null;
    timezone?: string;
    avatarUrl?: string | null;
  } = {};

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (name.length < 2)
      throw { status: 400, message: "Name must be at least 2 characters." };
    if (name.length > 80)
      throw { status: 400, message: "Name must be 80 characters or fewer." };
    updates.name = name;
  }

  if (body.bio !== undefined) {
    const bio = body.bio?.trim() ?? "";
    if (bio.length > 500)
      throw { status: 400, message: "Bio must be 500 characters or fewer." };
    updates.bio = bio || null;
  }

  if (body.phone !== undefined) {
    const phone = body.phone?.trim() ?? "";
    if (phone && !/^\+?[0-9\s\-().]{7,25}$/.test(phone)) {
      throw { status: 400, message: "Invalid phone number format." };
    }
    updates.phone = phone || null;
  }

  if (body.timezone !== undefined) {
    if (!SUPPORTED_TIMEZONES.has(body.timezone)) {
      throw { status: 400, message: "Invalid timezone." };
    }
    updates.timezone = body.timezone;
  }

  if (body.avatarUrl !== undefined) {
    const url = body.avatarUrl?.trim() ?? "";
    if (url && !/^https?:\/\/.{3,}/.test(url)) {
      throw { status: 400, message: "Avatar must be a valid HTTPS URL." };
    }
    updates.avatarUrl = url || null;
  }

  if (Object.keys(updates).length === 0) {
    throw { status: 400, message: "No valid fields provided for update." };
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updates,
  });

  return toPublicUser(updated);
}
