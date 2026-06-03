import 'dotenv/config';

import { prisma } from '../lib/prisma';
import { hashPassword } from '../utils/hash.util';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function main() {
  const email = requireEnv('SEED_ADMIN_EMAIL');
  const password = requireEnv('SEED_ADMIN_PASSWORD');
  const name = process.env.SEED_ADMIN_NAME ?? 'Developer Account';

  console.log('🔐 Hashing password...');
  const passwordHash = await hashPassword(password);

  console.log('📦 Upserting developer account...');
  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      password: passwordHash,
      name,
      role: 'ADMIN',
      mustResetPassword: false,
    },
    update: {
      password: passwordHash,
      name,
      role: 'ADMIN',
      mustResetPassword: false,
    },
  });

  console.log(`✅ Developer account ready:`);
  console.log(`   ID:    ${user.id}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Role:  ${user.role}`);

  // Also create a test account that MUST reset on first login
  const testEmail = requireEnv('SEED_TEST_EMAIL');
  const testPassword = requireEnv('SEED_TEST_PASSWORD');
  const testName = process.env.SEED_TEST_NAME ?? 'New User';
  const testHash = await hashPassword(testPassword);
  const testUser = await prisma.user.upsert({
    where: { email: testEmail },
    create: {
      email: testEmail,
      password: testHash,
      name: testName,
      role: 'COLLABORATOR',
      mustResetPassword: true,
    },
    update: {
      password: testHash,
      mustResetPassword: true,
    },
  });

  console.log(`\n✅ Test "must-reset" account ready:`);
  console.log(`   Email:    ${testUser.email}`);
  console.log('   Password: [configured via SEED_TEST_PASSWORD]');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
