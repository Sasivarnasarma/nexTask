import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required.');
}
const schema = new URL(connectionString).searchParams.get('schema') ?? undefined;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool, { schema });

export const prisma = new PrismaClient({ adapter });
