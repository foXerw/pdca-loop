import 'server-only';
import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/server/context';
import { touch, ActionError } from './_shared';
import type { Milestone } from '@prisma/client';

export type MilestoneStatus = 'todo' | 'done';

// Milestone 无 userId 字段，归属通过父 Plan 校验。
async function ownPlan(planId: string, userId: string): Promise<void> {
  const plan = await prisma.plan.findFirst({ where: { id: planId, userId }, select: { id: true } });
  if (!plan) throw new ActionError('not_found', 'plan not found');
}

export async function createMilestone(input: {
  planId: string;
  title: string;
  targetDate: Date;
  targetValue?: number;
  order?: number;
}): Promise<Milestone> {
  const userId = await getCurrentUserId();
  await ownPlan(input.planId, userId);
  const order =
    input.order ??
    (await prisma.milestone.count({ where: { planId: input.planId } }));
  const m = await prisma.milestone.create({
    data: {
      planId: input.planId,
      title: input.title,
      targetDate: input.targetDate,
      targetValue: input.targetValue ?? null,
      order,
    },
  });
  touch();
  return m;
}

export async function listMilestonesByPlan(planId: string): Promise<Milestone[]> {
  const userId = await getCurrentUserId();
  await ownPlan(planId, userId);
  return prisma.milestone.findMany({
    where: { planId },
    orderBy: [{ order: 'asc' }, { targetDate: 'asc' }],
  });
}

export async function updateMilestone(
  id: string,
  patch: Partial<{ title: string; targetDate: Date; targetValue: number | null; order: number }>,
): Promise<Milestone> {
  const userId = await getCurrentUserId();
  const existing = await prisma.milestone.findUnique({
    where: { id },
    include: { plan: { select: { userId: true } } },
  });
  if (!existing || existing.plan.userId !== userId) {
    throw new ActionError('not_found', 'milestone not found');
  }
  await prisma.milestone.update({ where: { id }, data: patch });
  const updated = await prisma.milestone.findUnique({ where: { id } });
  if (!updated) throw new ActionError('not_found', 'milestone not found');
  touch();
  return updated;
}

export async function setMilestoneStatus(
  id: string,
  status: MilestoneStatus,
): Promise<Milestone> {
  const userId = await getCurrentUserId();
  const existing = await prisma.milestone.findUnique({
    where: { id },
    include: { plan: { select: { userId: true } } },
  });
  if (!existing || existing.plan.userId !== userId) {
    throw new ActionError('not_found', 'milestone not found');
  }
  const updated = await prisma.milestone.update({ where: { id }, data: { status } });
  touch();
  return updated;
}

export async function deleteMilestone(id: string): Promise<void> {
  const userId = await getCurrentUserId();
  const existing = await prisma.milestone.findUnique({
    where: { id },
    include: { plan: { select: { userId: true } } },
  });
  if (!existing || existing.plan.userId !== userId) {
    throw new ActionError('not_found', 'milestone not found');
  }
  await prisma.milestone.delete({ where: { id } });
  touch();
}
