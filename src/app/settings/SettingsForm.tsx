'use client';

import { useActionState } from 'react';
import { updateSettingsAction, type ActionState } from '@/app/actions';

const DAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export function SettingsForm({
  dailyCheckHour,
  reviewDayOfWeek,
}: {
  dailyCheckHour: number;
  reviewDayOfWeek: number;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    updateSettingsAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="dailyCheckHour" className="text-sm font-medium">
          每日检查时间
        </label>
        <p className="mb-1 text-xs text-neutral-500">到点后未完成的待办/打卡会生成提醒通知。</p>
        <select
          id="dailyCheckHour"
          name="dailyCheckHour"
          defaultValue={String(dailyCheckHour)}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
        >
          {Array.from({ length: 24 }, (_, h) => (
            <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="reviewDayOfWeek" className="text-sm font-medium">
          周回顾触发日
        </label>
        <p className="mb-1 text-xs text-neutral-500">该日起若本周回顾未写，将持续提醒直到补做。</p>
        <select
          id="reviewDayOfWeek"
          name="reviewDayOfWeek"
          defaultValue={String(reviewDayOfWeek)}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
        >
          {DAYS.map((label, i) => (
            <option key={i} value={i}>{label}</option>
          ))}
        </select>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50 hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
      >
        {pending ? '保存中…' : '保存设置'}
      </button>
    </form>
  );
}
