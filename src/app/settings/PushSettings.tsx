'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  subscribePushAction,
  unsubscribePushAction,
  sendTestPushAction,
} from '@/app/actions';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

function useStandalone(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => window.matchMedia('(display-mode: standalone)').matches,
    () => false,
  );
}

export function PushSettings() {
  const supported = useSyncExternalStore(
    () => () => {},
    () => 'serviceWorker' in navigator && 'PushManager' in window,
    () => false,
  );
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [status, setStatus] = useState<string>('');
  const standalone = useStandalone();

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        if (!cancelled) setSubscription(sub);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [supported]);

  async function subscribe(): Promise<void> {
    try {
      const reg = await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setStatus('未授权通知权限。');
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
        ) as BufferSource,
      });
      setSubscription(sub);
      await subscribePushAction(JSON.parse(JSON.stringify(sub)));
      setStatus('已启用浏览器推送 ✅');
    } catch (e) {
      setStatus(`订阅失败：${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function unsubscribe(): Promise<void> {
    try {
      await subscription?.unsubscribe();
      setSubscription(null);
      await unsubscribePushAction(subscription?.endpoint ?? '');
      setStatus('已取消推送。');
    } catch (e) {
      setStatus(`取消失败：${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function sendTest(): Promise<void> {
    const r = await sendTestPushAction();
    setStatus(r.sent > 0 ? '已发送测试通知。' : '未发送（可能未订阅或服务端未配 VAPID）。');
  }

  if (!supported) {
    return <p className="text-sm text-neutral-500">当前浏览器不支持 Web Push。</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        启用后，到「每日检查时间」未完成的待办/打卡/回顾会以系统通知弹出，即使没开应用。
      </p>
      {subscription ? (
        <div className="space-y-2">
          <p className="text-sm">已订阅推送。</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={sendTest}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:border-neutral-500 dark:border-neutral-700"
            >
              发送测试通知
            </button>
            <button
              type="button"
              onClick={unsubscribe}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-500 hover:border-neutral-500 dark:border-neutral-700"
            >
              取消订阅
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={subscribe}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
        >
          启用浏览器推送
        </button>
      )}
      {status && <p className="text-xs text-neutral-500">{status}</p>}
      {!standalone && /iPad|iPhone|iPod/.test(navigator.userAgent) && (
        <p className="text-xs text-neutral-500">
          iOS 需先将本站「添加到主屏幕」才能接收推送。
        </p>
      )}
    </div>
  );
}
