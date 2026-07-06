import { describe, it, expect } from 'vitest';
import { computeDueReminders, type ReminderInput } from './reminder';

const at20 = (over: Partial<ReminderInput>): ReminderInput => ({
  settings: { dailyCheckHour: 20 },
  dueTasks: [],
  reviewDueWeek: false,
  atRiskPlans: [],
  ...over,
});

// 2026-07-07 是周二，21:00（已过 20:00 检查时间）
const AFTER = new Date(2026, 6, 7, 21, 0);
// 同日 10:00（未到检查时间）
const BEFORE = new Date(2026, 6, 7, 10, 0);

describe('computeDueReminders', () => {
  it('produces nothing before daily check hour', () => {
    const r = computeDueReminders(at20({ dueTasks: [{ id: 't1', title: 'a', planId: 'p' }] }), BEFORE);
    expect(r).toEqual([]);
  });

  it('aggregates due tasks into one task_due reminder with date key', () => {
    const r = computeDueReminders(
      at20({
        dueTasks: [
          { id: 't1', title: '画画', planId: 'p1' },
          { id: 't2', title: '写 500 字', planId: 'p2' },
        ],
      }),
      AFTER,
    );
    expect(r).toHaveLength(1);
    expect(r[0].type).toBe('task_due');
    expect(r[0].key).toBe('task_due:2026-07-07');
    expect(r[0].title).toBe('今天还有 2 件事待办');
    expect(r[0].body).toContain('画画');
    expect(r[0].body).toContain('写 500 字');
    expect(r[0].href).toBe('/');
  });

  it('truncates task list to 3 with count suffix', () => {
    const dueTasks = Array.from({ length: 5 }, (_, i) => ({ id: `t${i}`, title: `t${i}`, planId: 'p' }));
    const r = computeDueReminders(at20({ dueTasks }), AFTER);
    expect(r[0].body).toMatch(/等 5 件$/);
  });

  it('emits a review_due reminder with week-Monday key', () => {
    const r = computeDueReminders(at20({ reviewDueWeek: true }), AFTER);
    expect(r).toHaveLength(1);
    expect(r[0].type).toBe('review_due');
    expect(r[0].key).toBe('review_due:week:2026-07-06'); // 周一的日期
    expect(r[0].href).toBe('/reviews/new');
  });

  it('emits a streak_risk reminder per at-risk plan', () => {
    const r = computeDueReminders(
      at20({ atRiskPlans: [{ id: 'p1', title: '学画画' }] }),
      AFTER,
    );
    expect(r).toHaveLength(1);
    expect(r[0].type).toBe('streak_risk');
    expect(r[0].key).toBe('streak_risk:p1:2026-07-07');
    expect(r[0].title).toContain('学画画');
    expect(r[0].href).toBe('/plans/p1');
  });

  it('combines all three types when applicable', () => {
    const r = computeDueReminders(
      at20({
        dueTasks: [{ id: 't1', title: 'a', planId: 'p' }],
        reviewDueWeek: true,
        atRiskPlans: [{ id: 'p1', title: 'x' }, { id: 'p2', title: 'y' }],
      }),
      AFTER,
    );
    expect(r.map((x) => x.type)).toEqual(['task_due', 'review_due', 'streak_risk', 'streak_risk']);
  });

  it('produces nothing when there is nothing due', () => {
    expect(computeDueReminders(at20({}), AFTER)).toEqual([]);
  });
});
