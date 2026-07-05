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

export function computeStreak(
  checkIns: CheckInDate[],
  today: Date,
): { current: number; longest: number } {
  const todayKey = toDayKey(today);
  const set = new Set<string>();
  for (const c of checkIns) {
    const d = c.occurredAt;
    if (dayDiff(d, today) < 0) continue; // 未来打卡不计入
    set.add(toDayKey(d));
  }
  // current：从 today 往前，若 today 无则从昨天开始（grace）
  let current = 0;
  let cursor = new Date(today);
  if (!set.has(toDayKey(cursor))) {
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1);
  }
  while (set.has(toDayKey(cursor))) {
    current += 1;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1);
  }

  // longest：按日排序后扫连续段
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
