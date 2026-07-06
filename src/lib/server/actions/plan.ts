import 'server-only';
import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/server/context';
import { touch, ActionError } from './_shared';
import { sumProgress } from '@/lib/rules/progress';
import { computeStreak } from '@/lib/rules/streak';
import type { Plan } from '@prisma/client';

export type PlanType = 'deadline' | 'ongoing';
export type PlanStatus = 'active' | 'paused' | 'done' | 'archived';

export async function createPlan(input: {
  title: string;
  type: PlanType;
  targetValue?: number;
  targetUnit?: string;
  dueAt?: Date;
  description?: string;
}): Promise<Plan> {
  const userId = await getCurrentUserId();
  const plan = await prisma.plan.create({
    data: {
      userId,
      title: input.title,
      type: input.type,
      targetValue: input.targetValue ?? null,
      targetUnit: input.targetUnit ?? null,
      dueAt: input.dueAt ?? null,
      description: input.description ?? '',
    },
  });
  touch();
  return plan;
}

export async function listPlans(): Promise<Plan[]> {
  const userId = await getCurrentUserId();
  return prisma.plan.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export type PlanOverview = Plan & {
  progress: number;
  streak: { current: number; longest: number };
};

// 仪表盘用：活跃计划 + 进度/streak。个人量级 N+1 可接受，Phase 3 再批量化。
export async function listActivePlansOverview(): Promise<PlanOverview[]> {
  const userId = await getCurrentUserId();
  const plans = await prisma.plan.findMany({
    where: { userId, status: 'active' },
    orderBy: { createdAt: 'desc' },
  });
  const now = new Date();
  const result: PlanOverview[] = [];
  for (const plan of plans) {
    const cis = await prisma.checkIn.findMany({
      where: { planId: plan.id, userId },
      select: { value: true, occurredAt: true },
    });
    result.push({
      ...plan,
      progress: sumProgress(cis),
      streak: computeStreak(cis, now),
    });
  }
  return result;
}

export async function getPlan(id: string): Promise<Plan | null> {
  const userId = await getCurrentUserId();
  return prisma.plan.findFirst({ where: { id, userId } });
}

export async function updatePlan(
  id: string,
  patch: Partial<{ title: string; description: string; targetValue: number; targetUnit: string; dueAt: Date | null }>,
): Promise<Plan> {
  const userId = await getCurrentUserId();
  const plan = await prisma.plan.updateMany({ where: { id, userId }, data: patch });
  if (plan.count === 0) throw new ActionError('not_found', 'plan not found');
  const updated = await prisma.plan.findUnique({ where: { id } });
  if (!updated) throw new ActionError('not_found', 'plan not found');
  touch();
  return updated;
}

export async function setPlanStatus(id: string, status: PlanStatus): Promise<Plan> {
  const userId = await getCurrentUserId();
  const res = await prisma.plan.updateMany({ where: { id, userId }, data: { status } });
  if (res.count === 0) throw new ActionError('not_found', 'plan not found');
  const updated = await prisma.plan.findUnique({ where: { id } });
  if (!updated) throw new ActionError('not_found', 'plan not found');
  touch();
  return updated;
}
