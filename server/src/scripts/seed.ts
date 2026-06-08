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

  console.log('📦 Upserting developer admin account...');
  await prisma.user.upsert({
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

  // PM Account
  const pmEmail = requireEnv('SEED_PM_EMAIL');
  const pmPassword = requireEnv('SEED_PM_PASSWORD');
  const pmName = process.env.SEED_PM_NAME ?? 'Project Manager';
  const pmHash = await hashPassword(pmPassword);
  console.log('📦 Upserting PM account...');
  const pmUser = await prisma.user.upsert({
    where: { email: pmEmail },
    create: {
      email: pmEmail,
      password: pmHash,
      name: pmName,
      role: 'PROJECT_MANAGER',
      mustResetPassword: false,
    },
    update: {
      password: pmHash,
      name: pmName,
      role: 'PROJECT_MANAGER',
      mustResetPassword: false,
    },
  });

  // Test Collaborator Account
  const testEmail = requireEnv('SEED_TEST_EMAIL');
  const testPassword = requireEnv('SEED_TEST_PASSWORD');
  const testName = process.env.SEED_TEST_NAME ?? 'New User';
  const testHash = await hashPassword(testPassword);
  console.log('📦 Upserting Collaborator account...');
  const collaboratorUser = await prisma.user.upsert({
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

  console.log('\n✅ Accounts ready.');

  // Create a default project owned by PM
  console.log('📦 Creating default project...');
  const project = await prisma.project.create({
    data: {
      name: 'Alpha Project',
      description: 'The primary workspace for task tracking.',
      status: 'ACTIVE',
      ownerId: pmUser.id,
    },
  });

  // Join Collaborator to the project
  await prisma.projectMember.create({
    data: {
      projectId: project.id,
      userId: collaboratorUser.id,
      role: 'COLLABORATOR',
    },
  });

  // Join PM to the project
  await prisma.projectMember.create({
    data: {
      projectId: project.id,
      userId: pmUser.id,
      role: 'PROJECT_MANAGER',
    },
  });

  // Seed tasks
  console.log('📦 Creating sample tasks with tags and positioning...');
  await prisma.task.create({
    data: {
      title: 'Setup Core API Scaffolding',
      description: 'Initialize express with typescript, controllers and routing layers.',
      status: 'COMPLETED',
      priority: 'HIGH',
      tags: ['Backend', 'Infrastructure'],
      position: 1000,
      projectId: project.id,
    },
  });

  const task2 = await prisma.task.create({
    data: {
      title: 'Build Authentication & Onboarding',
      description: 'Enforce JWT-based access controls and password resets on first login.',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      tags: ['Backend', 'Security'],
      position: 2000,
      projectId: project.id,
    },
  });

  const task3 = await prisma.task.create({
    data: {
      title: 'Design Kanban Board Workspace',
      description:
        'Build board columns supporting status movements, card sorting, and tags rendering.',
      status: 'TODO',
      priority: 'HIGH',
      tags: ['Frontend', 'UI'],
      position: 3000,
      projectId: project.id,
    },
  });

  // Assign Collaborator to Task 2 and Task 3
  await prisma.taskAssignment.createMany({
    data: [
      { taskId: task2.id, userId: collaboratorUser.id },
      { taskId: task3.id, userId: collaboratorUser.id },
    ],
  });

  console.log('🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
