export type ReminderType = 'task_due' | 'review_due' | 'streak_risk';

export type Reminder = {
  type: ReminderType;
  key: string;
  title: string;
  body: string;
  href: string;
};

export type ReminderInput = {
  settings: { dailyCheckHour: number };
  dueTasks: { id: string; title: string; planId: string }[];
  reviewDueWeek: boolean;
  atRiskPlans: { id: string; title: string; cadence: 'daily' | 'weekly'; remaining: number }[];
};

function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function weekMondayKey(d: Date): string {
  const diff = (d.getDay() + 6) % 7; // ISO 周：周一为起点
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff);
  return dayKey(monday);
}

// 计算当前应触发的提醒。仅当 now 已到「每日检查时间」才产出（到点未完成语义）。
export function computeDueReminders(input: ReminderInput, now: Date): Reminder[] {
  if (now.getHours() < input.settings.dailyCheckHour) return [];

  const out: Reminder[] = [];

  if (input.dueTasks.length > 0) {
    const titles = input.dueTasks.slice(0, 3).map((t) => t.title);
    const more = input.dueTasks.length - titles.length;
    const body = titles.join('、') + (more > 0 ? ` 等 ${input.dueTasks.length} 件` : '');
    out.push({
      type: 'task_due',
      key: `task_due:${dayKey(now)}`,
      title: `今天还有 ${input.dueTasks.length} 件事待办`,
      body,
      href: '/',
    });
  }

  if (input.reviewDueWeek) {
    out.push({
      type: 'review_due',
      key: `review_due:week:${weekMondayKey(now)}`,
      title: '本周回顾还没写',
      body: '抽几分钟补一篇，总结本周进展与调整。',
      href: '/reviews/new',
    });
  }

  for (const p of input.atRiskPlans) {
    if (p.cadence === 'weekly') {
      out.push({
        type: 'streak_risk',
        key: `streak_risk:${p.id}:${weekMondayKey(now)}`,
        title: `「${p.title}」本周还差 ${p.remaining} 次`,
        body: '保持节奏，别断签。',
        href: `/plans/${p.id}`,
      });
    } else {
      out.push({
        type: 'streak_risk',
        key: `streak_risk:${p.id}:${dayKey(now)}`,
        title: `「${p.title}」今天还没打卡`,
        body: 'streak 即将断签，去打个卡吧。',
        href: `/plans/${p.id}`,
      });
    }
  }

  return out;
}
