import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getReview } from '@/lib/server/actions/review';
import { ReviewEditForm } from './ReviewEditForm';

export const dynamic = 'force-dynamic';

const PERIOD_LABEL: Record<string, string> = {
  week: '周回顾',
  month: '月回顾',
  quarter: '季回顾',
  custom: '自定义回顾',
};

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const review = await getReview(id);
  if (!review) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <Link
        href="/reviews"
        className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
      >
        ← 回顾列表
      </Link>

      <header className="mt-2">
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <span>{PERIOD_LABEL[review.period] ?? review.period}</span>
          <span>·</span>
          <span>{review.rangeStart.toLocaleDateString('zh-CN')} ~ {review.rangeEnd.toLocaleDateString('zh-CN')}</span>
        </div>
        <h1 className="mt-1 text-lg font-semibold">
          {review.plan ? review.plan.title : '全部计划'} 回顾
        </h1>
      </header>

      <div className="mt-4">
        <ReviewEditForm
          id={review.id}
          wentWell={review.wentWell}
          blocked={review.blocked}
          adjustments={review.adjustments}
        />
      </div>
    </main>
  );
}
