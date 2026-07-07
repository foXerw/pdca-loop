import Link from 'next/link';
import type { PlanOverview } from '@/lib/server/actions/plan';
import { planKind } from '@/lib/rules/kind';
import { ProgressBar } from './ProgressBar';

function formatDate(d: Date): string {
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

const STATUS_LABEL: Record<string, string> = {
  active: '进行中',
  paused: '已暂停',
  done: '已完成',
  archived: '已归档',
};

export function PlanCard({ plan }: { plan: PlanOverview }) {
  const kind = planKind(plan);
  const unit = plan.targetUnit ? ` ${plan.targetUnit}` : '';
  return (
    <Link
      href={`/plans/${plan.id}`}
      className="block rounded-lg border border-neutral-200 p-4 transition-colors hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="truncate font-medium">{plan.title}</h3>
        <span className="shrink-0 text-xs text-neutral-500">
          {STATUS_LABEL[plan.status] ?? plan.status}
        </span>
      </div>

      <div className="mt-3 space-y-1">
        {kind.isQuantitative ? (
          <>
            <ProgressBar value={plan.progress} target={plan.targetValue} />
            <div className="flex justify-between text-xs text-neutral-500">
              <span>{plan.progress.toLocaleString()}{unit} / {plan.targetValue?.toLocaleString() ?? '—'}{unit}</span>
              {plan.dueAt && <span>截止 {formatDate(plan.dueAt)}</span>}
            </div>
            {kind.isRecurring && kind.cadence === 'weekly' && plan.thisPeriodCount != null && (
              <span className="text-xs text-neutral-500">本周 {plan.thisPeriodCount}/{plan.cadenceTimes ?? 1} 次</span>
            )}
          </>
        ) : kind.isRecurring ? (
          <div className="flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400">
            {kind.cadence === 'weekly' ? (
              <>
                <span>本周 {plan.thisPeriodCount ?? 0}/{plan.cadenceTimes ?? 1} 次</span>
                <span>连续 {plan.streak.current} 周</span>
              </>
            ) : (
              <>
                <span>🔥 连续 {plan.streak.current} 天</span>
                <span>最长 {plan.streak.longest} 天</span>
              </>
            )}
          </div>
        ) : (
          plan.dueAt && <span className="text-xs text-neutral-500">截止 {formatDate(plan.dueAt)}</span>
        )}
      </div>
    </Link>
  );
}
