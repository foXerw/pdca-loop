import { describe, it, expect } from 'vitest';
import { computeStreak } from './streak';

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d, 10, 0, 0);

describe('computeStreak', () => {
  it('returns 0 current when no check-ins', () => {
    expect(computeStreak([], day(2026, 7, 6))).toEqual({ current: 0, longest: 0 });
  });

  it('counts current streak ending today', () => {
    const cis = [day(2026, 7, 4), day(2026, 7, 5), day(2026, 7, 6)];
    expect(computeStreak(cis, day(2026, 7, 6))).toEqual({ current: 3, longest: 3 });
  });

  it('counts streak ending yesterday when today missing (grace)', () => {
    const cis = [day(2026, 7, 4), day(2026, 7, 5)];
    expect(computeStreak(cis, day(2026, 7, 6))).toEqual({ current: 2, longest: 2 });
  });

  it('breaks on a gap', () => {
    const cis = [day(2026, 7, 3), day(2026, 7, 5), day(2026, 7, 6)];
    expect(computeStreak(cis, day(2026, 7, 6))).toEqual({ current: 2, longest: 2 });
  });

  it('dedupes same-day check-ins', () => {
    const cis = [day(2026, 7, 6), day(2026, 7, 6), day(2026, 7, 5)];
    expect(computeStreak(cis, day(2026, 7, 6))).toEqual({ current: 2, longest: 2 });
  });

  it('ignores future check-ins for current', () => {
    const cis = [day(2026, 7, 6), day(2026, 7, 7)];
    expect(computeStreak(cis, day(2026, 7, 6))).toEqual({ current: 1, longest: 1 });
  });
});
