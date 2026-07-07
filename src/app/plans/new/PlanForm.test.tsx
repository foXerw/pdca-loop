// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { PlanForm } from './PlanForm';

vi.mock('@/app/actions', () => ({
  createPlanAction: vi.fn(),
}));

afterEach(cleanup);

describe('PlanForm', () => {
  it('deadline-quant 模板默认显示目标值/单位/截止日', () => {
    render(<PlanForm />);
    fireEvent.click(screen.getByLabelText(/终点·量化/));
    expect(screen.getByLabelText('目标值')).toBeInTheDocument();
    expect(screen.getByLabelText('单位')).toBeInTheDocument();
    expect(screen.getByLabelText('截止日期')).toBeInTheDocument();
    expect(screen.queryByLabelText('每周次数')).not.toBeInTheDocument();
  });

  it('milestone 模板只显示截止日', () => {
    render(<PlanForm />);
    fireEvent.click(screen.getByLabelText(/终点·里程碑/));
    expect(screen.getByLabelText('截止日期')).toBeInTheDocument();
    expect(screen.queryByLabelText('目标值')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('每周次数')).not.toBeInTheDocument();
  });

  it('daily 模板不显示目标/截止/周次数', () => {
    render(<PlanForm />);
    fireEvent.click(screen.getByLabelText(/每日练习/));
    expect(screen.queryByLabelText('目标值')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('截止日期')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('每周次数')).not.toBeInTheDocument();
  });

  it('weekly 模板显示每周次数', () => {
    render(<PlanForm />);
    fireEvent.click(screen.getByLabelText(/每周练习/));
    expect(screen.getByLabelText('每周次数')).toBeInTheDocument();
    expect(screen.queryByLabelText('目标值')).not.toBeInTheDocument();
  });

  it('custom 模板显示全部 facet（含 cadence 选择）', () => {
    render(<PlanForm />);
    fireEvent.click(screen.getByLabelText(/自定义/));
    expect(screen.getByLabelText('目标值')).toBeInTheDocument();
    expect(screen.getByLabelText('截止日期')).toBeInTheDocument();
    expect(screen.getByLabelText('节奏')).toBeInTheDocument(); // cadence select
  });
});
