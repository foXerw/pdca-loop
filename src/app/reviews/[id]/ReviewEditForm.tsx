'use client';

import { useActionState } from 'react';
import { updateReviewAction, deleteReviewAction, type ActionState } from '@/app/actions';

export function ReviewEditForm({
  id,
  wentWell,
  blocked,
  adjustments,
}: {
  id: string;
  wentWell: string;
  blocked: string;
  adjustments: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    updateReviewAction,
    {},
  );
  const [, deleteAction, deletePending] = useActionState<ActionState, FormData>(
    deleteReviewAction,
    {},
  );

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="id" value={id} />
        <div>
          <label htmlFor="wentWell" className="text-sm font-medium">顺利的地方</label>
          <textarea
            id="wentWell"
            name="wentWell"
            defaultValue={wentWell}
            rows={3}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700"
          />
        </div>
        <div>
          <label htmlFor="blocked" className="text-sm font-medium">卡住的地方</label>
          <textarea
            id="blocked"
            name="blocked"
            defaultValue={blocked}
            rows={3}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700"
          />
        </div>
        <div>
          <label htmlFor="adjustments" className="text-sm font-medium">下期调整</label>
          <textarea
            id="adjustments"
            name="adjustments"
            defaultValue={adjustments}
            rows={3}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700"
          />
        </div>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50 hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
        >
          {pending ? '保存中…' : '保存'}
        </button>
      </form>

      <form action={deleteAction}>
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          disabled={deletePending}
          className="text-sm text-neutral-400 hover:text-red-600 disabled:opacity-50"
        >
          删除回顾
        </button>
      </form>
    </div>
  );
}
