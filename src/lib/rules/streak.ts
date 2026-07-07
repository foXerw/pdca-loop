// src/lib/rules/streak.ts
import type { PlanCadence } from './kind';

export type CheckInDate = { occurredAt: Date };

function toDayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayDiff(a: Date, b: Date): number {
  // 返回 b - a 的天数（按日历日截断）
  const MS = 24 * 60 * 60 * 1000;
  const da = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const db = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((db - da) / MS);
}

// ISO 周一为起点
export function mondayOf(d: Date): Date {
  const diff = (d.getDay() + 6) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff);
}

export function weekMondayKey(d: Date): string {
  return toDayKey(mondayOf(d));
}

function computeDailyStreak(checkIns: CheckInDate[], today: Date): { current: number; longest: number } {
  const set = new Set<string>();
  for (const c of checkIns) {
    const d = c.occurredAt;
    if (dayDiff(d, today) < 0) continue; // 未来打卡不计入
    set.add(toDayKey(d));
  }
  let current = 0;
  let cursor = new Date(today);
  if (!set.has(toDayKey(cursor))) {
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1);
  }
  while (set.has(toDayKey(cursor))) {
    current += 1;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1);
  }
  const days = [...set].map((k) => {
    const [y, m, d] = k.split('-').map(Number);
    return new Date(y, m, d);
  }).sort((a, b) => a.getTime() - b.getTime());
  let longest = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const d of days) {
    if (prev && dayDiff(prev, d) === 1) run += 1;
    else run = 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  return { current, longest: Math.max(longest, current) };
}

function computeWeeklyStreak(checkIns: CheckInDate[], today: Date, cadenceTimes: number): { current: number; longest: number } {
  const counts = new Map<string, number>();
  for (const c of checkIns) {
    if (dayDiff(c.occurredAt, today) < 0) continue; // 未来打卡不计入
    const k = weekMondayKey(c.occurredAt);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const qualifies = (mondayKey: string) => (counts.get(mondayKey) ?? 0) >= cadenceTimes;

  // current：从本周往回数；本周未达标则跳过（宽限），从上周起算
  let current = 0;
  let cursor = mondayOf(today);
  if (!qualifies(weekMondayKey(cursor))) {
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 7);
  }
  while (qualifies(weekMondayKey(cursor))) {
    current += 1;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 7);
  }

  // longest：达标周一按时间排序，扫连续段（相邻周一相差 7 天）
  const mondays = [...counts.keys()]
    .map((k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m, d); })
    .filter((mo) => qualifies(weekMondayKey(mo)))
    .sort((a, b) => a.getTime() - b.getTime());
  let longest = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const mo of mondays) {
    if (prev && dayDiff(prev, mo) === 7) run += 1;
    else run = 1;
    longest = Math.max(longest, run);
    prev = mo;
  }
  return { current, longest: Math.max(longest, current) };
}

export function computeStreak(
  checkIns: CheckInDate[],
  today: Date,
  cadence: PlanCadence = 'daily',
  cadenceTimes?: number,
): { current: number; longest: number } {
  if (cadence === 'none') return { current: 0, longest: 0 };
  if (cadence === 'weekly') return computeWeeklyStreak(checkIns, today, cadenceTimes ?? 1);
  return computeDailyStreak(checkIns, today);
}
