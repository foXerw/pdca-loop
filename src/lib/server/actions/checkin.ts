import 'server-only';
import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/server/context';
import { touch, ActionError } from './_shared';
import { sumProgress } from '@/lib/rules/progress';
import { computeStreak } from '@/lib/rules/streak';
import type { CheckIn } from '@prisma/client';

export async function createCheckIn(input: {
  planId?: string;
  taskId?: string;
  value?: number;
  note?: string;
  mood?: string;
  occurredAt?: Date;
}): Promise<CheckIn> {
  if (!input.planId && !input.taskId) {
    throw new ActionError('bad_input', 'check-in needs planId or taskId');
  }
  const userId = await getCurrentUserId();
  const ci = await prisma.checkIn.create({
    data: {
      userId,
      planId: input.planId ?? null,
      taskId: input.taskId ?? null,
      value: input.value ?? null,
      note: input.note ?? '',
      mood: input.mood ?? null,
      occurredAt: input.occurredAt ?? new Date(),
    },
  });
  touch();
  return ci;
}

export async function listCheckIns(planId: string): Promise<CheckIn[]> {
  const userId = await getCurrentUserId();
  return prisma.checkIn.findMany({
    where: { planId, userId },
    orderBy: { occurredAt: 'desc' },
  });
}

export async function getPlanProgress(planId: string): Promise<{
  progress: number;
  streak: { current: number; longest: number };
}> {
  const userId = await getCurrentUserId();
  const cis = await prisma.checkIn.findMany({
    where: { planId, userId },
    select: { value: true, occurredAt: true },
  });
  return {
    progress: sumProgress(cis),
    streak: computeStreak(cis, new Date()),
  };
}
