import { execSync } from 'node:child_process';
import { prisma } from '@/lib/db';
// 注意：DATABASE_URL 由 vitest.config.ts 顶层设置，不要在此处赋值（import 提升）。

export async function resetTestDb(): Promise<void> {
  // 确保 test.db schema 最新
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
    stdio: 'ignore',
  });
  // 清表（顺序尊重外键）
  await prisma.notification.deleteMany();
  await prisma.pushSubscription.deleteMany();
  await prisma.review.deleteMany();
  await prisma.checkIn.deleteMany();
  await prisma.task.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.user.deleteMany();
  await prisma.user.create({ data: { id: 'single-user', name: 'me' } });
}

export async function getTestUserId(): Promise<string> {
  return 'single-user';
}
