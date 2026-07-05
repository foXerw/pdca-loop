import 'server-only';
import { revalidatePath } from 'next/cache';

export function touch(paths: string[] = ['/']): void {
  for (const p of paths) revalidatePath(p);
}

export class ActionError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}
