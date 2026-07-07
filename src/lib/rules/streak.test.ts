import { describe, it, expect } from 'vitest';
import { computeStreak } from './streak';

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d, 10, 0, 0);

describe('computeStreak', () => {
  it('returns 0 current when no check-ins', () => {
    expect(computeStreak([], day(2026, 7, 6))).toEqual({ current: 0, longest: 0 });
  });

  it('counts current streak ending today', () => {
    const cis = [{ occurredAt: day(2026, 7, 4) }, { occurredAt: day(2026, 7, 5) }, { occurredAt: day(2026, 7, 6) }];
    expect(computeStreak(cis, day(2026, 7, 6))).toEqual({ current: 3, longest: 3 });
  });

  it('counts streak ending yesterday when today missing (grace)', () => {
    const cis = [{ occurredAt: day(2026, 7, 4) }, { occurredAt: day(2026, 7, 5) }];
    expect(computeStreak(cis, day(2026, 7, 6))).toEqual({ current: 2, longest: 2 });
  });

  it('breaks on a gap', () => {
    const cis = [{ occurredAt: day(2026, 7, 3) }, { occurredAt: day(2026, 7, 5) }, { occurredAt: day(2026, 7, 6) }];
    expect(computeStreak(cis, day(2026, 7, 6))).toEqual({ current: 2, longest: 2 });
  });

  it('dedupes same-day check-ins', () => {
    const cis = [{ occurredAt: day(2026, 7, 6) }, { occurredAt: day(2026, 7, 6) }, { occurredAt: day(2026, 7, 5) }];
    expect(computeStreak(cis, day(2026, 7, 6))).toEqual({ current: 2, longest: 2 });
  });

  it('ignores future check-ins for current', () => {
    const cis = [{ occurredAt: day(2026, 7, 6) }, { occurredAt: day(2026, 7, 7) }];
    expect(computeStreak(cis, day(2026, 7, 6))).toEqual({ current: 1, longest: 1 });
  });

  // 追加到 src/lib/rules/streak.test.ts 的 describe('computeStreak', ...) 内
  // 2026-07-06 是周一；2026-07-08 是周三（本周）。
  const w = (y: number, m: number, d: number) => new Date(y, m - 1, d, 10, 0, 0);
  const THIS_WEEK = w(2026, 7, 8); // 周三
  const LAST_WEEK = w(2026, 6, 30); // 上周三（周一 06-29 那周）
  const TWO_WEEKS_AGO = w(2026, 6, 23); // 上上周三（周一 06-22 那周）

  it('weekly: returns 0 when cadence none', () => {
    expect(computeStreak([{ occurredAt: THIS_WEEK }], THIS_WEEK, 'none')).toEqual({ current: 0, longest: 0 });
  });

  it('weekly: this week met (N=3) → current 1, longest 1', () => {
    const cis = [w(2026, 7, 6), w(2026, 7, 7), w(2026, 7, 8)].map((d) => ({ occurredAt: d }));
    expect(computeStreak(cis, THIS_WEEK, 'weekly', 3)).toEqual({ current: 1, longest: 1 });
  });

  it('weekly: this week not met but last week met → grace, current 1', () => {
    // 本周 2 次（<3），上周 3 次（周一 06-29/30/07-01）
    const cis = [w(2026, 7, 6), w(2026, 7, 7), w(2026, 6, 29), w(2026, 6, 30), w(2026, 7, 1)].map((d) => ({ occurredAt: d }));
    expect(computeStreak(cis, THIS_WEEK, 'weekly', 3)).toEqual({ current: 1, longest: 1 });
  });

  it('weekly: this week + last week both met, gap before → current 2, longest 2', () => {
    // 本周 3、上周 3、上上周 0
    const cis = [
      w(2026, 7, 6), w(2026, 7, 7), w(2026, 7, 8),
      w(2026, 6, 29), w(2026, 6, 30), w(2026, 7, 1),
    ].map((d) => ({ occurredAt: d }));
    expect(computeStreak(cis, THIS_WEEK, 'weekly', 3)).toEqual({ current: 2, longest: 2 });
  });

  it('weekly: three consecutive weeks met (N=1) → current 3, longest 3', () => {
    const cis = [w(2026, 7, 6), w(2026, 6, 29), w(2026, 6, 22)].map((d) => ({ occurredAt: d }));
    expect(computeStreak(cis, THIS_WEEK, 'weekly', 1)).toEqual({ current: 3, longest: 3 });
  });

  it('weekly: this week 1 (<2) and last week 0 → current 0, longest 0', () => {
    const cis = [w(2026, 7, 6)].map((d) => ({ occurredAt: d }));
    expect(computeStreak(cis, THIS_WEEK, 'weekly', 2)).toEqual({ current: 0, longest: 0 });
  });
});
