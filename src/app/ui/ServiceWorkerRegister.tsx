'use client';

import { useEffect } from 'react';

// 应用级注册 Service Worker（push 全局生效）。不支持时静默跳过。
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .catch(() => {
          // 注册失败不影响应用其他功能
        });
    }
  }, []);

  return null;
}
