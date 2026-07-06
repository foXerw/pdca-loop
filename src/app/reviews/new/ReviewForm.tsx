'use client';

import { useActionState } from 'react';
import { createReviewAction, type ActionState } from '@/app/actions';
import type { ReviewStats, ReviewPeriod } from '@/lib/rules/review';

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export function ReviewForm({
  period,
  planId,
  rangeStart,
  rangeEnd,
  stats,
}: {
  period: ReviewPeriod;
  planId?: string;
  rangeStart: Date;
  rangeEnd: Date;
  stats: ReviewStats;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createReviewAction,
    {},
  );

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-1 font-medium">本期客观统计（预填）</div>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-neutral-600 dark:text-neutral-400">
          <li>打卡次数：{stats.checkInCount}</li>
          <li>任务完成：{stats.taskDone}/{stats.taskTotal}（{pct(stats.completionRate)}）</li>
          <li>期初进度：{stats.progressBefore.toLocaleString()}</li>
          <li>进度变化：{stats.progressDelta >= 0 ? '+' : ''}{stats.progressDelta.toLocaleString()}</li>
        </ul>
      </div>

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="period" value={period} />
        {planId && <input type="hidden" name="planId" value={planId} />}
        <input type="hidden" name="rangeStart" value={rangeStart.toISOString()} />
        <input type="hidden" name="rangeEnd" value={rangeEnd.toISOString()} />

        <div>
          <label htmlFor="wentWell" className="text-sm font-medium">顺利的地方</label>
          <textarea
            id="wentWell"
            name="wentWell"
            rows={3}
            placeholder="本期哪些事推进顺利？"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700"
          />
        </div>
        <div>
          <label htmlFor="blocked" className="text-sm font-medium">卡住的地方</label>
          <textarea
            id="blocked"
            name="blocked"
            rows={3}
            placeholder="哪些事卡住了？为什么？"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700"
          />
        </div>
        <div>
          <label htmlFor="adjustments" className="text-sm font-medium">下期调整</label>
          <textarea
            id="adjustments"
            name="adjustments"
            rows={3}
            placeholder="下个周期打算怎么调整？"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700"
          />
        </div>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50 hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
        >
          {pending ? '保存中…' : '保存回顾'}
        </button>
      </form>
    </div>
  );
}
