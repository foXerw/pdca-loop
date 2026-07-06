import Link from 'next/link';
import { listReviews } from '@/lib/server/actions/review';

export const dynamic = 'force-dynamic';

const PERIOD_LABEL: Record<string, string> = {
  week: '周',
  month: '月',
  quarter: '季',
  custom: '自定义',
};

export default async function ReviewsPage() {
  const reviews = await listReviews();

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">回顾</h1>
        <Link
          href="/reviews/new"
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
        >
          + 新建回顾
        </Link>
      </div>

      {reviews.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700">
          还没有回顾。
          <Link href="/reviews/new" className="ml-1 underline">写第一篇</Link>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {reviews.map((r) => (
            <li key={r.id}>
              <Link
                href={`/reviews/${r.id}`}
                className="block rounded-lg border border-neutral-200 p-4 transition-colors hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium">
                    {r.plan ? r.plan.title : '全部计划'}
                    <span className="ml-2 text-xs font-normal text-neutral-500">
                      {PERIOD_LABEL[r.period] ?? r.period}回顾
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-neutral-500">
                    {r.rangeStart.toLocaleDateString('zh-CN')} ~ {r.rangeEnd.toLocaleDateString('zh-CN')}
                  </span>
                </div>
                {r.wentWell && (
                  <p className="mt-1 line-clamp-1 text-sm text-neutral-600 dark:text-neutral-400">
                    顺：{r.wentWell}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
