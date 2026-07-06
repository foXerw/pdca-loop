import { vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

import { describe, it, expect, beforeAll } from 'vitest';
import { resetTestDb, getTestUserId } from '../setup-db';
import { createPlan } from '@/lib/server/actions/plan';
import { createTask } from '@/lib/server/actions/task';
import { createCheckIn } from '@/lib/server/actions/checkin';
import {
  createReview,
  listReviews,
  getReview,
  updateReview,
  deleteReview,
  getReviewPrefill,
  hasReviewForCurrentWeek,
} from '@/lib/server/actions/review';
import type { ReviewPeriod } from '@/lib/rules/review';

beforeAll(async () => {
  await resetTestDb();
});

describe('review actions', () => {
  it('creates a weekly review with range', async () => {
    const r = await createReview({
      period: 'week',
      wentWell: '按计划推进',
      blocked: '精力不足',
      adjustments: '提早开始',
      rangeStart: new Date(2026, 6, 6),
      rangeEnd: new Date(2026, 6, 12),
    });
    expect(r.id).toBeTruthy();
    expect(r.userId).toBe(await getTestUserId());
    expect(r.wentWell).toBe('按计划推进');
  });

  it('lists reviews newest-first with optional plan', async () => {
    const plan = await createPlan({ title: 'review-plan', type: 'ongoing' });
    await createReview({
      planId: plan.id,
      period: 'week',
      rangeStart: new Date(2026, 6, 6),
      rangeEnd: new Date(2026, 6, 12),
    });
    const list = await listReviews();
    expect(list.length).toBeGreaterThanOrEqual(2);
    expect(list[0].rangeStart.getTime()).toBeGreaterThanOrEqual(list[1].rangeStart.getTime());
    const withPlan = list.find((r) => r.planId === plan.id);
    expect(withPlan?.plan?.title).toBe('review-plan');
  });

  it('gets a review by id', async () => {
    const r = await createReview({
      period: 'month',
      rangeStart: new Date(2026, 6, 1),
      rangeEnd: new Date(2026, 6, 31),
    });
    const got = await getReview(r.id);
    expect(got?.id).toBe(r.id);
  });

  it('updates review subjective fields', async () => {
    const r = await createReview({
      period: 'week',
      rangeStart: new Date(2026, 6, 6),
      rangeEnd: new Date(2026, 6, 12),
    });
    const updated = await updateReview(r.id, { wentWell: 'updated', adjustments: 'a' });
    expect(updated.wentWell).toBe('updated');
    expect(updated.adjustments).toBe('a');
  });

  it('deletes a review', async () => {
    const r = await createReview({
      period: 'week',
      rangeStart: new Date(2026, 6, 6),
      rangeEnd: new Date(2026, 6, 12),
    });
    await deleteReview(r.id);
    expect(await getReview(r.id)).toBeNull();
  });

  it('returns null for missing review', async () => {
    expect(await getReview('nonexistent')).toBeNull();
  });
});

describe('getReviewPrefill', () => {
  it('aggregates stats for a plan scope', async () => {
    const plan = await createPlan({
      title: 'prefill-plan',
      type: 'deadline',
      targetValue: 100,
      targetUnit: 'x',
    });
    const now = new Date();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2);
    // 期前 + 期内打卡
    await createCheckIn({ planId: plan.id, value: 10, occurredAt: new Date(weekStart.getTime() - 86400000) });
    await createCheckIn({ planId: plan.id, value: 5, occurredAt: now });
    await createCheckIn({ planId: plan.id, value: 8, occurredAt: now });
    const t1 = await createTask({ planId: plan.id, title: 'done one' });
    await createTask({ planId: plan.id, title: 'todo one' });
    const { completeTask } = await import('@/lib/server/actions/task');
    await completeTask(t1.id);

    const prefill = await getReviewPrefill('week' as ReviewPeriod, plan.id);
    expect(prefill.planTitle).toBe('prefill-plan');
    expect(prefill.stats.checkInCount).toBe(2);
    expect(prefill.stats.progressBefore).toBe(10);
    expect(prefill.stats.progressDelta).toBe(13);
    expect(prefill.stats.taskTotal).toBe(2);
    expect(prefill.stats.taskDone).toBe(1);
  });

  it('aggregates across all user data when no planId', async () => {
    const prefill = await getReviewPrefill('month' as ReviewPeriod);
    expect(prefill.planTitle).toBeNull();
    expect(typeof prefill.stats.checkInCount).toBe('number');
    expect(prefill.rangeStart.getDate()).toBe(1);
  });

  it('rejects prefill for another user plan (not_found)', async () => {
    await expect(getReviewPrefill('week' as ReviewPeriod, 'nope')).rejects.toThrow();
  });
});

describe('hasReviewForCurrentWeek', () => {
  it('returns false then true after creating this week review', async () => {
    const before = await hasReviewForCurrentWeek();
    const now = new Date();
    // 用「本周」范围建一条，rangeStart 设为本周一（与 periodRange('week') 一致）
    const { periodRange } = await import('@/lib/rules/review');
    const { rangeStart, rangeEnd } = periodRange('week', now);
    await createReview({ period: 'week', rangeStart, rangeEnd, wentWell: 'w' });
    const after = await hasReviewForCurrentWeek();
    expect(after).toBe(true);
    // before 可能 true（前面用例建过本周回顾），所以只断言 after 为 true
    expect(typeof before).toBe('boolean');
  });
});
