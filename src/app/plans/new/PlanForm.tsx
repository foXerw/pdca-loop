'use client';

import { useActionState, useState } from 'react';
import { createPlanAction, type ActionState } from '@/app/actions';

type Template = 'deadline-quant' | 'milestone' | 'daily' | 'weekly' | 'custom';

const inputCls = 'w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700';

export function PlanForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createPlanAction,
    {},
  );
  const [tpl, setTpl] = useState<Template>('deadline-quant');
  const [cadence, setCadence] = useState<'none' | 'daily' | 'weekly'>('none');

  const showTarget = tpl === 'deadline-quant' || tpl === 'custom';
  const showDue = tpl === 'deadline-quant' || tpl === 'milestone' || tpl === 'custom';
  const showCadenceTimes = tpl === 'weekly' || (tpl === 'custom' && cadence === 'weekly');
  const showCadenceSelect = tpl === 'custom';

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="template" value={tpl} />

      <div className="space-y-1">
        <label htmlFor="title" className="text-sm font-medium">标题</label>
        <input id="title" name="title" required placeholder="给计划起个名字" className={inputCls} />
      </div>

      <div className="space-y-1">
        <span className="text-sm font-medium">模板</span>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {([
            ['deadline-quant', '终点·量化'],
            ['milestone', '终点·里程碑'],
            ['daily', '每日练习'],
            ['weekly', '每周练习'],
            ['custom', '自定义'],
          ] as const).map(([value, label]) => (
            <label key={value} className="flex items-center gap-1">
              <input
                type="radio"
                name="template-radio"
                value={value}
                checked={tpl === value}
                onChange={() => { setTpl(value); setCadence('none'); }}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="description" className="text-sm font-medium">描述</label>
        <textarea id="description" name="description" rows={2} placeholder="这个计划为什么重要？" className={inputCls} />
      </div>

      {showCadenceSelect && (
        <div className="space-y-1">
          <label htmlFor="cadence" className="text-sm font-medium">节奏</label>
          <select
            id="cadence"
            name="cadence"
            value={cadence}
            onChange={(e) => setCadence(e.target.value as 'none' | 'daily' | 'weekly')}
            className={inputCls}
          >
            <option value="none">无（一次性/里程碑驱动）</option>
            <option value="daily">每日</option>
            <option value="weekly">每周</option>
          </select>
        </div>
      )}

      {showCadenceTimes && (
        <div className="space-y-1">
          <label htmlFor="cadenceTimes" className="text-sm font-medium">每周次数</label>
          <input id="cadenceTimes" name="cadenceTimes" type="number" min={1} defaultValue={3} className={inputCls} />
        </div>
      )}

      {(showTarget || showDue) && (
        <div className="space-y-2">
          {showTarget && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="targetValue" className="text-sm font-medium">目标值</label>
                <input id="targetValue" name="targetValue" type="number" inputMode="decimal" placeholder="例如 100" className={inputCls} />
              </div>
              <div className="space-y-1">
                <label htmlFor="targetUnit" className="text-sm font-medium">单位</label>
                <input id="targetUnit" name="targetUnit" placeholder="次 / 篇 / 分钟…" className={inputCls} />
              </div>
            </div>
          )}
          {showDue && (
            <div className="space-y-1">
              <label htmlFor="dueAt" className="text-sm font-medium">截止日期</label>
              <input id="dueAt" name="dueAt" type="date" className={inputCls} />
            </div>
          )}
        </div>
      )}

      {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50 hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
      >
        {pending ? '创建中…' : '创建计划'}
      </button>
    </form>
  );
}
