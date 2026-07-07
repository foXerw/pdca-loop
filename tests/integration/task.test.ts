import { vi } from 'vitest';

// `import 'server-only'` throws outside the Next.js request runtime; stub it.
// `revalidatePath` from `next/cache` throws an invariant error outside Next runtime.
// Both mocks are hoisted by vitest before the action module is imported.
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

import { describe, it, expect, beforeAll } from 'vitest';
import { resetTestDb } from '../setup-db';
import { createPlan } from '@/lib/server/actions/plan';
import { createTask, listTasksByPlan, completeTask, updateTask } from '@/lib/server/actions/task';

beforeAll(async () => {
  await resetTestDb();
});

describe('task actions', () => {
  it('creates a daily recurring task under a plan', async () => {
    const plan = await createPlan({ title: '画画', cadence: 'daily' });
    const t = await createTask({ planId: plan.id, title: '每天画 30 分钟', recurrence: 'daily' });
    expect(t.recurrence).toBe('daily');
    expect(t.status).toBe('todo');
  });

  it('lists tasks by plan', async () => {
    const plan = await createPlan({ title: 'p2', cadence: 'daily' });
    await createTask({ planId: plan.id, title: 't1' });
    await createTask({ planId: plan.id, title: 't2' });
    const list = await listTasksByPlan(plan.id);
    expect(list.length).toBe(2);
  });

  it('completes a task', async () => {
    const plan = await createPlan({ title: 'p3', cadence: 'daily' });
    const t = await createTask({ planId: plan.id, title: 'do' });
    const done = await completeTask(t.id);
    expect(done.status).toBe('done');
  });

  it('updates task notes and title', async () => {
    const plan = await createPlan({ title: 'p4', cadence: 'daily' });
    const t = await createTask({ planId: plan.id, title: 'orig' });
    const u = await updateTask(t.id, { title: 'new', notes: 'n' });
    expect(u.title).toBe('new');
    expect(u.notes).toBe('n');
  });
});
