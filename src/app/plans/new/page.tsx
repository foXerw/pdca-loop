import Link from 'next/link';
import { PlanForm } from './PlanForm';

export default function NewPlanPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <Link
        href="/"
        className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
      >
        ← 返回
      </Link>
      <h1 className="mt-2 text-lg font-semibold">新建计划</h1>
      <div className="mt-4">
        <PlanForm />
      </div>
    </main>
  );
}
