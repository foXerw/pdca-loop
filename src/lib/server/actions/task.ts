import 'server-only';
import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/server/context';
import { touch, ActionError } from './_shared';
import type { Task } from '@prisma/client';

export type Recurrence = 'none' | 'daily' | 'weekly' | 'custom';

export async function createTask(input: {
  planId: string;
  title: string;
  milestoneId?: string;
  dueAt?: Date;
  recurrence?: Recurrence;
  notes?: string;
}): Promise<Task> {
  const userId = await getCurrentUserId();
  const task = await prisma.task.create({
    data: {
      userId,
      planId: input.planId,
      milestoneId: input.milestoneId ?? null,
      title: input.title,
      dueAt: input.dueAt ?? null,
      recurrence: input.recurrence ?? 'none',
      notes: input.notes ?? '',
    },
  });
  touch();
  return task;
}

export async function listTasksByPlan(planId: string): Promise<Task[]> {
  const userId = await getCurrentUserId();
  return prisma.task.findMany({
    where: { planId, userId },
    orderBy: { createdAt: 'asc' },
  });
}

export async function completeTask(id: string): Promise<Task> {
  const userId = await getCurrentUserId();
  const existing = await prisma.task.findFirst({ where: { id, userId } });
  if (!existing) throw new ActionError('not_found', 'task not found');
  const next = existing.status === 'done' ? 'todo' : 'done';
  const updated = await prisma.task.update({ where: { id }, data: { status: next } });
  touch();
  return updated;
}

export async function updateTask(
  id: string,
  patch: Partial<{ title: string; notes: string; dueAt: Date | null; recurrence: Recurrence }>,
): Promise<Task> {
  const userId = await getCurrentUserId();
  const res = await prisma.task.updateMany({ where: { id, userId }, data: patch });
  if (res.count === 0) throw new ActionError('not_found', 'task not found');
  const updated = await prisma.task.findUnique({ where: { id } });
  if (!updated) throw new ActionError('not_found', 'task not found');
  touch();
  return updated;
}
