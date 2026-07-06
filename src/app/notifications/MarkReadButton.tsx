'use client';

import { useActionState } from 'react';
import { markNotificationReadAction, type ActionState } from '@/app/actions';

export function MarkReadButton({ id }: { id: string }) {
  const [, formAction, pending] = useActionState<ActionState, FormData>(
    markNotificationReadAction,
    {},
  );
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        className="text-xs text-neutral-400 hover:text-neutral-900 disabled:opacity-50 dark:hover:text-neutral-100"
      >
        标记已读
      </button>
    </form>
  );
}
