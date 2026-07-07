// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { PlanCard } from './PlanCard';
import type { PlanOverview } from '@/lib/server/actions/plan';

vi.mock('next/link', () => ({ __esModule: true, default: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));

afterEach(cleanup);

const base = {
  id: 'p1', userId: 'u', title: '计划', description: '',
  cadence: 'none', cadenceTimes: null, status: 'active',
  targetValue: null, targetUnit: null, startAt: new Date(), dueAt: null, icon: null,
  createdAt: new Date(), updatedAt: new Date(),
  progress: 0, streak: { current: 0, longest: 0 }, thisPeriodCount: null,
} as PlanOverview;

describe('PlanCard', () => {
  it('量化计划显示进度数字', () => {
    render(<PlanCard plan={{ ...base, title: '读书计划', targetValue: 30, targetUnit: '本', progress: 12 }} />);
    expect(screen.getByText(/12/)).toBeInTheDocument();
    expect(screen.getByText(/30/)).toBeInTheDocument();
    expect(screen.queryByText(/连续/)).not.toBeInTheDocument();
  });

  it('daily 计划显示连续天数', () => {
    render(<PlanCard plan={{ ...base, cadence: 'daily', streak: { current: 5, longest: 9 } }} />);
    expect(screen.getByText(/连续 5 天/)).toBeInTheDocument();
  });

  it('weekly 计划显示本周次数 + 周连胜', () => {
    render(<PlanCard plan={{ ...base, title: '每周跑', cadence: 'weekly', cadenceTimes: 3, thisPeriodCount: 2, streak: { current: 4, longest: 6 } }} />);
    expect(screen.getByText(/本周 2\/3/)).toBeInTheDocument();
    expect(screen.getByText(/连续 4 周/)).toBeInTheDocument();
  });
});
