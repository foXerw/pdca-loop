import Link from 'next/link';
import { listNotifications } from '@/lib/server/actions/notification';
import { MarkReadButton } from './MarkReadButton';

export const dynamic = 'force-dynamic';

function formatTime(d: Date): string {
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

type Notif = {
  id: string;
  type: string;
  payload: string;
  readAt: Date | null;
  createdAt: Date;
};

function parse(n: Notif): { title: string; body: string; href: string } {
  try {
    return JSON.parse(n.payload) as { title: string; body: string; href: string };
  } catch {
    return { title: n.type, body: '', href: '/' };
  }
}

export default async function NotificationsPage() {
  const notifs = await listNotifications();

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-lg font-semibold">通知</h1>

      {notifs.length === 0 ? (
        <p className="mt-6 text-sm text-neutral-500">暂无通知。到每日检查时间后，未完成的待办/打卡/回顾会出现在这里。</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {notifs.map((n) => {
            const p = parse(n);
            const read = !!n.readAt;
            return (
              <li
                key={n.id}
                className={
                  'flex items-center justify-between gap-2 rounded-md border border-neutral-200 px-3 py-2 dark:border-neutral-800 ' +
                  (read ? 'opacity-50' : '')
                }
              >
                <div className="min-w-0">
                  <Link href={p.href} className="block">
                    <div className="text-sm font-medium">{p.title}</div>
                    <div className="truncate text-xs text-neutral-500">{p.body}</div>
                  </Link>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-xs text-neutral-400">{formatTime(n.createdAt)}</span>
                  {!read && <MarkReadButton id={n.id} />}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
