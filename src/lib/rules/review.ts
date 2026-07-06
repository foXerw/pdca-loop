export type ReviewPeriod = 'week' | 'month' | 'quarter' | 'custom';

// 计算回顾周期对应的 [rangeStart, rangeEnd]。
// week/month/quarter 以「本期至今」为范围（rangeEnd = now），方便「本周回顾是否已做」判断与预填。
export function periodRange(
  period: ReviewPeriod,
  now: Date,
  custom?: { start: Date; end: Date },
): { rangeStart: Date; rangeEnd: Date } {
  if (period === 'custom') {
    if (!custom) throw new Error('custom period requires a custom range');
    return { rangeStart: custom.start, rangeEnd: custom.end };
  }
  const end = now;
  let start: Date;
  if (period === 'week') {
    // ISO 周：周一开始。getDay() 0=周日..6=周六
    const diff = (now.getDay() + 6) % 7;
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
  } else if (period === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
    start = new Date(now.getFullYear(), qStartMonth, 1);
  }
  return { rangeStart: start, rangeEnd: end };
}

export type ReviewStatsInput = {
  checkIns: { occurredAt: Date; value?: number | null }[];
  tasks: { status: string }[];
  rangeStart: Date;
  rangeEnd: Date;
};

export type ReviewStats = {
  checkInCount: number;
  taskTotal: number;
  taskDone: number;
  completionRate: number; // 0..1
  progressBefore: number;
  progressAfter: number;
  progressDelta: number;
};

// 从打卡/任务数据汇总本期客观统计，供回顾预填展示。
export function reviewStats(input: ReviewStatsInput): ReviewStats {
  const { checkIns, tasks, rangeStart, rangeEnd } = input;
  const startMs = rangeStart.getTime();
  const endMs = rangeEnd.getTime();
  let checkInCount = 0;
  let progressBefore = 0;
  let progressAfter = 0;
  for (const c of checkIns) {
    const t = c.occurredAt.getTime();
    const v = c.value ?? 0;
    if (t < startMs) progressBefore += v;
    if (t <= endMs) progressAfter += v;
    if (t >= startMs && t <= endMs) checkInCount += 1;
  }
  const taskTotal = tasks.length;
  const taskDone = tasks.filter((t) => t.status === 'done').length;
  return {
    checkInCount,
    taskTotal,
    taskDone,
    completionRate: taskTotal === 0 ? 0 : taskDone / taskTotal,
    progressBefore,
    progressAfter,
    progressDelta: progressAfter - progressBefore,
  };
}
