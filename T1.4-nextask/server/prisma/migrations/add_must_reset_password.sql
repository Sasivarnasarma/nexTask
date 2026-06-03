-- Migration: add_must_reset_password_to_users
-- Run this if the column doesn't already exist on your database.
-- Prisma will handle this automatically via: pnpm prisma migrate dev

-- Add mustResetPassword flag if migrating an existing users table
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "must_reset_password" BOOLEAN NOT NULL DEFAULT false;

-- Seed the developer test account (idempotent upsert)
-- Password: SecurePassword123!  →  hashed via argon2
-- NOTE: Replace the hash below with the one printed by running:
--   cd server && npx ts-node src/scripts/hashPassword.ts SecurePassword123!
INSERT INTO "users" (
  id, email, password_hash, name, role,
  must_reset_password, is_active, timezone,
  created_at, updated_at
)
VALUES (
  'cldev000000000000000developer',
  'developer@nextask.com',
  '$argon2id$v=19$m=65536,t=3,p=4$placeholder_replace_me',
  'Developer Account',
  'admin',
  false,
  true,
  'UTC',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;
