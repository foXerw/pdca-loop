import 'server-only';
import webpush from 'web-push';
import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/server/context';
import { touch } from './_shared';

export type PushSubscriptionInput = {
  endpoint: string;
  expirationTime?: number | null;
  keys: { p256dh: string; auth: string };
};

// 懒配置 VAPID（未设置密钥时空跑，应用内通知仍工作）。懒加载便于测试时注入 env。
let vapidConfigured = false;
function ensureVapid(): boolean {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  if (!vapidConfigured) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:dev@pdca-loop.local',
      pub,
      priv,
    );
    vapidConfigured = true;
  }
  return true;
}

export async function savePushSubscription(sub: PushSubscriptionInput): Promise<void> {
  const userId = await getCurrentUserId();
  const existing = await prisma.pushSubscription.findFirst({
    where: { userId, endpoint: sub.endpoint },
  });
  if (existing) {
    await prisma.pushSubscription.update({
      where: { id: existing.id },
      data: { keys: JSON.stringify(sub.keys) },
    });
  } else {
    await prisma.pushSubscription.create({
      data: { userId, endpoint: sub.endpoint, keys: JSON.stringify(sub.keys) },
    });
  }
  touch();
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  const userId = await getCurrentUserId();
  await prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
  touch();
}

export async function dispatchPush(
  userId: string,
  payload: { title: string; body: string; href: string },
): Promise<{ sent: number; failed: number }> {
  if (!ensureVapid()) return { sent: 0, failed: 0 };
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  let sent = 0;
  let failed = 0;
  const body = JSON.stringify(payload);
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: JSON.parse(s.keys) as { p256dh: string; auth: string } },
        body,
      );
      sent += 1;
    } catch {
      // 单条失败不阻断其余（订阅可能已过期）
      failed += 1;
    }
  }
  return { sent, failed };
}
