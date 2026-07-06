'use client';

import { useActionState } from 'react';
import { createMilestoneAction, type ActionState } from '@/app/actions';
import { MilestoneRow, type MilestoneWithStatus } from './MilestoneRow';

export function MilestoneList({
  planId,
  milestones,
}: {
  planId: string;
  milestones: MilestoneWithStatus[];
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createMilestoneAction,
    {},
  );

  return (
    <div className="space-y-2">
      {milestones.length === 0 ? (
        <p className="text-sm text-neutral-500">还没有里程碑。在下面添加阶段节点。</p>
      ) : (
        <ol className="space-y-1">
          {milestones.map((m) => (
            <MilestoneRow key={m.id} milestone={m} planId={planId} />
          ))}
        </ol>
      )}

      <form action={formAction} className="flex flex-wrap items-center gap-2 pt-2">
        <input type="hidden" name="planId" value={planId} />
        <input
          name="title"
          required
          placeholder="里程碑标题"
          className="flex-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
        />
        <input
          type="date"
          name="targetDate"
          required
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700"
        />
        <input
          type="number"
          name="targetValue"
          inputMode="decimal"
          placeholder="目标值（可选）"
          className="w-36 rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white disabled:opacity-50 hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
        >
          添加里程碑
        </button>
      </form>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </div>
  );
}
