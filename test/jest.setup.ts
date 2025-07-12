import { PrismaClient } from '@prisma/client';
import { clearDb } from './helper/clear-db';

export let prisma: PrismaClient;

beforeAll(async () => {
  prisma = new PrismaClient();
  await clearDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});
