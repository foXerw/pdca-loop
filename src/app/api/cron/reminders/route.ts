import { NextResponse } from 'next/server';
import { runReminderScan } from '@/lib/server/actions/reminder';

export const dynamic = 'force-dynamic';

// Vercel Cron（或任何外部调度器）调用此路由触发提醒扫描。
// 需配置 CRON_SECRET 环境变量，并以 ?secret=... 传入。未配置或不匹配则拒绝。
export async function GET(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 403 });
  }
  const provided = new URL(req.url).searchParams.get('secret');
  if (provided !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const result = await runReminderScan();
  return NextResponse.json(result);
}
