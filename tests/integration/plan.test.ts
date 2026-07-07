import { vi } from 'vitest';

// `import 'server-only'` throws outside the Next.js request runtime; stub it.
// `revalidatePath` from `next/cache` throws an invariant error outside Next runtime.
// Both mocks are hoisted by vitest before the action module is imported.
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

import { describe, it, expect, beforeAll } from 'vitest';
import { resetTestDb, getTestUserId } from '../setup-db';
import { createPlan, listPlans, getPlan, updatePlan, setPlanStatus } from '@/lib/server/actions/plan';

beforeAll(async () => {
  await resetTestDb();
});

describe('plan actions', () => {
  it('creates a deadline plan with target', async () => {
    const p = await createPlan({
      title: '读 30 本书',
      targetValue: 30,
      targetUnit: '本',
      dueAt: new Date(2026, 11, 31),
    });
    expect(p.id).toBeTruthy();
    expect(p.title).toBe('读 30 本书');
    expect(p.userId).toBe(await getTestUserId());
    expect(p.targetValue).toBe(30);
  });

  it('creates an ongoing plan without target', async () => {
    const p = await createPlan({ title: '学画画', cadence: 'daily' });
    expect(p.targetValue).toBeNull();
  });

  it('lists only current user plans, newest first', async () => {
    const list = await listPlans();
    expect(list.length).toBeGreaterThanOrEqual(2);
    expect(list[0].createdAt.getTime()).toBeGreaterThanOrEqual(list[1].createdAt.getTime());
  });

  it('gets a plan by id', async () => {
    const created = await createPlan({ title: 'find me', cadence: 'daily' });
    const got = await getPlan(created.id);
    expect(got?.title).toBe('find me');
  });

  it('updates plan fields', async () => {
    const p = await createPlan({ title: 'edit', cadence: 'daily' });
    const updated = await updatePlan(p.id, { title: 'edited', description: 'd' });
    expect(updated.title).toBe('edited');
    expect(updated.description).toBe('d');
  });

  it('sets plan status', async () => {
    const p = await createPlan({ title: 'status', cadence: 'daily' });
    const done = await setPlanStatus(p.id, 'done');
    expect(done.status).toBe('done');
  });

  it('returns null for missing plan', async () => {
    expect(await getPlan('nonexistent-id')).toBeNull();
  });
});
