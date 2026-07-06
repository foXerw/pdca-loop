'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { markAllNotificationsReadAction, type ActionState } from '@/app/actions';

export type NotificationBellItem = {
  id: string;
  title: string;
  body: string;
  href: string;
  read: boolean;
};

export function NotificationBell({
  count,
  items,
}: {
  count: number;
  items: NotificationBellItem[];
}) {
  const [, formAction, pending] = useActionState<ActionState, FormData>(
    markAllNotificationsReadAction,
    {},
  );
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="通知"
        className="relative text-lg leading-none"
      >
        <span aria-hidden>🔔</span>
        {count > 0 && (
          <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
            {count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-2 w-72 rounded-md border border-neutral-200 bg-white p-2 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
          {items.length === 0 ? (
            <p className="px-2 py-3 text-center text-sm text-neutral-500">没有通知</p>
          ) : (
            <ul className="space-y-1">
              {items.slice(0, 5).map((it) => (
                <li key={it.id}>
                  <Link
                    href={it.href}
                    onClick={() => setOpen(false)}
                    className={
                      'block rounded px-2 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 ' +
                      (it.read ? 'opacity-50' : '')
                    }
                  >
                    <div className="font-medium">{it.title}</div>
                    <div className="text-xs text-neutral-500">{it.body}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {count > 0 && (
            <form action={formAction} className="mt-2 border-t border-neutral-200 pt-2 dark:border-neutral-800">
              <button
                type="submit"
                disabled={pending}
                className="w-full rounded px-2 py-1 text-xs text-neutral-500 hover:text-neutral-900 disabled:opacity-50 dark:hover:text-neutral-100"
              >
                全部标记已读
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
