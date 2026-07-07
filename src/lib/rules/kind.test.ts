import { describe, it, expect } from 'vitest';
import { planKind } from './kind';

describe('planKind', () => {
  it('deadline + quantitative + none → 终点·量化', () => {
    expect(planKind({ dueAt: new Date('2026-12-31'), targetValue: 100, cadence: 'none' })).toEqual({
      hasDeadline: true,
      isQuantitative: true,
      isRecurring: false,
      cadence: 'none',
      cadenceTimes: null,
    });
  });

  it('deadline + no target + none → 终点·里程碑', () => {
    expect(planKind({ dueAt: new Date('2026-12-31'), cadence: 'none' })).toEqual({
      hasDeadline: true,
      isQuantitative: false,
      isRecurring: false,
      cadence: 'none',
      cadenceTimes: null,
    });
  });

  it('no deadline + daily → 每日练习', () => {
    expect(planKind({ cadence: 'daily' })).toEqual({
      hasDeadline: false,
      isQuantitative: false,
      isRecurring: true,
      cadence: 'daily',
      cadenceTimes: null,
    });
  });

  it('no deadline + weekly(3) → 每周练习', () => {
    expect(planKind({ cadence: 'weekly', cadenceTimes: 3 })).toEqual({
      hasDeadline: false,
      isQuantitative: false,
      isRecurring: true,
      cadence: 'weekly',
      cadenceTimes: 3,
    });
  });

  it('deadline + quantitative + weekly → 混合（每周写 1 篇共 52 篇）', () => {
    expect(planKind({ dueAt: new Date('2026-12-31'), targetValue: 52, cadence: 'weekly', cadenceTimes: 1 })).toEqual({
      hasDeadline: true,
      isQuantitative: true,
      isRecurring: true,
      cadence: 'weekly',
      cadenceTimes: 1,
    });
  });

  it('treats null/undefined cadence as none', () => {
    expect(planKind({ cadence: null }).cadence).toBe('none');
    expect(planKind({}).cadence).toBe('none');
    expect(planKind({ cadence: 'garbage' }).cadence).toBe('garbage'); // 透传，不做白名单校验
  });

  it('drops cadenceTimes when not recurring', () => {
    expect(planKind({ cadence: 'none', cadenceTimes: 3 }).cadenceTimes).toBeNull();
  });
});
