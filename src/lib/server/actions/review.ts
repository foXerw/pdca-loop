import 'server-only';
import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/server/context';
import { touch, ActionError } from './_shared';
import { periodRange, reviewStats, type ReviewPeriod, type ReviewStats } from '@/lib/rules/review';
import type { Review } from '@prisma/client';

export type ReviewWithPlan = Review & { plan: { id: string; title: string } | null };

export async function createReview(input: {
  planId?: string;
  period: ReviewPeriod;
  wentWell?: string;
  blocked?: string;
  adjustments?: string;
  rangeStart: Date;
  rangeEnd: Date;
}): Promise<Review> {
  const userId = await getCurrentUserId();
  const review = await prisma.review.create({
    data: {
      userId,
      planId: input.planId ?? null,
      period: input.period,
      wentWell: input.wentWell ?? '',
      blocked: input.blocked ?? '',
      adjustments: input.adjustments ?? '',
      rangeStart: input.rangeStart,
      rangeEnd: input.rangeEnd,
    },
  });
  touch();
  return review;
}

export async function listReviews(): Promise<ReviewWithPlan[]> {
  const userId = await getCurrentUserId();
  return prisma.review.findMany({
    where: { userId },
    include: { plan: { select: { id: true, title: true } } },
    orderBy: { rangeStart: 'desc' },
  });
}

export async function getReview(id: string): Promise<ReviewWithPlan | null> {
  const userId = await getCurrentUserId();
  return prisma.review.findFirst({
    where: { id, userId },
    include: { plan: { select: { id: true, title: true } } },
  });
}

export async function updateReview(
  id: string,
  patch: Partial<{ wentWell: string; blocked: string; adjustments: string }>,
): Promise<Review> {
  const userId = await getCurrentUserId();
  const res = await prisma.review.updateMany({ where: { id, userId }, data: patch });
  if (res.count === 0) throw new ActionError('not_found', 'review not found');
  const updated = await prisma.review.findUnique({ where: { id } });
  if (!updated) throw new ActionError('not_found', 'review not found');
  touch();
  return updated;
}

export async function deleteReview(id: string): Promise<void> {
  const userId = await getCurrentUserId();
  const res = await prisma.review.deleteMany({ where: { id, userId } });
  if (res.count === 0) throw new ActionError('not_found', 'review not found');
  touch();
}

export type ReviewPrefill = {
  rangeStart: Date;
  rangeEnd: Date;
  stats: ReviewStats;
  planTitle: string | null;
};

// 按周期（可选计划）汇总本期客观统计，供新建回顾页预填展示。
export async function getReviewPrefill(
  period: ReviewPeriod,
  planId?: string,
): Promise<ReviewPrefill> {
  const userId = await getCurrentUserId();
  const now = new Date();
  const { rangeStart, rangeEnd } = periodRange(period, now);

  let planTitle: string | null = null;
  const checkIns: { occurredAt: Date; value?: number | null }[] = [];
  const tasks: { status: string }[] = [];

  if (planId) {
    const plan = await prisma.plan.findFirst({
      where: { id: planId, userId },
      select: { id: true, title: true },
    });
    if (!plan) throw new ActionError('not_found', 'plan not found');
    planTitle = plan.title;
    const cis = await prisma.checkIn.findMany({
      where: { planId, userId },
      select: { occurredAt: true, value: true },
    });
    checkIns.push(...cis);
    const ts = await prisma.task.findMany({
      where: { planId, userId },
      select: { status: true },
    });
    tasks.push(...ts);
  } else {
    const cis = await prisma.checkIn.findMany({
      where: { userId },
      select: { occurredAt: true, value: true },
    });
    checkIns.push(...cis);
    const ts = await prisma.task.findMany({
      where: { userId },
      select: { status: true },
    });
    tasks.push(...ts);
  }

  return {
    rangeStart,
    rangeEnd,
    stats: reviewStats({ checkIns, tasks, rangeStart, rangeEnd }),
    planTitle,
  };
}

// 仪表盘红点：本周回顾是否已做。
export async function hasReviewForCurrentWeek(): Promise<boolean> {
  const userId = await getCurrentUserId();
  const { rangeStart } = periodRange('week', new Date());
  const count = await prisma.review.count({
    where: { userId, period: 'week', rangeStart: { gte: rangeStart } },
  });
  return count > 0;
}
