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
import {
  createMilestone,
  updateMilestone,
  setMilestoneStatus,
  deleteMilestone,
  type MilestoneStatus,
} from '@/lib/server/actions/milestone';
import {
  createReview,
  updateReview,
  deleteReview,
} from '@/lib/server/actions/review';
import type { ReviewPeriod } from '@/lib/rules/review';
import {
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/server/actions/notification';
import { updateUserSettings } from '@/lib/server/actions/settings';
import {
  savePushSubscription,
  removePushSubscription,
  dispatchPush,
  type PushSubscriptionInput,
} from '@/lib/server/actions/push';
import { getCurrentUserId } from '@/lib/server/context';

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

export async function createMilestoneAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const planId = str(fd, 'planId');
  const title = str(fd, 'title');
  if (!planId) return { error: '缺少计划 id' };
  if (!title) return { error: '请填写里程碑标题' };
  const d = str(fd, 'targetDate');
  if (!d) return { error: '请选择目标日期' };
  const targetDate = new Date(d);
  let targetValue: number | undefined;
  const tv = str(fd, 'targetValue');
  if (tv) {
    targetValue = Number(tv);
    if (Number.isNaN(targetValue)) return { error: '目标值需为数字' };
  }
  await createMilestone({ planId, title, targetDate, targetValue });
  revalidatePlan(planId);
  return {};
}

export async function updateMilestoneAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const id = str(fd, 'id');
  if (!id) return { error: '缺少里程碑 id' };
  const patch: Parameters<typeof updateMilestone>[1] = {};
  const title = str(fd, 'title');
  if (title) patch.title = title;
  const d = str(fd, 'targetDate');
  if (d) patch.targetDate = new Date(d);
  const tv = str(fd, 'targetValue');
  if (tv) {
    const n = Number(tv);
    if (Number.isNaN(n)) return { error: '目标值需为数字' };
    patch.targetValue = n;
  }
  const updated = await updateMilestone(id, patch);
  revalidatePlan(updated.planId);
  return {};
}

export async function setMilestoneStatusAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const id = str(fd, 'id');
  const status = str(fd, 'status') as MilestoneStatus;
  if (!id) return { error: '缺少里程碑 id' };
  if (!['todo', 'done'].includes(status)) return { error: '状态无效' };
  const updated = await setMilestoneStatus(id, status);
  revalidatePlan(updated.planId);
  return {};
}

export async function deleteMilestoneAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const id = str(fd, 'id');
  const planId = str(fd, 'planId');
  if (!id) return { error: '缺少里程碑 id' };
  await deleteMilestone(id);
  if (planId) revalidatePlan(planId);
  return {};
}

export async function createReviewAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const period = str(fd, 'period') as ReviewPeriod;
  if (!['week', 'month', 'quarter', 'custom'].includes(period)) {
    return { error: '周期无效' };
  }
  const planId = str(fd, 'planId') || undefined;
  const rangeStartStr = str(fd, 'rangeStart');
  const rangeEndStr = str(fd, 'rangeEnd');
  if (!rangeStartStr || !rangeEndStr) return { error: '缺少周期范围' };
  const rangeStart = new Date(rangeStartStr);
  const rangeEnd = new Date(rangeEndStr);
  if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime())) {
    return { error: '周期范围无效' };
  }
  const review = await createReview({
    planId,
    period,
    wentWell: str(fd, 'wentWell'),
    blocked: str(fd, 'blocked'),
    adjustments: str(fd, 'adjustments'),
    rangeStart,
    rangeEnd,
  });
  redirect(`/reviews/${review.id}`);
}

export async function updateReviewAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const id = str(fd, 'id');
  if (!id) return { error: '缺少回顾 id' };
  await updateReview(id, {
    wentWell: str(fd, 'wentWell'),
    blocked: str(fd, 'blocked'),
    adjustments: str(fd, 'adjustments'),
  });
  revalidatePath(`/reviews/${id}`);
  revalidatePath('/reviews');
  revalidatePath('/');
  return {};
}

export async function deleteReviewAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const id = str(fd, 'id');
  if (!id) return { error: '缺少回顾 id' };
  await deleteReview(id);
  revalidatePath('/reviews');
  revalidatePath('/');
  return {};
}

export async function markNotificationReadAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const id = str(fd, 'id');
  if (!id) return { error: '缺少通知 id' };
  await markNotificationRead(id);
  revalidatePath('/');
  revalidatePath('/notifications');
  return {};
}

export async function markAllNotificationsReadAction(
  _prev: ActionState,
  _fd: FormData,
): Promise<ActionState> {
  await markAllNotificationsRead();
  revalidatePath('/');
  revalidatePath('/notifications');
  return {};
}

export async function updateSettingsAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const hourStr = str(fd, 'dailyCheckHour');
  const dayStr = str(fd, 'reviewDayOfWeek');
  const patch: { dailyCheckHour?: number; reviewDayOfWeek?: number } = {};
  if (hourStr) {
    const h = Number(hourStr);
    if (Number.isNaN(h) || h < 0 || h > 23) return { error: '每日检查时间需为 0-23' };
    patch.dailyCheckHour = h;
  }
  if (dayStr) {
    const d = Number(dayStr);
    if (Number.isNaN(d) || d < 0 || d > 6) return { error: '回顾触发日需为 0-6' };
    patch.reviewDayOfWeek = d;
  }
  await updateUserSettings(patch);
  revalidatePath('/');
  return {};
}

// —— Web Push（客户端 onClick 调用，非表单 action）——

export async function subscribePushAction(
  sub: PushSubscriptionInput,
): Promise<{ success: true }> {
  await savePushSubscription(sub);
  return { success: true };
}

export async function unsubscribePushAction(
  endpoint: string,
): Promise<{ success: true }> {
  await removePushSubscription(endpoint);
  return { success: true };
}

export async function sendTestPushAction(): Promise<{ sent: number }> {
  const userId = await getCurrentUserId();
  const r = await dispatchPush(userId, {
    title: '测试通知',
    body: 'pdca-loop 推送已启用 ✅',
    href: '/',
  });
  return { sent: r.sent };
}
