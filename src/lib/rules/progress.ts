export type CheckInValue = { value?: number | null };

export function sumProgress(checkIns: CheckInValue[]): number {
  return checkIns.reduce((acc, c) => acc + (c.value ?? 0), 0);
}

export type MilestoneLike = {
  targetValue?: number | null;
  targetDate: Date;
  status: string;
};

export function milestoneStatus(
  m: MilestoneLike,
  progress: number,
  now: Date,
): 'todo' | 'done' | 'overdue' {
  if (m.status === 'done') return 'done';
  if (m.targetValue != null && progress >= m.targetValue) return 'done';
  if (now > m.targetDate) return 'overdue';
  return 'todo';
}

export function projectedFinishDate(
  progress: number,
  targetValue: number,
  startAt: Date,
  now: Date,
): Date | null {
  if (progress <= 0) return null;
  const MS = 24 * 60 * 60 * 1000;
  const elapsedDays = Math.max(1, Math.round((now.getTime() - startAt.getTime()) / MS));
  const ratePerDay = progress / elapsedDays;
  const remaining = Math.max(0, targetValue - progress);
  const daysLeft = Math.ceil(remaining / ratePerDay);
  return new Date(now.getTime() + daysLeft * MS);
}
