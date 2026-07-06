import { vi } from 'vitest';

// `import 'server-only'` throws outside the Next.js request runtime; stub it.
// `revalidatePath` from `next/cache` throws an invariant error outside Next runtime.
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

import { describe, it, expect, beforeAll } from 'vitest';
import { resetTestDb, getTestUserId } from '../setup-db';
import { createPlan, listActivePlansOverview } from '@/lib/server/actions/plan';
import {
  createTask,
  listTodaysTasks,
  type Recurrence,
} from '@/lib/server/actions/task';
import { createCheckIn } from '@/lib/server/actions/checkin';

beforeAll(async () => {
  await resetTestDb();
});

describe('listActivePlansOverview', () => {
  it('returns only active plans with progress + streak', async () => {
    const deadline = await createPlan({
      title: '一亿 token',
      type: 'deadline',
      targetValue: 100000000,
      targetUnit: 'tokens',
    });
    await createCheckIn({ planId: deadline.id, value: 30 });
    const ongoing = await createPlan({ title: '学画画', type: 'ongoing' });
    await createCheckIn({ planId: ongoing.id });

    const overview = await listActivePlansOverview();
    const d = overview.find((p) => p.id === deadline.id)!;
    const o = overview.find((p) => p.id === ongoing.id)!;
    expect(d.progress).toBe(30);
    expect(d.streak.current).toBeGreaterThanOrEqual(1);
    expect(o.streak.current).toBeGreaterThanOrEqual(1);
    // 所有返回项都带 progress/streak 字段
    for (const p of overview) {
      expect(typeof p.progress).toBe('number');
      expect(p.streak).toHaveProperty('current');
      expect(p.streak).toHaveProperty('longest');
    }
  });

  it('excludes non-active plans', async () => {
    const p = await createPlan({ title: 'archived', type: 'ongoing' });
    const { setPlanStatus } = await import('@/lib/server/actions/plan');
    await setPlanStatus(p.id, 'archived');
    const overview = await listActivePlansOverview();
    expect(overview.find((x) => x.id === p.id)).toBeUndefined();
  });

  it('scopes to the current user', async () => {
    const overview = await listActivePlansOverview();
    const uid = await getTestUserId();
    expect(overview.every((p) => p.userId === uid)).toBe(true);
  });
});

describe('listTodaysTasks', () => {
  it('includes tasks due today (todo) and recurring tasks', async () => {
    const plan = await createPlan({ title: 'today-plan', type: 'ongoing' });
    // 今日到期、未完成 → 命中
    const today = new Date();
    const due = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
    await createTask({ planId: plan.id, title: '今日截止', dueAt: due });
    // 循环任务 → 命中
    await createTask({
      planId: plan.id,
      title: '每日打卡',
      recurrence: 'daily' as Recurrence,
    });
    // 明日到期 → 不命中
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    await createTask({ planId: plan.id, title: '明日', dueAt: tomorrow });

    const list = await listTodaysTasks();
    const titles = list.map((t) => t.title);
    expect(titles).toContain('今日截止');
    expect(titles).toContain('每日打卡');
    expect(titles).not.toContain('明日');
    // 每条带所属计划
    expect(list[0].plan).toHaveProperty('title');
  });

  it('excludes done one-off tasks due today', async () => {
    const plan = await createPlan({ title: 'done-plan', type: 'ongoing' });
    const today = new Date();
    const due = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
    const t = await createTask({ planId: plan.id, title: '做完了', dueAt: due });
    const { completeTask } = await import('@/lib/server/actions/task');
    await completeTask(t.id); // toggle → done
    const list = await listTodaysTasks();
    expect(list.find((x) => x.id === t.id)).toBeUndefined();
  });
});
