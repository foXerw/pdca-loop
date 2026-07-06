import { describe, it, expect } from 'vitest';
import { periodRange, reviewStats, type ReviewPeriod } from './review';

describe('periodRange', () => {
  const now = new Date(2026, 6, 8, 15, 30); // 2026-07-08 15:30

  it('week starts on Monday and covers up to now', () => {
    const { rangeStart, rangeEnd } = periodRange('week', now);
    expect(rangeStart.getDay()).toBe(1); // Monday
    expect(rangeStart.getTime()).toBeLessThanOrEqual(now.getTime());
    expect(rangeEnd.getTime()).toBe(now.getTime());
    // 起点在本周内（不超过 7 天前）
    expect(now.getTime() - rangeStart.getTime()).toBeLessThan(7 * 86400000);
  });

  it('month starts on day 1 of current month', () => {
    const { rangeStart } = periodRange('month', now);
    expect(rangeStart.getDate()).toBe(1);
    expect(rangeStart.getMonth()).toBe(6);
    expect(rangeStart.getFullYear()).toBe(2026);
  });

  it('quarter starts on day 1 of the quarter start month', () => {
    const { rangeStart } = periodRange('quarter', now);
    expect(rangeStart.getDate()).toBe(1);
    expect([0, 3, 6, 9]).toContain(rangeStart.getMonth());
    expect(rangeStart.getMonth()).toBe(6); // July => Q3 start
  });

  it('custom uses provided range', () => {
    const start = new Date(2026, 5, 1);
    const end = new Date(2026, 5, 30);
    const r = periodRange('custom', now, { start, end });
    expect(r.rangeStart).toBe(start);
    expect(r.rangeEnd).toBe(end);
  });

  it('custom throws without a custom range', () => {
    expect(() => periodRange('custom' as ReviewPeriod, now)).toThrow();
  });
});

describe('reviewStats', () => {
  const rangeStart = new Date(2026, 6, 1);
  const rangeEnd = new Date(2026, 6, 8, 23, 59);

  it('counts check-ins in range and computes progress delta', () => {
    const checkIns = [
      { occurredAt: new Date(2026, 5, 20), value: 10 }, // before range
      { occurredAt: new Date(2026, 6, 2), value: 5 }, // in range
      { occurredAt: new Date(2026, 6, 5), value: 8 }, // in range
      { occurredAt: new Date(2026, 6, 10), value: 3 }, // after range
      { occurredAt: new Date(2026, 6, 5), value: null }, // in range, no value
    ];
    const stats = reviewStats({ checkIns, tasks: [], rangeStart, rangeEnd });
    expect(stats.checkInCount).toBe(3);
    expect(stats.progressBefore).toBe(10);
    expect(stats.progressAfter).toBe(23); // 10 + 5 + 8
    expect(stats.progressDelta).toBe(13);
  });

  it('computes task completion rate', () => {
    const tasks = [{ status: 'done' }, { status: 'done' }, { status: 'todo' }, { status: 'done' }];
    const stats = reviewStats({ checkIns: [], tasks, rangeStart, rangeEnd });
    expect(stats.taskTotal).toBe(4);
    expect(stats.taskDone).toBe(3);
    expect(stats.completionRate).toBe(0.75);
  });

  it('handles empty data', () => {
    const stats = reviewStats({ checkIns: [], tasks: [], rangeStart, rangeEnd });
    expect(stats.checkInCount).toBe(0);
    expect(stats.progressDelta).toBe(0);
    expect(stats.completionRate).toBe(0);
    expect(stats.taskTotal).toBe(0);
  });
});
