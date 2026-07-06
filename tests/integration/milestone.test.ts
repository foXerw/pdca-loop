import { vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

import { describe, it, expect, beforeAll } from 'vitest';
import { resetTestDb, getTestUserId } from '../setup-db';
import { createPlan } from '@/lib/server/actions/plan';
import {
  createMilestone,
  listMilestonesByPlan,
  updateMilestone,
  setMilestoneStatus,
  deleteMilestone,
} from '@/lib/server/actions/milestone';

beforeAll(async () => {
  await resetTestDb();
});

describe('milestone actions', () => {
  it('creates a milestone with auto order', async () => {
    const plan = await createPlan({
      title: '一亿 token',
      type: 'deadline',
      targetValue: 100000000,
      targetUnit: 'tokens',
    });
    const m1 = await createMilestone({
      planId: plan.id,
      title: '25M',
      targetDate: new Date(2026, 8, 1),
      targetValue: 25000000,
    });
    const m2 = await createMilestone({
      planId: plan.id,
      title: '50M',
      targetDate: new Date(2026, 10, 1),
      targetValue: 50000000,
    });
    expect(m1.order).toBe(0);
    expect(m2.order).toBe(1);
    expect(m1.targetValue).toBe(25000000);
  });

  it('lists milestones ordered by order then date', async () => {
    const plan = await createPlan({ title: 'ordered', type: 'deadline' });
    await createMilestone({ planId: plan.id, title: 'A', targetDate: new Date(2026, 11, 1), order: 2 });
    await createMilestone({ planId: plan.id, title: 'B', targetDate: new Date(2026, 0, 1), order: 1 });
    const list = await listMilestonesByPlan(plan.id);
    expect(list.map((m) => m.title)).toEqual(['B', 'A']);
    expect(list.every((m) => m.planId === plan.id)).toBe(true);
  });

  it('updates milestone fields', async () => {
    const plan = await createPlan({ title: 'upd', type: 'deadline' });
    const m = await createMilestone({ planId: plan.id, title: 'x', targetDate: new Date(2026, 5, 1) });
    const updated = await updateMilestone(m.id, { title: 'y', targetValue: 75 });
    expect(updated.title).toBe('y');
    expect(updated.targetValue).toBe(75);
  });

  it('toggles milestone status', async () => {
    const plan = await createPlan({ title: 'toggle', type: 'deadline' });
    const m = await createMilestone({ planId: plan.id, title: 'm', targetDate: new Date(2026, 5, 1) });
    expect(m.status).toBe('todo');
    const done = await setMilestoneStatus(m.id, 'done');
    expect(done.status).toBe('done');
  });

  it('deletes a milestone', async () => {
    const plan = await createPlan({ title: 'del', type: 'deadline' });
    const m = await createMilestone({ planId: plan.id, title: 'gone', targetDate: new Date(2026, 5, 1) });
    await deleteMilestone(m.id);
    const list = await listMilestonesByPlan(plan.id);
    expect(list.find((x) => x.id === m.id)).toBeUndefined();
  });

  it('rejects operating on another user plan (not_found)', async () => {
    // 当前单用户模型下，伪造一个不存在的 planId 即触发 not_found
    await expect(
      createMilestone({ planId: 'nope', title: 'x', targetDate: new Date(2026, 5, 1) }),
    ).rejects.toThrow();
    await expect(listMilestonesByPlan('nope')).rejects.toThrow();
  });

  it('scopes to the current user', async () => {
    const plan = await createPlan({ title: 'scoped', type: 'deadline' });
    await createMilestone({ planId: plan.id, title: 'm', targetDate: new Date(2026, 5, 1) });
    const list = await listMilestonesByPlan(plan.id);
    expect(list.length).toBeGreaterThanOrEqual(1);
    const uid = await getTestUserId();
    const own = await import('@/lib/server/actions/plan').then((m) => m.getPlan(plan.id));
    expect(own?.userId).toBe(uid);
  });
});
