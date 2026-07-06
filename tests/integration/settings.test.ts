import { vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

import { describe, it, expect, beforeAll } from 'vitest';
import { resetTestDb, getTestUserId } from '../setup-db';
import { getUserSettings, updateUserSettings } from '@/lib/server/actions/settings';

beforeAll(async () => {
  await resetTestDb();
});

describe('settings actions', () => {
  it('returns defaults for the single user', async () => {
    const s = await getUserSettings();
    expect(s.dailyCheckHour).toBe(20);
    expect(s.reviewDayOfWeek).toBe(0);
    const uid = await getTestUserId();
    expect(uid).toBe('single-user');
  });

  it('updates daily check hour and review day', async () => {
    const updated = await updateUserSettings({ dailyCheckHour: 9, reviewDayOfWeek: 1 });
    expect(updated.dailyCheckHour).toBe(9);
    expect(updated.reviewDayOfWeek).toBe(1);
    const again = await getUserSettings();
    expect(again.dailyCheckHour).toBe(9);
  });
});
