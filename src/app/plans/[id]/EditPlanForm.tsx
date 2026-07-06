'use client';

import { useActionState } from 'react';
import { updatePlanAction, type ActionState } from '@/app/actions';
import type { Plan } from '@prisma/client';

function toDateInput(d: Date | null | undefined): string {
  if (!d) return '';
  return d.toISOString().slice(0, 10);
}

export function EditPlanForm({ plan }: { plan: Plan }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    updatePlanAction,
    {},
  );
  const isDeadline = plan.type === 'deadline';

  return (
    <details className="rounded-md border border-neutral-200 dark:border-neutral-800">
      <summary className="cursor-pointer px-3 py-2 text-sm">编辑计划</summary>
      <form action={formAction} className="space-y-3 p-3">
        <input type="hidden" name="id" value={plan.id} />
        <div>
          <label htmlFor={`edit-title-${plan.id}`} className="text-sm font-medium">
            标题
          </label>
          <input
            id={`edit-title-${plan.id}`}
            name="title"
            defaultValue={plan.title}
            className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
          />
        </div>
        <div>
          <label htmlFor={`edit-desc-${plan.id}`} className="text-sm font-medium">
            描述
          </label>
          <textarea
            id={`edit-desc-${plan.id}`}
            name="description"
            defaultValue={plan.description}
            rows={2}
            className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
          />
        </div>
        {isDeadline && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`edit-value-${plan.id}`} className="text-sm font-medium">
                目标值
              </label>
              <input
                id={`edit-value-${plan.id}`}
                name="targetValue"
                type="number"
                defaultValue={plan.targetValue ?? ''}
                className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
              />
            </div>
            <div>
              <label htmlFor={`edit-unit-${plan.id}`} className="text-sm font-medium">
                单位
              </label>
              <input
                id={`edit-unit-${plan.id}`}
                name="targetUnit"
                defaultValue={plan.targetUnit ?? ''}
                className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
              />
            </div>
            <div className="col-span-2">
              <label htmlFor={`edit-due-${plan.id}`} className="text-sm font-medium">
                截止日期
              </label>
              <input
                id={`edit-due-${plan.id}`}
                name="dueAt"
                type="date"
                defaultValue={toDateInput(plan.dueAt)}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
              />
            </div>
          </div>
        )}
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-4 py-1.5 text-sm text-white disabled:opacity-50 hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
        >
          {pending ? '保存中…' : '保存'}
        </button>
      </form>
    </details>
  );
}
