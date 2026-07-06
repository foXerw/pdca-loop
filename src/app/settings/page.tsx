import Link from 'next/link';
import { getUserSettings } from '@/lib/server/actions/settings';
import { SettingsForm } from './SettingsForm';
import { PushSettings } from './PushSettings';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const settings = await getUserSettings();

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <Link
        href="/"
        className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
      >
        ← 仪表盘
      </Link>
      <h1 className="mt-2 text-lg font-semibold">设置</h1>

      <section className="mt-4">
        <h2 className="mb-2 text-sm font-medium text-neutral-500">提醒</h2>
        <SettingsForm
          dailyCheckHour={settings.dailyCheckHour}
          reviewDayOfWeek={settings.reviewDayOfWeek}
        />
      </section>

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-medium text-neutral-500">浏览器推送</h2>
        <PushSettings />
      </section>
    </main>
  );
}
