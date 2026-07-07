'use client';

import { useActionState } from 'react';
import { createCheckInAction, type ActionState } from '@/app/actions';

const MOODS = ['😊', '😐', '😣', '🚀'];

export function CheckInForm({ planId, isQuantitative }: { planId: string; isQuantitative: boolean }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createCheckInAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <input type="hidden" name="planId" value={planId} />

      {isQuantitative && (
        <div>
          <label htmlFor="value" className="text-sm font-medium">
            数值（可选）
          </label>
          <input
            id="value"
            name="value"
            type="number"
            inputMode="decimal"
            placeholder="本次进展数值"
            className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
          />
        </div>
      )}

      <div>
        <label htmlFor="note" className="text-sm font-medium">
          备注
        </label>
        <textarea
          id="note"
          name="note"
          rows={2}
          placeholder="今天做了什么 / 感受"
          className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
        />
      </div>

      <div>
        <span className="text-sm font-medium">心情</span>
        <div className="mt-1 flex gap-2">
          {MOODS.map((m) => (
            <label key={m} className="cursor-pointer text-xl">
              <input type="radio" name="mood" value={m} className="sr-only peer" />
              <span className="opacity-40 peer-checked:opacity-100">{m}</span>
            </label>
          ))}
        </div>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-4 py-1.5 text-sm text-white disabled:opacity-50 hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
      >
        {pending ? '记录中…' : '打卡'}
      </button>
    </form>
  );
}
