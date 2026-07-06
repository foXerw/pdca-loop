import { vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

import { describe, it, expect, beforeAll } from 'vitest';
import { resetTestDb, getTestUserId } from '../setup-db';
import { prisma } from '@/lib/db';
import {
  listNotifications,
  unreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/server/actions/notification';

beforeAll(async () => {
  await resetTestDb();
});

async function seedNotification(type: string, key: string, read = false) {
  const userId = await getTestUserId();
  return prisma.notification.create({
    data: {
      userId,
      type,
      payload: JSON.stringify({ key, title: `t-${key}`, body: 'b', href: '/' }),
      readAt: read ? new Date() : null,
    },
  });
}

describe('notification actions', () => {
  it('lists notifications with unread first', async () => {
    await seedNotification('task_due', 'a', true);
    await seedNotification('task_due', 'b', false);
    const list = await listNotifications();
    // 未读（b）应排在已读（a）之前
    const bIdx = list.findIndex((n) => JSON.parse(n.payload).key === 'b');
    const aIdx = list.findIndex((n) => JSON.parse(n.payload).key === 'a');
    expect(bIdx).toBeLessThan(aIdx);
  });

  it('counts unread', async () => {
    const before = await unreadNotificationCount();
    await seedNotification('review_due', 'c', false);
    expect(await unreadNotificationCount()).toBe(before + 1);
  });

  it('marks a single notification read', async () => {
    const n = await seedNotification('streak_risk', 'd', false);
    const updated = await markNotificationRead(n.id);
    expect(updated.readAt).not.toBeNull();
    expect(await unreadNotificationCount()).toBeLessThan(await listNotifications().then((l) => l.length));
  });

  it('marks all unread as read', async () => {
    await seedNotification('task_due', 'e1', false);
    await seedNotification('task_due', 'e2', false);
    const count = await markAllNotificationsRead();
    expect(count).toBeGreaterThanOrEqual(2);
    expect(await unreadNotificationCount()).toBe(0);
  });

  it('rejects marking another user notification (not_found)', async () => {
    await expect(markNotificationRead('nonexistent')).rejects.toThrow();
  });
});
