import { describe, it, expect } from 'vitest';
import { sumProgress, milestoneStatus, projectedFinishDate } from './progress';

describe('sumProgress', () => {
  it('sums value fields, ignoring null/undefined', () => {
    expect(sumProgress([{ value: 10 }, { value: 20 }, { value: null }, {}])).toBe(30);
  });
  it('returns 0 for empty', () => expect(sumProgress([])).toBe(0));
});

describe('milestoneStatus', () => {
  const ms = (over: Partial<{ targetValue: number | null; targetDate: Date; status: string }>) => ({
    targetValue: null, targetDate: new Date(2026, 11, 31), status: 'todo', ...over,
  });
  it('done when status already done', () => {
    expect(milestoneStatus(ms({ status: 'done' }), 0, new Date(2026, 6, 1))).toBe('done');
  });
  it('done when progress meets target', () => {
    expect(milestoneStatus(ms({ targetValue: 100 }), 100, new Date(2026, 6, 1))).toBe('done');
  });
  it('overdue when past targetDate and below target', () => {
    expect(milestoneStatus(ms({ targetValue: 100 }), 50, new Date(2027, 1, 1))).toBe('overdue');
  });
  it('todo otherwise', () => {
    expect(milestoneStatus(ms({ targetValue: 100 }), 50, new Date(2026, 6, 1))).toBe('todo');
  });
});

describe('projectedFinishDate', () => {
  const day = (y: number, m: number, d: number) => new Date(y, m - 1, d);
  it('projects by current rate', () => {
    // 30 天用了 30M，目标 100M → 还需 70 天；7/1 + 70 天 = 9/9
    const r = projectedFinishDate(30, 100, day(2026, 6, 1), day(2026, 7, 1));
    expect(r).toEqual(day(2026, 9, 9));
  });
  it('returns null when no progress yet', () => {
    expect(projectedFinishDate(0, 100, day(2026, 6, 1), day(2026, 6, 2))).toBeNull();
  });
});
