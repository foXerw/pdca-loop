import { vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));
vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn().mockResolvedValue({ statusCode: 201 }),
  },
}));

// dispatchPush 在调用时（非模块加载时）读 VAPID env，这里提前注入。
process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'test-pub';
process.env.VAPID_PRIVATE_KEY = 'test-priv';
process.env.VAPID_SUBJECT = 'mailto:test@example.com';

import { describe, it, expect, beforeAll } from 'vitest';
import { resetTestDb, getTestUserId } from '../setup-db';
import { prisma } from '@/lib/db';
import {
  savePushSubscription,
  removePushSubscription,
  dispatchPush,
} from '@/lib/server/actions/push';
import webpush from 'web-push';

beforeAll(async () => {
  await resetTestDb();
});

describe('push actions', () => {
  it('saves a subscription, upserting by endpoint', async () => {
    const sub = { endpoint: 'https://fcm/abc', keys: { p256dh: 'p', auth: 'a' } };
    await savePushSubscription(sub);
    await savePushSubscription(sub); // 同 endpoint 不新建
    const all = await prisma.pushSubscription.findMany();
    expect(all).toHaveLength(1);
    expect(JSON.parse(all[0].keys)).toEqual({ p256dh: 'p', auth: 'a' });
  });

  it('removes a subscription by endpoint', async () => {
    await savePushSubscription({ endpoint: 'https://fcm/del', keys: { p256dh: 'p', auth: 'a' } });
    await removePushSubscription('https://fcm/del');
    const all = await prisma.pushSubscription.findMany({ where: { endpoint: 'https://fcm/del' } });
    expect(all).toHaveLength(0);
  });

  it('dispatchPush sends to each subscription', async () => {
    const userId = await getTestUserId();
    await prisma.pushSubscription.deleteMany(); // 清掉前面用例残留，保证确定性
    await savePushSubscription({ endpoint: 'https://fcm/1', keys: { p256dh: 'p', auth: 'a' } });
    await savePushSubscription({ endpoint: 'https://fcm/2', keys: { p256dh: 'p', auth: 'a' } });
    const mockSend = vi.mocked(webpush.sendNotification);
    mockSend.mockClear();
    const r = await dispatchPush(userId, { title: 't', body: 'b', href: '/' });
    expect(r.sent).toBe(2);
    expect(mockSend).toHaveBeenCalledTimes(2);
    // payload 含 title/body/href
    const arg = mockSend.mock.calls[0][1] as string;
    expect(JSON.parse(arg)).toMatchObject({ title: 't', body: 'b', href: '/' });
  });

  it('dispatchPush returns 0 when user has no subscriptions', async () => {
    const mockSend = vi.mocked(webpush.sendNotification);
    mockSend.mockClear();
    const r = await dispatchPush('nonexistent-user', { title: 't', body: 'b', href: '/' });
    expect(r.sent).toBe(0);
    expect(mockSend).not.toHaveBeenCalled();
  });
});
