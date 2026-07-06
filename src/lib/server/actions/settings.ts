import 'server-only';
import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/server/context';
import { touch, ActionError } from './_shared';

export type UserSettings = { dailyCheckHour: number; reviewDayOfWeek: number };

export async function getUserSettings(): Promise<UserSettings> {
  const userId = await getCurrentUserId();
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { dailyCheckHour: true, reviewDayOfWeek: true },
  });
  if (!u) throw new ActionError('not_found', 'user not found');
  return u;
}

export async function updateUserSettings(patch: Partial<UserSettings>): Promise<UserSettings> {
  const userId = await getCurrentUserId();
  const data: { dailyCheckHour?: number; reviewDayOfWeek?: number } = {};
  if (patch.dailyCheckHour != null) data.dailyCheckHour = patch.dailyCheckHour;
  if (patch.reviewDayOfWeek != null) data.reviewDayOfWeek = patch.reviewDayOfWeek;
  await prisma.user.update({ where: { id: userId }, data });
  touch();
  return getUserSettings();
}
