import { vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

import { describe, it, expect, beforeAll } from 'vitest';
import { resetTestDb } from '../setup-db';
import { createPlan } from '@/lib/server/actions/plan';
import { createCheckIn, listCheckIns, getPlanProgress } from '@/lib/server/actions/checkin';

beforeAll(async () => { await resetTestDb(); });

describe('checkin actions', () => {
  it('creates a check-in with value', async () => {
    const plan = await createPlan({ title: 'token', type: 'deadline', targetValue: 100000000, targetUnit: 'tokens' });
    const ci = await createCheckIn({ planId: plan.id, value: 5_000_000, note: 'today' });
    expect(ci.value).toBe(5_000_000);
    expect(ci.planId).toBe(plan.id);
  });

  it('lists check-ins newest first', async () => {
    const plan = await createPlan({ title: 'list', type: 'deadline' });
    await createCheckIn({ planId: plan.id, value: 1, occurredAt: new Date(2026, 6, 1) });
    await createCheckIn({ planId: plan.id, value: 2, occurredAt: new Date(2026, 6, 5) });
    const list = await listCheckIns(plan.id);
    expect(list[0].value).toBe(2);
    expect(list[1].value).toBe(1);
  });

  it('aggregates progress and streak for a plan', async () => {
    const plan = await createPlan({ title: 'agg', type: 'ongoing' });
    const today = new Date();
    await createCheckIn({ planId: plan.id, occurredAt: today });
    const yest = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    await createCheckIn({ planId: plan.id, occurredAt: yest });
    const agg = await getPlanProgress(plan.id);
    expect(agg.streak.current).toBe(2);
    expect(agg.progress).toBe(0); // 无 value
  });

  it('sums values as progress', async () => {
    const plan = await createPlan({ title: 'sum', type: 'deadline', targetValue: 100 });
    await createCheckIn({ planId: plan.id, value: 30 });
    await createCheckIn({ planId: plan.id, value: 20 });
    const agg = await getPlanProgress(plan.id);
    expect(agg.progress).toBe(50);
  });
});
