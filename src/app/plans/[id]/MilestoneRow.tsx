'use client';

import { useActionState } from 'react';
import {
  setMilestoneStatusAction,
  deleteMilestoneAction,
  type ActionState,
} from '@/app/actions';
import type { Milestone } from '@prisma/client';

export type MilestoneWithStatus = Milestone & {
  derived: 'todo' | 'done' | 'overdue';
};

const BADGE: Record<MilestoneWithStatus['derived'], string> = {
  todo: '待办',
  done: '已完成',
  overdue: '已逾期',
};

const BADGE_CLASS: Record<MilestoneWithStatus['derived'], string> = {
  todo: 'text-neutral-500',
  done: 'text-emerald-600 dark:text-emerald-400',
  overdue: 'text-red-600 dark:text-red-400',
};

export function MilestoneRow({
  milestone,
  planId,
}: {
  milestone: MilestoneWithStatus;
  planId: string;
}) {
  const [, statusAction, statusPending] = useActionState<ActionState, FormData>(
    setMilestoneStatusAction,
    {},
  );
  const [, deleteAction, deletePending] = useActionState<ActionState, FormData>(
    deleteMilestoneAction,
    {},
  );
  const m = milestone;

  return (
    <li className="flex items-center justify-between gap-2 rounded-md border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className={`text-xs ${BADGE_CLASS[m.derived]}`}>{BADGE[m.derived]}</span>
        <span className={m.status === 'done' ? 'line-through text-neutral-400' : ''}>
          {m.title}
        </span>
        <span className="text-xs text-neutral-500">
          目标 {m.targetDate.toLocaleDateString('zh-CN')}
        </span>
        {m.targetValue != null && (
          <span className="text-xs tabular-nums text-neutral-500">
            · {m.targetValue.toLocaleString()}
          </span>
        )}
      </div>
      <div className="flex shrink-0 gap-2">
        <form action={statusAction}>
          <input type="hidden" name="id" value={m.id} />
          <button
            type="submit"
            name="status"
            value={m.status === 'done' ? 'todo' : 'done'}
            disabled={statusPending}
            className="text-xs text-neutral-500 hover:text-neutral-900 disabled:opacity-50 dark:hover:text-neutral-100"
          >
            {m.status === 'done' ? '撤销' : '完成'}
          </button>
        </form>
        <form action={deleteAction}>
          <input type="hidden" name="id" value={m.id} />
          <input type="hidden" name="planId" value={planId} />
          <button
            type="submit"
            disabled={deletePending}
            className="text-xs text-neutral-400 hover:text-red-600 disabled:opacity-50"
          >
            删除
          </button>
        </form>
      </div>
    </li>
  );
}
