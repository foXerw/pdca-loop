import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPlan } from '@/lib/server/actions/plan';
import { listTasksByPlan } from '@/lib/server/actions/task';
import { listCheckIns, getPlanProgress } from '@/lib/server/actions/checkin';
import { listMilestonesByPlan } from '@/lib/server/actions/milestone';
import { milestoneStatus, projectedFinishDate } from '@/lib/rules/progress';
import { planKind } from '@/lib/rules/kind';
import { ProgressBar } from '@/app/ui/ProgressBar';
import { TaskList } from './TaskList';
import { CheckInForm } from './CheckInForm';
import { PlanStatusControls } from './PlanStatusControls';
import { EditPlanForm } from './EditPlanForm';
import { MilestoneList } from './MilestoneList';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  active: '进行中',
  paused: '已暂停',
  done: '已完成',
  archived: '已归档',
};

function formatDateTime(d: Date): string {
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default async function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plan = await getPlan(id);
  if (!plan) notFound();

  const [tasks, checkIns, { progress, streak, thisPeriodCount }, milestones] = await Promise.all([
    listTasksByPlan(id),
    listCheckIns(id),
    getPlanProgress(id),
    listMilestonesByPlan(id),
  ]);

  const now = new Date();
  const milestonesWithStatus = milestones.map((m) => ({
    ...m,
    derived: milestoneStatus(m, progress, now),
  }));

  const kind = planKind(plan);
  const remaining = kind.isQuantitative && plan.targetValue ? Math.max(0, plan.targetValue - progress) : 0;
  const projected = kind.isQuantitative && plan.targetValue
    ? projectedFinishDate(progress, plan.targetValue, plan.startAt, now)
    : null;
  const showMilestones = kind.hasDeadline || milestones.length > 0;

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <Link
        href="/"
        className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
      >
        ← 仪表盘
      </Link>

      <header className="mt-2">
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <span>{kind.hasDeadline ? '终点型' : '持续型'}</span>
          <span>·</span>
          <span>{STATUS_LABEL[plan.status] ?? plan.status}</span>
        </div>
        <h1 className="mt-1 text-xl font-semibold">{plan.title}</h1>
        {plan.description && (
          <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600 dark:text-neutral-400">
            {plan.description}
          </p>
        )}
      </header>

      <section className="mt-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        {kind.isQuantitative ? (
          <div className="space-y-1">
            <ProgressBar value={progress} target={plan.targetValue} />
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-neutral-500">
              <span>
                {progress.toLocaleString()}{plan.targetUnit ? ` ${plan.targetUnit}` : ''}
                {' / '}{plan.targetValue?.toLocaleString() ?? '—'}{plan.targetUnit ? ` ${plan.targetUnit}` : ''}
              </span>
              <span>剩余 {remaining.toLocaleString()}{plan.targetUnit ? ` ${plan.targetUnit}` : ''}</span>
              {plan.dueAt && <span>截止 {plan.dueAt.toLocaleDateString('zh-CN')}</span>}
              {projected && <span>按当前速率预计 {projected.toLocaleDateString('zh-CN')} 达成</span>}
            </div>
          </div>
        ) : kind.isRecurring ? (
          <div className="flex items-center gap-4 text-sm">
            {kind.cadence === 'weekly' ? (
              <>
                <span>本周 {thisPeriodCount ?? 0}/{plan.cadenceTimes ?? 1} 次</span>
                <span className="text-neutral-500">连续 {streak.current} 周（最长 {streak.longest} 周）</span>
              </>
            ) : (
              <>
                <span>🔥 当前连续 {streak.current} 天</span>
                <span className="text-neutral-500">最长 {streak.longest} 天</span>
              </>
            )}
          </div>
        ) : (
          <p className="text-sm text-neutral-500">无量化目标，靠里程碑推进。</p>
        )}
      </section>

      {showMilestones && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-medium text-neutral-500">里程碑</h2>
          <MilestoneList planId={plan.id} milestones={milestonesWithStatus} />
        </section>
      )}

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-medium text-neutral-500">任务</h2>
        <TaskList planId={plan.id} tasks={tasks} />
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-medium text-neutral-500">打卡</h2>
        <CheckInForm planId={plan.id} isQuantitative={kind.isQuantitative} />
      </section>

      {checkIns.length > 0 && (
        <section className="mt-4">
          <h2 className="mb-2 text-sm font-medium text-neutral-500">最近打卡</h2>
          <ul className="space-y-1">
            {checkIns.slice(0, 10).map((c) => (
              <li key={c.id} className="rounded-md border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800">
                <div className="flex items-center justify-between">
                  <span>
                    {c.mood ? `${c.mood} ` : ''}
                    {c.value != null && <span className="tabular-nums">+{c.value} </span>}
                    {c.note || <span className="text-neutral-400">无备注</span>}
                  </span>
                  <span className="text-xs text-neutral-500">{formatDateTime(c.occurredAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <div>
          <h2 className="mb-2 text-sm font-medium text-neutral-500">调整</h2>
          <PlanStatusControls id={plan.id} status={plan.status} />
        </div>
        <div>
          <h2 className="mb-2 text-sm font-medium text-neutral-500">编辑</h2>
          <EditPlanForm plan={plan} />
        </div>
      </section>
    </main>
  );
}
