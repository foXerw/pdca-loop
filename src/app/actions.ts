'use server';

// 表单适配层：FormData → 类型化 server action → revalidate/redirect。
// 业务逻辑保留在 src/lib/server/actions/*（可被集成测试复用），本文件只做解析与副作用。

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  createPlan,
  updatePlan,
  setPlanStatus,
  type PlanType,
  type PlanStatus,
} from '@/lib/server/actions/plan';
import { createTask, completeTask, type Recurrence } from '@/lib/server/actions/task';
import { createCheckIn } from '@/lib/server/actions/checkin';

export type ActionState = { error?: string };

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === 'string' ? v.trim() : '';
}

function revalidatePlan(planId: string): void {
  revalidatePath('/');
  revalidatePath(`/plans/${planId}`);
}

export async function createPlanAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const title = str(fd, 'title');
  if (!title) return { error: '请填写标题' };
  const type = str(fd, 'type') as PlanType;
  if (type !== 'deadline' && type !== 'ongoing') return { error: '类型无效' };

  const description = str(fd, 'description');
  let targetValue: number | undefined;
  let targetUnit: string | undefined;
  let dueAt: Date | undefined;
  if (type === 'deadline') {
    const tv = str(fd, 'targetValue');
    if (tv) {
      targetValue = Number(tv);
      if (Number.isNaN(targetValue)) return { error: '目标值需为数字' };
    }
    targetUnit = str(fd, 'targetUnit') || undefined;
    const d = str(fd, 'dueAt');
    dueAt = d ? new Date(d) : undefined;
  }

  const plan = await createPlan({ title, type, description, targetValue, targetUnit, dueAt });
  redirect(`/plans/${plan.id}`);
}

export async function updatePlanAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const id = str(fd, 'id');
  if (!id) return { error: '缺少计划 id' };
  const title = str(fd, 'title');
  const description = str(fd, 'description');
  const patch: Parameters<typeof updatePlan>[1] = {};
  if (title) patch.title = title;
  if (description !== '') patch.description = description;
  const tv = str(fd, 'targetValue');
  if (tv) {
    const n = Number(tv);
    if (Number.isNaN(n)) return { error: '目标值需为数字' };
    patch.targetValue = n;
  }
  const unit = str(fd, 'targetUnit');
  if (unit) patch.targetUnit = unit;
  const d = str(fd, 'dueAt');
  patch.dueAt = d ? new Date(d) : null;

  await updatePlan(id, patch);
  revalidatePlan(id);
  return {};
}

export async function setPlanStatusAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const id = str(fd, 'id');
  const status = str(fd, 'status') as PlanStatus;
  if (!id) return { error: '缺少计划 id' };
  if (!['active', 'paused', 'done', 'archived'].includes(status)) {
    return { error: '状态无效' };
  }
  await setPlanStatus(id, status);
  revalidatePlan(id);
  return {};
}

export async function createTaskAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const planId = str(fd, 'planId');
  const title = str(fd, 'title');
  if (!planId) return { error: '缺少计划 id' };
  if (!title) return { error: '请填写任务标题' };
  const recurrence = (str(fd, 'recurrence') || 'none') as Recurrence;
  const d = str(fd, 'dueAt');
  await createTask({ planId, title, recurrence, dueAt: d ? new Date(d) : undefined });
  revalidatePlan(planId);
  return {};
}

export async function toggleTaskAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const id = str(fd, 'id');
  if (!id) return { error: '缺少任务 id' };
  const task = await completeTask(id);
  revalidatePlan(task.planId);
  return {};
}

export async function createCheckInAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const planId = str(fd, 'planId') || undefined;
  const taskId = str(fd, 'taskId') || undefined;
  if (!planId && !taskId) return { error: '打卡需要关联计划或任务' };
  const note = str(fd, 'note');
  const mood = str(fd, 'mood') || undefined;
  let value: number | undefined;
  const tv = str(fd, 'value');
  if (tv) {
    value = Number(tv);
    if (Number.isNaN(value)) return { error: '数值需为数字' };
  }
  await createCheckIn({ planId, taskId, value, note, mood });
  if (planId) revalidatePlan(planId);
  else revalidatePath('/');
  return {};
}
