import { vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));
vi.mock('web-push', () => ({
  default: { setVapidDetails: vi.fn(), sendNotification: vi.fn().mockResolvedValue({ statusCode: 201 }) },
}));

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

  it('creates a weekly streak_risk notification when this week under target but last week met', async () => {
    const plan = await createPlan({ title: '周跑', cadence: 'weekly', cadenceTimes: 3 });
    // 上周打 3 次（满足）→ 周 streak >=1；本周 0 次 → at-risk
    const today = new Date();
    const diffToMonday = (today.getDay() + 6) % 7;
    const thisMonday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - diffToMonday);
    const lastMonday = new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() - 7);
    await createCheckIn({ planId: plan.id, occurredAt: lastMonday });
    await createCheckIn({ planId: plan.id, occurredAt: new Date(lastMonday.getTime() + 86400000) });
    await createCheckIn({ planId: plan.id, occurredAt: new Date(lastMonday.getTime() + 2 * 86400000) });

    const { created } = await runReminderScan();
    expect(created).toBeGreaterThanOrEqual(1);

    const userId = await getTestUserId();
    const risk = await prisma.notification.findFirst({
      where: { userId, type: 'streak_risk', payload: { contains: plan.id } },
    });
    expect(risk).not.toBeNull();
    const payload = JSON.parse(risk!.payload);
    expect(payload.title).toContain('本周还差');
    expect(payload.body).toContain('别断签');
  });
});
