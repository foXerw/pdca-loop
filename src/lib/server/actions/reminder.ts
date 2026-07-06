import 'server-only';
import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/server/context';
import { touch } from './_shared';
import { getUserSettings } from './settings';
import { listTodaysTasks } from './task';
import { hasReviewForCurrentWeek } from './review';
import { listActivePlansOverview } from './plan';
import { computeDueReminders } from '@/lib/rules/reminder';

// 扫描「到点未完成」项，写 Notification（带去重，每个 key 每天最多一条）。
// 由 instrumentation setInterval（自托管/next start）或 /api/cron/reminders（Vercel Cron）触发。
export async function runReminderScan(): Promise<{ created: number }> {
  const userId = await getCurrentUserId();
  const now = new Date();

  const [settings, todaysTasks, reviewDone, activePlans] = await Promise.all([
    getUserSettings(),
    listTodaysTasks(),
    hasReviewForCurrentWeek(),
    listActivePlansOverview(),
  ]);

  const dueTasks = todaysTasks
    .filter((t) => t.status === 'todo')
    .map((t) => ({ id: t.id, title: t.title, planId: t.planId }));

  // at-risk：ongoing 活跃计划、streak>0、今日未打卡
  const atRiskPlans: { id: string; title: string }[] = [];
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  for (const p of activePlans) {
    if (p.type !== 'ongoing' || p.streak.current <= 0) continue;
    const checkedInToday = await prisma.checkIn.findFirst({
      where: { planId: p.id, userId, occurredAt: { gte: startOfToday, lt: endOfToday } },
      select: { id: true },
    });
    if (!checkedInToday) atRiskPlans.push({ id: p.id, title: p.title });
  }

  const candidates = computeDueReminders(
    { settings, dueTasks, reviewDueWeek: !reviewDone, atRiskPlans },
    now,
  );

  if (candidates.length === 0) return { created: 0 };

  // 去重：本用户今日已存在的通知 key 集合
  const existing = await prisma.notification.findMany({
    where: { userId, createdAt: { gte: startOfToday } },
    select: { payload: true },
  });
  const seen = new Set<string>();
  for (const n of existing) {
    try {
      const parsed = JSON.parse(n.payload) as { key?: string };
      if (parsed.key) seen.add(parsed.key);
    } catch {
      // 忽略畸形 payload
    }
  }

  let created = 0;
  for (const r of candidates) {
    if (seen.has(r.key)) continue;
    await prisma.notification.create({
      data: {
        userId,
        type: r.type,
        payload: JSON.stringify({ key: r.key, title: r.title, body: r.body, href: r.href }),
      },
    });
    created += 1;
  }
  touch();
  return { created };
}
