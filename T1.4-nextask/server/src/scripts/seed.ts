// server/src/scripts/seed.ts
// Run: npx ts-node src/scripts/seed.ts
//
// Creates the developer test account in the database:
//   email:    developer@nextask.com
//   password: SecurePassword123!
//   role:     admin
//   mustResetPassword: false  (can log in directly)

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  const email    = "developer@nextask.com";
  const password = "SecurePassword123!";
  const name     = "Developer Account";

  console.log("🔐 Hashing password…");
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  console.log("📦 Upserting developer account…");
  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      name,
      role: "admin",
      mustResetPassword: false,
      isActive: true,
      timezone: "UTC",
    },
    update: {
      passwordHash,
      name,
      mustResetPassword: false,
    },
  });

  console.log(`✅ Developer account ready:`);
  console.log(`   ID:    ${user.id}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Role:  ${user.role}`);
  console.log(`   mustResetPassword: ${user.mustResetPassword}`);

  // Also create a test account that MUST reset on first login
  const testEmail = "newuser@nextask.com";
  const testHash  = await argon2.hash("TempPass@1", {
    type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 4,
  });
  const testUser = await prisma.user.upsert({
    where: { email: testEmail },
    create: {
      email: testEmail,
      passwordHash: testHash,
      name: "New User",
      role: "member",
      mustResetPassword: true,   // ← will trigger the force-reset flow
      isActive: true,
      timezone: "UTC",
    },
    update: { passwordHash: testHash, mustResetPassword: true },
  });

  console.log(`\n✅ Test "must-reset" account ready:`);
  console.log(`   Email:    ${testUser.email}`);
  console.log(`   Password: TempPass@1`);
  console.log(`   mustResetPassword: ${testUser.mustResetPassword}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
