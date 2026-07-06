import 'server-only';
import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/server/context';
import { touch, ActionError } from './_shared';
import type { Notification } from '@prisma/client';

// 未读优先（SQLite 中 NULL 在 ASC 时排前），再按时间倒序
export async function listNotifications(): Promise<Notification[]> {
  const userId = await getCurrentUserId();
  return prisma.notification.findMany({
    where: { userId },
    orderBy: [{ readAt: 'asc' }, { createdAt: 'desc' }],
  });
}

export async function unreadNotificationCount(): Promise<number> {
  const userId = await getCurrentUserId();
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function markNotificationRead(id: string): Promise<Notification> {
  const userId = await getCurrentUserId();
  const res = await prisma.notification.updateMany({
    where: { id, userId, readAt: null },
    data: { readAt: new Date() },
  });
  if (res.count === 0) throw new ActionError('not_found', 'notification not found or already read');
  const updated = await prisma.notification.findUnique({ where: { id } });
  if (!updated) throw new ActionError('not_found', 'notification not found');
  touch();
  return updated;
}

export async function markAllNotificationsRead(): Promise<number> {
  const userId = await getCurrentUserId();
  const res = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  touch();
  return res.count;
}
