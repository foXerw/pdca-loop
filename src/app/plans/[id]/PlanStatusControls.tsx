'use client';

import { useActionState } from 'react';
import { setPlanStatusAction, type ActionState } from '@/app/actions';

const ACTIONS: { status: string; label: string; show: (s: string) => boolean }[] = [
  { status: 'paused', label: '暂停', show: (s) => s === 'active' },
  { status: 'active', label: '恢复', show: (s) => s === 'paused' },
  { status: 'done', label: '标为完成', show: (s) => s !== 'done' && s !== 'archived' },
  { status: 'archived', label: '归档', show: (s) => s !== 'archived' },
];

export function PlanStatusControls({ id, status }: { id: string; status: string }) {
  const [, formAction, pending] = useActionState<ActionState, FormData>(
    setPlanStatusAction,
    {},
  );
  const visible = ACTIONS.filter((a) => a.show(status));

  if (visible.length === 0) {
    return <p className="text-sm text-neutral-500">该计划已归档，无可用操作。</p>;
  }

  return (
    <form action={formAction} className="flex flex-wrap gap-2">
      <input type="hidden" name="id" value={id} />
      {visible.map((a) => (
        <button
          key={a.status}
          type="submit"
          name="status"
          value={a.status}
          disabled={pending}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm disabled:opacity-50 hover:border-neutral-500 dark:border-neutral-700 dark:hover:border-neutral-500"
        >
          {a.label}
        </button>
      ))}
    </form>
  );
}
