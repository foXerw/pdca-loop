import { vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

import { describe, it, expect, beforeAll } from 'vitest';
import { resetTestDb, getTestUserId } from '../setup-db';
import { prisma } from '@/lib/db';
import { createPlan } from '@/lib/server/actions/plan';
import { createTask } from '@/lib/server/actions/task';
import { createCheckIn } from '@/lib/server/actions/checkin';
import { updateUserSettings } from '@/lib/server/actions/settings';
import { runReminderScan } from '@/lib/server/actions/reminder';

beforeAll(async () => {
  await resetTestDb();
  // 检查时间设为 0，确保任意时刻扫描都会产出
  await updateUserSettings({ dailyCheckHour: 0 });
});

describe('runReminderScan', () => {
  it('creates a task_due notification for today-due todo tasks', async () => {
    const plan = await createPlan({ title: 'scan-plan', type: 'ongoing' });
    const today = new Date();
    const due = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
    await createTask({ planId: plan.id, title: '今日截止任务', dueAt: due });

    const { created } = await runReminderScan();
    expect(created).toBeGreaterThanOrEqual(1);

    const userId = await getTestUserId();
    const notifs = await prisma.notification.findMany({ where: { userId, type: 'task_due' } });
    expect(notifs.length).toBeGreaterThanOrEqual(1);
    const payload = JSON.parse(notifs[0].payload);
    expect(payload.title).toContain('待办');
  });

  it('dedups: running again creates nothing new', async () => {
    const { created } = await runReminderScan();
    expect(created).toBe(0);
  });

  it('creates a streak_risk notification for an ongoing plan with streak but no checkin today', async () => {
    const plan = await createPlan({ title: 'streak-plan', type: 'ongoing' });
    // 昨天打卡 → streak.current >= 1，但今天没打
    const yesterday = new Date(Date.now() - 86400000);
    await createCheckIn({ planId: plan.id, occurredAt: yesterday });

    const { created } = await runReminderScan();
    expect(created).toBeGreaterThanOrEqual(1);

    const userId = await getTestUserId();
    const risk = await prisma.notification.findFirst({
      where: { userId, type: 'streak_risk' },
    });
    expect(risk).not.toBeNull();
    expect(JSON.parse(risk!.payload).href).toBe(`/plans/${plan.id}`);
  });

  it('does not flag streak_risk when checked in today', async () => {
    const plan = await createPlan({ title: 'safe-plan', type: 'ongoing' });
    await createCheckIn({ planId: plan.id, occurredAt: new Date() }); // 今天已打卡
    await runReminderScan();
    const userId = await getTestUserId();
    const risk = await prisma.notification.findFirst({
      where: { userId, type: 'streak_risk', payload: { contains: plan.id } },
    });
    expect(risk).toBeNull();
  });
});
