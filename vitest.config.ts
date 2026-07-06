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
    setupFiles: ['tests/setup-jest-dom.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'tests/**/*.test.ts'],
    // 集成测试共享同一个 test.db，且 beforeAll 调用 resetTestDb 重建数据。
    // 并行跑会导致多个文件竞争同一数据库（unique constraint / 数据被中途清空），
    // 因此关闭文件级并行，保证整条套件稳定。
    fileParallelism: false,
  },
});
