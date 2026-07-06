import Link from 'next/link';
import { listActivePlansOverview } from '@/lib/server/actions/plan';
import { listTodaysTasks } from '@/lib/server/actions/task';
import { PlanCard } from './ui/PlanCard';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [plans, todaysTasks] = await Promise.all([
    listActivePlansOverview(),
    listTodaysTasks(),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">仪表盘</h1>
        <Link
          href="/plans/new"
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
        >
          + 新建计划
        </Link>
      </div>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-medium text-neutral-500">今日待办</h2>
        {todaysTasks.length === 0 ? (
          <p className="text-sm text-neutral-500">今天没有待办或循环任务 🎉</p>
        ) : (
          <ul className="space-y-1">
            {todaysTasks.map((t) => (
              <li key={t.id} className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800">
                <span>
                  {t.recurrence !== 'none' ? '🔁 ' : ''}
                  {t.title}
                </span>
                <Link
                  href={`/plans/${t.plan.id}`}
                  className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
                >
                  {t.plan.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-medium text-neutral-500">活跃计划</h2>
        {plans.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700">
            还没有计划。
            <Link href="/plans/new" className="ml-1 underline">新建第一个</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {plans.map((p) => (
              <PlanCard key={p.id} plan={p} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
