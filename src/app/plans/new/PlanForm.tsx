'use client';

import { useActionState, useState } from 'react';
import { createPlanAction, type ActionState } from '@/app/actions';

export function PlanForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createPlanAction,
    {},
  );
  const [type, setType] = useState<'deadline' | 'ongoing'>('deadline');

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="title" className="text-sm font-medium">
          标题
        </label>
        <input
          id="title"
          name="title"
          required
          placeholder="例如：一亿 token / 学画画"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700"
        />
      </div>

      <div className="space-y-1">
        <span className="text-sm font-medium">类型</span>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="type"
              value="deadline"
              checked={type === 'deadline'}
              onChange={() => setType('deadline')}
            />
            终点型（有目标值/截止日）
          </label>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="type"
              value="ongoing"
              checked={type === 'ongoing'}
              onChange={() => setType('ongoing')}
            />
            持续型（每日打卡）
          </label>
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="description" className="text-sm font-medium">
          描述
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          placeholder="这个计划为什么重要？"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700"
        />
      </div>

      {type === 'deadline' && (
        <div className="space-y-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="targetValue" className="text-sm font-medium">
                目标值
              </label>
              <input
                id="targetValue"
                name="targetValue"
                type="number"
                inputMode="decimal"
                placeholder="100000000"
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700"
              />
            </div>
            <div>
              <label htmlFor="targetUnit" className="text-sm font-medium">
                单位
              </label>
              <input
                id="targetUnit"
                name="targetUnit"
                placeholder="tokens"
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700"
              />
            </div>
          </div>
          <div>
            <label htmlFor="dueAt" className="text-sm font-medium">
              截止日期
            </label>
            <input
              id="dueAt"
              name="dueAt"
              type="date"
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700"
            />
          </div>
        </div>
      )}

      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50 hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
      >
        {pending ? '创建中…' : '创建计划'}
      </button>
    </form>
  );
}
