// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { PlanForm } from './PlanForm';

// 避免加载真正的 server action 模块（会触发 server-only / next/cache）。
vi.mock('@/app/actions', () => ({
  createPlanAction: vi.fn(),
}));

afterEach(cleanup);

describe('PlanForm', () => {
  it('shows target fields when type is deadline (default)', () => {
    render(<PlanForm />);
    expect(screen.getByPlaceholderText('100000000')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('tokens')).toBeInTheDocument();
  });

  it('hides target fields when ongoing is selected', () => {
    render(<PlanForm />);
    fireEvent.click(screen.getByLabelText(/持续型/));
    expect(screen.queryByPlaceholderText('100000000')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('tokens')).not.toBeInTheDocument();
  });

  it('shows target fields again when switching back to deadline', () => {
    render(<PlanForm />);
    fireEvent.click(screen.getByLabelText(/持续型/));
    fireEvent.click(screen.getByLabelText(/终点型/));
    expect(screen.getByPlaceholderText('100000000')).toBeInTheDocument();
  });
});
