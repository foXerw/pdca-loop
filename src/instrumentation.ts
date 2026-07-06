// 服务启动时注册一次。在 nodejs 运行时 + 非 test 环境下，启动一个定时器周期跑提醒扫描。
// 适用于自托管 / `next start`。Vercel serverless 实例不保活 interval，请改用 /api/cron/reminders（Vercel Cron）。

const TIMER_KEY = '__reminderTimer';

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.NODE_ENV === 'test') return;

  const g = globalThis as unknown as { [TIMER_KEY]?: NodeJS.Timeout };
  if (g[TIMER_KEY]) return; // 防止 HMR/重复注册

  const { runReminderScan } = await import('./lib/server/actions/reminder');
  const intervalMs = Number(process.env.REMINDER_SCAN_INTERVAL_MS) || 60_000;

  g[TIMER_KEY] = setInterval(() => {
    runReminderScan().catch((e) => console.error('[reminder scan]', e));
  }, intervalMs);
}
