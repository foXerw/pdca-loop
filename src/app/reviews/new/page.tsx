import Link from 'next/link';
import { listPlans } from '@/lib/server/actions/plan';
import { getReviewPrefill } from '@/lib/server/actions/review';
import type { ReviewPeriod } from '@/lib/rules/review';
import { ReviewForm } from './ReviewForm';

export const dynamic = 'force-dynamic';

const PERIODS: { value: ReviewPeriod; label: string }[] = [
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' },
  { value: 'quarter', label: '本季' },
];

export default async function NewReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; planId?: string }>;
}) {
  const sp = await searchParams;
  const period = (sp.period as ReviewPeriod) || 'week';
  const planId = sp.planId || undefined;

  const [plans, prefill] = await Promise.all([
    listPlans(),
    getReviewPrefill(period, planId),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <Link
        href="/reviews"
        className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
      >
        ← 回顾列表
      </Link>
      <h1 className="mt-2 text-lg font-semibold">新建回顾</h1>

      {/* 选择周期/范围：GET 表单，提交后刷新预填 */}
      <form method="get" className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="period" className="text-sm font-medium">周期</label>
          <select
            id="period"
            name="period"
            defaultValue={period}
            className="ml-2 rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700"
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="planId" className="text-sm font-medium">范围</label>
          <select
            id="planId"
            name="planId"
            defaultValue={planId ?? ''}
            className="ml-2 rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700"
          >
            <option value="">全部计划</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:border-neutral-500 dark:border-neutral-700"
        >
          重新预填
        </button>
      </form>

      <p className="mt-2 text-xs text-neutral-500">
        范围：{prefill.planTitle ?? '全部计划'} · {prefill.rangeStart.toLocaleDateString('zh-CN')} ~ {prefill.rangeEnd.toLocaleDateString('zh-CN')}
      </p>

      <div className="mt-4">
        <ReviewForm
          period={period}
          planId={planId}
          rangeStart={prefill.rangeStart}
          rangeEnd={prefill.rangeEnd}
          stats={prefill.stats}
        />
      </div>
    </main>
  );
}
