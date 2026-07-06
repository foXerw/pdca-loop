'use client';

import { useActionState, useState } from 'react';
import { createTaskAction, toggleTaskAction, type ActionState } from '@/app/actions';
import type { Task } from '@prisma/client';

function TaskRow({ task }: { task: Task }) {
  const [, formAction, pending] = useActionState<ActionState, FormData>(toggleTaskAction, {});
  const done = task.status === 'done';
  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="id" value={task.id} />
      <button
        type="submit"
        disabled={pending}
        aria-label={done ? '标记为未完成' : '标记为已完成'}
        className={
          'flex h-5 w-5 items-center justify-center rounded-full border text-xs ' +
          (done
            ? 'border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900'
            : 'border-neutral-400 text-transparent hover:border-neutral-700 dark:border-neutral-600')
        }
      >
        ✓
      </button>
      <span className={done ? 'text-sm text-neutral-400 line-through' : 'text-sm'}>
        {task.recurrence !== 'none' ? '🔁 ' : ''}
        {task.title}
      </span>
    </form>
  );
}

export function TaskList({ planId, tasks }: { planId: string; tasks: Task[] }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createTaskAction, {});
  const [showRecurrence, setShowRecurrence] = useState(false);

  return (
    <div className="space-y-2">
      {tasks.length === 0 ? (
        <p className="text-sm text-neutral-500">还没有任务。在下面添加。</p>
      ) : (
        <ul className="space-y-1">
          {tasks.map((t) => (
            <li key={t.id}>
              <TaskRow task={t} />
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="flex flex-wrap items-center gap-2 pt-2">
        <input type="hidden" name="planId" value={planId} />
        <input
          name="title"
          required
          placeholder="新任务标题"
          className="flex-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
        />
        <label className="flex items-center gap-1 text-xs text-neutral-500">
          <input
            type="checkbox"
            checked={showRecurrence}
            onChange={(e) => setShowRecurrence(e.target.checked)}
          />
          循环
        </label>
        {showRecurrence && (
          <select name="recurrence" defaultValue="daily" className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700">
            <option value="daily">每天</option>
            <option value="weekly">每周</option>
            <option value="custom">自定义</option>
          </select>
        )}
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white disabled:opacity-50 hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
        >
          添加
        </button>
      </form>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </div>
  );
}
