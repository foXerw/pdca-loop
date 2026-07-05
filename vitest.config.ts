import { defineConfig } from 'vitest/config';
import path from 'node:path';

// 测试统一用 test.db，避免污染开发库。必须在任何 import lib/db 之前设置，
// 因为 lib/db.ts 在模块加载时即创建 PrismaClient 单例。
process.env.DATABASE_URL = 'file:./test.db';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
  },
});
