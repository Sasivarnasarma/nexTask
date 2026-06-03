import 'dotenv/config';

import { prisma } from '../lib/prisma';
import { hashPassword } from '../utils/hash.util';

async function main() {
  const email = 'developer@nextask.com';
  const password = 'SecurePassword123!';
  const name = 'Developer Account';

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
  console.log(`   mustResetPassword: ${user.mustResetPassword}`);

  // Also create a test account that MUST reset on first login
  const testEmail = 'newuser@nextask.com';
  const testHash = await hashPassword('TempPass@1');
  const testUser = await prisma.user.upsert({
    where: { email: testEmail },
    create: {
      email: testEmail,
      password: testHash,
      name: 'New User',
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
  console.log(`   Password: TempPass@1`);
  console.log(`   mustResetPassword: ${testUser.mustResetPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
