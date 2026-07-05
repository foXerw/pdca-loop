### Task 2: Vitest 配置

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/setup-db.ts`（占位，Task 9 完善）

**Interfaces:**
- Produces: `npm run test` 可跑；别名 `@/*` 在测试里可用。

- [ ] **Step 1: 写 vitest 配置**

Create `vitest.config.ts`:
```ts
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
```

> 注：`DATABASE_URL` 必须在 `vitest.config.ts` 顶层设置（而非在 `tests/setup-db.ts` 里），因为 ES 模块 import 会被提升：`setup-db.ts` 若在 import `@/lib/db` 之后才赋值 env，PrismaClient 已用 `.env` 的 dev.db 创建完毕，测试会污染开发库。

- [ ] **Step 2: 冒烟测试确认配置生效**

Create `src/__smoke__.test.ts`:
```ts
import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 3: 跑测试**

Run: `npm test`
Expected: 1 个测试通过。

- [ ] **Step 4: 删除冒烟文件并 Commit**

```bash
rm src/__smoke__.test.ts
git add -A
git commit -m "chore: configure Vitest"
```

---

