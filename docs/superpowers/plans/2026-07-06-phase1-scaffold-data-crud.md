# 计划-实施-总结 Web 应用 · 实施计划 1：脚手架 + 数据模型 + 核心 CRUD + 核心规则

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭好 Next.js 全栈骨架，建好全部数据模型，实现 Plan/Task/CheckIn 的 CRUD Server Actions，并用 TDD 实现核心规则纯函数（streak、进度汇总、里程碑状态）。本计划产出可独立测试的数据 + 服务层，不含 UI（UI 在后续计划）。

**Architecture:** Next.js App Router 全栈一体；Prisma + SQLite；Server Actions 直读写数据库；单用户预置（`User` 表 + 一个硬编码用户，所有数据挂 `userId`）。核心规则（streak/进度/状态流转）抽成纯函数，与 DB 解耦，TDD 锁死边界。

**Tech Stack:** Next.js (latest, App Router) · TypeScript · Tailwind CSS · Prisma 6 · SQLite · Vitest · @testing-library

## Global Constraints

- 语言：TypeScript 严格模式。
- 数据库：SQLite，开发库 `prisma/dev.db`，测试库 `prisma/test.db`（互不污染）。
- 单用户：所有实体带 `userId` 外键；`lib/server/context.ts` 暴露 `getCurrentUserId()` 返回预置用户 id（个人阶段硬编码，将来换登录时只改这个文件）。
- ORM 客户端：`lib/db.ts` 单例，避免热重载连接泄漏。
- 纯函数 vs 副作用：所有"规则计算"放 `lib/rules/*.ts`（纯函数，可单测）；所有"读写 DB"放 `lib/server/actions/*.ts`（集成测）。
- 提交：每个 Task 结束 commit 一次，commit message 用 Conventional Commits（`feat:`/`chore:`/`test:`）。
- 不要在 `app/` 下写业务逻辑页（本计划只建空壳 `app/page.tsx`，UI 留给后续计划）。

---

## 文件结构（本计划涉及）

| 文件 | 职责 |
|---|---|
| `package.json` | 依赖、脚本 |
| `tsconfig.json` | TS 配置，`@/*` 别名指向 `./src` |
| `next.config.ts` | Next 配置 |
| `vitest.config.ts` | Vitest 配置（环境 `node`，别名对齐） |
| `.env` / `.env.test` | `DATABASE_URL`（开发/测试各指向不同 .db） |
| `prisma/schema.prisma` | 全部数据模型 |
| `prisma/seed.ts` | 预置单一 User |
| `lib/db.ts` | PrismaClient 单例 |
| `lib/server/context.ts` | `getCurrentUserId()` |
| `lib/rules/streak.ts` | 纯函数：由 CheckIn 列表算 streak |
| `lib/rules/progress.ts` | 纯函数：进度汇总、里程碑状态、预计达成日 |
| `lib/server/actions/plan.ts` | Plan CRUD Server Actions |
| `lib/server/actions/task.ts` | Task CRUD Server Actions |
| `lib/server/actions/checkin.ts` | CheckIn create/list Server Actions |
| `lib/server/actions/_shared.ts` | 公共：`revalidatePath` 封装、错误类型 |
| `src/app/layout.tsx` / `src/app/page.tsx` | 空壳（占位） |
| `lib/rules/streak.test.ts` | streak 单测 |
| `lib/rules/progress.test.ts` | progress 单测 |
| `tests/integration/plan.test.ts` | Plan CRUD 集成测 |
| `tests/integration/task.test.ts` | Task CRUD 集成测 |
| `tests/integration/checkin.test.ts` | CheckIn 集成测 |
| `tests/setup-db.ts` | 集成测公共：每测试前重置 test.db |

> 注：`create-next-app` 默认带 `src/` 目录，故 `app/` 实际在 `src/app/`，`lib/` 也在 `src/lib/`。下方路径统一写 `src/...`。

---

### Task 1: 脚手架 Next.js + 依赖 + 目录约定

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `.gitignore`

**Interfaces:**
- Produces: 一个能 `npm run dev` 启动的空 Next.js 应用；`@/*` → `./src/*` 别名。

- [ ] **Step 1: 用 create-next-app 初始化（在当前目录，已有 docs/ 与 .git 保留）**

Run:
```bash
npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-turbopack --yes
```
Expected: 生成 `package.json`、`src/app/`、`tsconfig.json` 等；`docs/` 与 `.git` 不受影响。若提示目录非空需确认，选继续。

- [ ] **Step 2: 装核心依赖**

Run:
```bash
npm install prisma @prisma/client vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```
Expected: 安装成功，`package.json` 出现这些依赖。

- [ ] **Step 3: 加 npm 脚本**

Modify `package.json` 的 `"scripts"`：
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test": "vitest run",
  "test:watch": "vitest",
  "db:generate": "prisma generate",
  "db:migrate": "prisma migrate dev",
  "db:seed": "tsx prisma/seed.ts"
}
```
另装 `tsx`（运行 seed）：`npm install -D tsx`

- [ ] **Step 4: 占位首页**

Replace `src/app/page.tsx`:
```tsx
export default function Home() {
  return <main className="p-8">计划-实施-总结 · 数据层搭建中</main>;
}
```

- [ ] **Step 5: 验证 dev 能起**

Run: `npm run dev`（Ctrl+C 即可）
Expected: 编译无报错，首页显示占位文字。

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js + Tailwind + Prisma + Vitest"
```

---

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

### Task 3: Prisma schema + 迁移 + 预置用户

**Files:**
- Create: `prisma/schema.prisma`, `prisma/seed.ts`, `lib/db.ts`, `lib/server/context.ts`, `.env`, `.env.test`
- Modify: `package.json`（prisma 生成后引用路径）

**Interfaces:**
- Produces: `lib/db.ts` 导出 `prisma`（PrismaClient 单例）；`lib/server/context.ts` 导出 `getCurrentUserId(): Promise<string>`；全部表存在并已迁移。

- [ ] **Step 1: 初始化 Prisma**

Run:
```bash
npx prisma init --datasource-provider sqlite
```
Expected: 生成 `prisma/schema.prisma` 和 `.env`（含 `DATABASE_URL="file:./dev.db"`）。

- [ ] **Step 2: 写 schema**

Replace `prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  plans     Plan[]
  tasks     Task[]
  checkIns  CheckIn[]
  reviews   Review[]
  notifications Notification[]
  pushSubs  PushSubscription[]
}

model Plan {
  id          String     @id @default(cuid())
  userId      String
  title       String
  description String     @default("")
  type        String     // "deadline" | "ongoing"
  status      String     @default("active") // active | paused | done | archived
  targetValue Float?
  targetUnit  String?
  startAt     DateTime   @default(now())
  dueAt       DateTime?
  icon        String?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  user        User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  milestones  Milestone[]
  tasks       Task[]
  checkIns    CheckIn[]
  reviews     Review[]

  @@index([userId])
}

model Milestone {
  id          String   @id @default(cuid())
  planId      String
  title       String
  targetDate  DateTime
  targetValue Float?
  order       Int      @default(0)
  status      String   @default("todo") // todo | done
  createdAt   DateTime @default(now())
  plan        Plan     @relation(fields: [planId], references: [id], onDelete: Cascade)

  @@index([planId])
}

model Task {
  id         String    @id @default(cuid())
  userId     String
  planId     String
  milestoneId String?
  title      String
  notes      String    @default("")
  status     String    @default("todo") // todo | done
  dueAt      DateTime?
  recurrence String    @default("none") // none | daily | weekly | custom
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  plan       Plan      @relation(fields: [planId], references: [id], onDelete: Cascade)

  @@index([planId])
  @@index([userId])
}

model CheckIn {
  id         String   @id @default(cuid())
  userId     String
  planId     String?
  taskId     String?
  value      Float?
  note       String   @default("")
  mood       String?  // 😊 😐 😞 等
  occurredAt DateTime @default(now())
  createdAt  DateTime @default(now())
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([planId])
  @@index([taskId])
  @@index([userId, occurredAt])
}

model Review {
  id          String   @id @default(cuid())
  userId      String
  planId      String?
  period      String   // week | month | quarter | custom
  wentWell    String   @default("")
  blocked     String   @default("")
  adjustments String   @default("")
  rangeStart  DateTime
  rangeEnd    DateTime
  createdAt   DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  plan        Plan?    @relation(fields: [planId], references: [id], onDelete: Cascade)

  @@index([userId, rangeStart])
}

model Notification {
  id        String    @id @default(cuid())
  userId    String
  type      String    // task_due | review_due | streak_risk
  payload   String    // JSON string
  readAt    DateTime?
  createdAt DateTime  @default(now())
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, readAt])
}

model PushSubscription {
  id        String   @id @default(cuid())
  userId    String
  endpoint  String
  keys      String   // JSON
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

- [ ] **Step 3: 写 .env 与 .env.test**

`.env`:
```
DATABASE_URL="file:./dev.db"
```
`.env.test`:
```
DATABASE_URL="file:./test.db"
```
确认 `.gitignore` 含 `*.db`、`.env*`（如无则补）。

- [ ] **Step 4: 迁移**

Run:
```bash
npx prisma migrate dev --name init
```
Expected: 生成 `prisma/migrations/...` 与 `prisma/dev.db`。

- [ ] **Step 5: PrismaClient 单例**

Create `src/lib/db.ts`:
```ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: ['error'] });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

- [ ] **Step 6: 单用户上下文**

Create `src/lib/server/context.ts`:
```ts
import { prisma } from '@/lib/db';

// 个人阶段：硬编码单一用户。将来加注册登录时，只改本文件。
const SEED_USER_NAME = 'me';

export async function getCurrentUserId(): Promise<string> {
  let user = await prisma.user.findFirst({ where: { name: SEED_USER_NAME } });
  if (!user) {
    user = await prisma.user.create({ data: { name: SEED_USER_NAME } });
  }
  return user.id;
}
```

- [ ] **Step 7: seed 脚本**

Create `prisma/seed.ts`:
```ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { id: 'single-user' },
    update: {},
    create: { id: 'single-user', name: 'me' },
  });
  console.log('seeded single user');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

> 注：`User.id` 是 `cuid()` `@default`，但我们 upsert 用固定字符串 `single-user`，让预置用户 id 稳定可预测，便于调试与测试。cuid 字段接受任意字符串。

在 `package.json` 加：
```json
"prisma": { "seed": "tsx prisma/seed.ts" }
```

- [ ] **Step 8: 跑 seed 验证**

Run: `npm run db:seed`
Expected: 输出 `seeded single user`。

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(db): schema + migration + single-user seed + prisma singleton"
```

---

### Task 4: 核心规则纯函数（TDD）— streak 计算

**Files:**
- Create: `src/lib/rules/streak.ts`
- Test: `src/lib/rules/streak.test.ts`

**Interfaces:**
- Produces: `computeStreak(checkIns: { occurredAt: Date }[], today: Date): { current: number; longest: number }`
  - 约定：`occurredAt` 按日截断去重（同日多次打卡算一天）。
  - current = 从 `today`（含）往前数连续有打卡的天数；若 today 无打卡但有昨天，按"宽限到次日午前"逻辑，仍允许 today 不打卡不立即断——但本纯函数只按"日历日"算，宽限由调用方决定是否把 today 传入。简化约定：调用方需断 today 是否算入，这里按传入的 today 严格连续。
  - longest = 历史最长连续天数。

- [ ] **Step 1: 写失败测试**

Create `src/lib/rules/streak.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { computeStreak } from './streak';

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d, 10, 0, 0);

describe('computeStreak', () => {
  it('returns 0 current when no check-ins', () => {
    expect(computeStreak([], day(2026, 7, 6))).toEqual({ current: 0, longest: 0 });
  });

  it('counts current streak ending today', () => {
    const cis = [day(2026, 7, 4), day(2026, 7, 5), day(2026, 7, 6)];
    expect(computeStreak(cis, day(2026, 7, 6))).toEqual({ current: 3, longest: 3 });
  });

  it('counts streak ending yesterday when today missing (grace)', () => {
    const cis = [day(2026, 7, 4), day(2026, 7, 5)];
    expect(computeStreak(cis, day(2026, 7, 6))).toEqual({ current: 2, longest: 2 });
  });

  it('breaks on a gap', () => {
    const cis = [day(2026, 7, 3), day(2026, 7, 5), day(2026, 7, 6)];
    expect(computeStreak(cis, day(2026, 7, 6))).toEqual({ current: 2, longest: 2 });
  });

  it('dedupes same-day check-ins', () => {
    const cis = [day(2026, 7, 6), day(2026, 7, 6), day(2026, 7, 5)];
    expect(computeStreak(cis, day(2026, 7, 6))).toEqual({ current: 2, longest: 2 });
  });

  it('ignores future check-ins for current', () => {
    const cis = [day(2026, 7, 6), day(2026, 7, 7)];
    expect(computeStreak(cis, day(2026, 7, 6))).toEqual({ current: 1, longest: 1 });
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test src/lib/rules/streak.test.ts`
Expected: FAIL，`computeStrek is not defined` / 模块找不到。

- [ ] **Step 3: 写实现**

Create `src/lib/rules/streak.ts`:
```ts
export type CheckInDate = { occurredAt: Date };

function toDayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayDiff(a: Date, b: Date): number {
  // 返回 b - a 的天数（按日历日截断）
  const MS = 24 * 60 * 60 * 1000;
  const da = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const db = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((db - da) / MS);
}

export function computeStreak(
  checkIns: CheckInDate[],
  today: Date,
): { current: number; longest: number } {
  const todayKey = toDayKey(today);
  const set = new Set<string>();
  for (const c of checkIns) {
    if (dayDiff(c.occurredAt, today) < 0) continue; // 未来打卡不计入
    set.add(toDayKey(c.occurredAt));
  }
  // current：从 today 往前，若 today 无则从昨天开始（grace）
  let current = 0;
  let cursor = new Date(today);
  if (!set.has(toDayKey(cursor))) {
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1);
  }
  while (set.has(toDayKey(cursor))) {
    current += 1;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1);
  }

  // longest：按日排序后扫连续段
  const days = [...set].map((k) => {
    const [y, m, d] = k.split('-').map(Number);
    return new Date(y, m, d);
  }).sort((a, b) => a.getTime() - b.getTime());
  let longest = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const d of days) {
    if (prev && dayDiff(prev, d) === 1) run += 1;
    else run = 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  return { current, longest: Math.max(longest, current) };
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test src/lib/rules/streak.test.ts`
Expected: 全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add src/lib/rules/streak.ts src/lib/rules/streak.test.ts
git commit -m "feat(rules): computeStreak pure function with TDD"
```

---

### Task 5: 核心规则纯函数（TDD）— 进度汇总与里程碑状态

**Files:**
- Create: `src/lib/rules/progress.ts`
- Test: `src/lib/rules/progress.test.ts`

**Interfaces:**
- Consumes: 无（纯函数）。
- Produces:
  - `sumProgress(checkIns: { value?: number | null }[]): number`
  - `milestoneStatus(milestone: { targetValue?: number | null; targetDate: Date; status: string }, progress: number, now: Date): 'todo' | 'done' | 'overdue'`
  - `projectedFinishDate(progress: number, targetValue: number, startAt: Date, now: Date): Date | null`（按当前速率推算达成日；速率不足返回 null）

- [ ] **Step 1: 写失败测试**

Create `src/lib/rules/progress.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { sumProgress, milestoneStatus, projectedFinishDate } from './progress';

describe('sumProgress', () => {
  it('sums value fields, ignoring null/undefined', () => {
    expect(sumProgress([{ value: 10 }, { value: 20 }, { value: null }, {}])).toBe(30);
  });
  it('returns 0 for empty', () => expect(sumProgress([])).toBe(0));
});

describe('milestoneStatus', () => {
  const ms = (over: Partial<{ targetValue: number | null; targetDate: Date; status: string }>) => ({
    targetValue: null, targetDate: new Date(2026, 11, 31), status: 'todo', ...over,
  });
  it('done when status already done', () => {
    expect(milestoneStatus(ms({ status: 'done' }), 0, new Date(2026, 6, 1))).toBe('done');
  });
  it('done when progress meets target', () => {
    expect(milestoneStatus(ms({ targetValue: 100 }), 100, new Date(2026, 6, 1))).toBe('done');
  });
  it('overdue when past targetDate and below target', () => {
    expect(milestoneStatus(ms({ targetValue: 100 }), 50, new Date(2027, 1, 1))).toBe('overdue');
  });
  it('todo otherwise', () => {
    expect(milestoneStatus(ms({ targetValue: 100 }), 50, new Date(2026, 6, 1))).toBe('todo');
  });
});

describe('projectedFinishDate', () => {
  const day = (y: number, m: number, d: number) => new Date(y, m - 1, d);
  it('projects by current rate', () => {
    // 30 天用了 30M，目标 100M → 还需 70 天；7/1 + 70 天 = 9/9
    const r = projectedFinishDate(30, 100, day(2026, 6, 1), day(2026, 7, 1));
    expect(r).toEqual(day(2026, 9, 9));
  });
  it('returns null when no progress yet', () => {
    expect(projectedFinishDate(0, 100, day(2026, 6, 1), day(2026, 6, 2))).toBeNull();
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test src/lib/rules/progress.test.ts`
Expected: FAIL（模块不存在）。

- [ ] **Step 3: 写实现**

Create `src/lib/rules/progress.ts`:
```ts
export type CheckInValue = { value?: number | null };

export function sumProgress(checkIns: CheckInValue[]): number {
  return checkIns.reduce((acc, c) => acc + (c.value ?? 0), 0);
}

export type MilestoneLike = {
  targetValue?: number | null;
  targetDate: Date;
  status: string;
};

export function milestoneStatus(
  m: MilestoneLike,
  progress: number,
  now: Date,
): 'todo' | 'done' | 'overdue' {
  if (m.status === 'done') return 'done';
  if (m.targetValue != null && progress >= m.targetValue) return 'done';
  if (now > m.targetDate) return 'overdue';
  return 'todo';
}

export function projectedFinishDate(
  progress: number,
  targetValue: number,
  startAt: Date,
  now: Date,
): Date | null {
  if (progress <= 0) return null;
  const MS = 24 * 60 * 60 * 1000;
  const elapsedDays = Math.max(1, Math.round((now.getTime() - startAt.getTime()) / MS));
  const ratePerDay = progress / elapsedDays;
  const remaining = Math.max(0, targetValue - progress);
  const daysLeft = Math.ceil(remaining / ratePerDay);
  return new Date(now.getTime() + daysLeft * MS);
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test src/lib/rules/progress.test.ts`
Expected: 全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add src/lib/rules/progress.ts src/lib/rules/progress.test.ts
git commit -m "feat(rules): sumProgress + milestoneStatus + projectedFinishDate"
```

---

### Task 6: 集成测试公共夹具 — 重置 test.db

**Files:**
- Create: `tests/setup-db.ts`

**Interfaces:**
- Produces: `resetTestDb(): Promise<void>`（清空所有表，并重新 seed 单用户）；`getTestUserId(): Promise<string>`（返回 `single-user`）。

- [ ] **Step 1: 写实现**

Create `tests/setup-db.ts`:
```ts
import { execSync } from 'node:child_process';
import { prisma } from '@/lib/db';
// 注意：DATABASE_URL 由 vitest.config.ts 顶层设置，不要在此处赋值（import 提升）。

export async function resetTestDb(): Promise<void> {
  // 确保 test.db schema 最新
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
    stdio: 'ignore',
  });
  // 清表（顺序尊重外键）
  await prisma.notification.deleteMany();
  await prisma.pushSubscription.deleteMany();
  await prisma.review.deleteMany();
  await prisma.checkIn.deleteMany();
  await prisma.task.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.user.deleteMany();
  await prisma.user.create({ data: { id: 'single-user', name: 'me' } });
}

export async function getTestUserId(): Promise<string> {
  return 'single-user';
}
```

- [ ] **Step 2: 验证可调用（手动一次性脚本）**

Create `tests/_db_smoke.test.ts`:
```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { resetTestDb, getTestUserId } from './setup-db';
import { prisma } from '@/lib/db';

describe('test db fixture', () => {
  beforeAll(async () => { await resetTestDb(); });
  it('has single user', async () => {
    const id = await getTestUserId();
    const u = await prisma.user.findUnique({ where: { id } });
    expect(u?.name).toBe('me');
  });
});
```

- [ ] **Step 3: 跑测试**

Run: `npm test tests/_db_smoke.test.ts`
Expected: PASS。

- [ ] **Step 4: 删冒烟、Commit**

```bash
rm tests/_db_smoke.test.ts
git add tests/setup-db.ts
git commit -m "test: integration db fixture (resetTestDb)"
```

---

### Task 7: Plan CRUD Server Actions（TDD 集成测）

**Files:**
- Create: `src/lib/server/actions/_shared.ts`, `src/lib/server/actions/plan.ts`
- Test: `tests/integration/plan.test.ts`

**Interfaces:**
- Consumes: `getCurrentUserId()` from Task 3；`prisma` from Task 3。
- Produces：
  - `createPlan(input: { title: string; type: 'deadline' | 'ongoing'; targetValue?: number; targetUnit?: string; dueAt?: Date; description?: string }): Promise<Plan>`
  - `listPlans(): Promise<Plan[]>`（仅当前用户，按 `createdAt` desc）
  - `getPlan(id: string): Promise<Plan | null>`
  - `updatePlan(id: string, patch: Partial<...>): Promise<Plan>`
  - `setPlanStatus(id: string, status: 'active' | 'paused' | 'done' | 'archived'): Promise<Plan>`

- [ ] **Step 1: 写共享工具**

Create `src/lib/server/actions/_shared.ts`:
```ts
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
```

- [ ] **Step 2: 写失败测试**

Create `tests/integration/plan.test.ts`:
```ts
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { resetTestDb, getTestUserId } from '../setup-db';
import { createPlan, listPlans, getPlan, updatePlan, setPlanStatus } from '@/lib/server/actions/plan';

beforeAll(async () => { await resetTestDb(); });

describe('plan actions', () => {
  it('creates a deadline plan with target', async () => {
    const p = await createPlan({
      title: '一亿 token',
      type: 'deadline',
      targetValue: 100000000,
      targetUnit: 'tokens',
      dueAt: new Date(2026, 11, 31),
    });
    expect(p.id).toBeTruthy();
    expect(p.title).toBe('一亿 token');
    expect(p.userId).toBe(await getTestUserId());
    expect(p.targetValue).toBe(100000000);
  });

  it('creates an ongoing plan without target', async () => {
    const p = await createPlan({ title: '学画画', type: 'ongoing' });
    expect(p.type).toBe('ongoing');
    expect(p.targetValue).toBeNull();
  });

  it('lists only current user plans, newest first', async () => {
    const list = await listPlans();
    expect(list.length).toBeGreaterThanOrEqual(2);
    expect(list[0].createdAt.getTime()).toBeGreaterThanOrEqual(list[1].createdAt.getTime());
  });

  it('gets a plan by id', async () => {
    const created = await createPlan({ title: 'find me', type: 'ongoing' });
    const got = await getPlan(created.id);
    expect(got?.title).toBe('find me');
  });

  it('updates plan fields', async () => {
    const p = await createPlan({ title: 'edit', type: 'ongoing' });
    const updated = await updatePlan(p.id, { title: 'edited', description: 'd' });
    expect(updated.title).toBe('edited');
    expect(updated.description).toBe('d');
  });

  it('sets plan status', async () => {
    const p = await createPlan({ title: 'status', type: 'ongoing' });
    const done = await setPlanStatus(p.id, 'done');
    expect(done.status).toBe('done');
  });

  it('returns null for missing plan', async () => {
    expect(await getPlan('nonexistent-id')).toBeNull();
  });
});
```

- [ ] **Step 3: 跑测试确认失败**

Run: `npm test tests/integration/plan.test.ts`
Expected: FAIL（`plan.ts` 不存在）。

- [ ] **Step 4: 写实现**

Create `src/lib/server/actions/plan.ts`:
```ts
import 'server-only';
import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/server/context';
import { touch, ActionError } from './_shared';
import type { Plan } from '@prisma/client';

export type PlanType = 'deadline' | 'ongoing';
export type PlanStatus = 'active' | 'paused' | 'done' | 'archived';

export async function createPlan(input: {
  title: string;
  type: PlanType;
  targetValue?: number;
  targetUnit?: string;
  dueAt?: Date;
  description?: string;
}): Promise<Plan> {
  const userId = await getCurrentUserId();
  const plan = await prisma.plan.create({
    data: {
      userId,
      title: input.title,
      type: input.type,
      targetValue: input.targetValue ?? null,
      targetUnit: input.targetUnit ?? null,
      dueAt: input.dueAt ?? null,
      description: input.description ?? '',
    },
  });
  touch();
  return plan;
}

export async function listPlans(): Promise<Plan[]> {
  const userId = await getCurrentUserId();
  return prisma.plan.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getPlan(id: string): Promise<Plan | null> {
  const userId = await getCurrentUserId();
  return prisma.plan.findFirst({ where: { id, userId } });
}

export async function updatePlan(
  id: string,
  patch: Partial<{ title: string; description: string; targetValue: number; targetUnit: string; dueAt: Date | null }>,
): Promise<Plan> {
  const userId = await getCurrentUserId();
  const plan = await prisma.plan.updateMany({ where: { id, userId }, data: patch });
  if (plan.count === 0) throw new ActionError('not_found', 'plan not found');
  const updated = await prisma.plan.findUnique({ where: { id } });
  if (!updated) throw new ActionError('not_found', 'plan not found');
  touch();
  return updated;
}

export async function setPlanStatus(id: string, status: PlanStatus): Promise<Plan> {
  const userId = await getCurrentUserId();
  const res = await prisma.plan.updateMany({ where: { id, userId }, data: { status } });
  if (res.count === 0) throw new ActionError('not_found', 'plan not found');
  const updated = await prisma.plan.findUnique({ where: { id } });
  if (!updated) throw new ActionError('not_found', 'plan not found');
  touch();
  return updated;
}
```

- [ ] **Step 5: 跑测试确认通过**

Run: `npm test tests/integration/plan.test.ts`
Expected: 全部 PASS。

- [ ] **Step 6: Commit**

```bash
git add src/lib/server/actions/_shared.ts src/lib/server/actions/plan.ts tests/integration/plan.test.ts
git commit -m "feat(server): Plan CRUD server actions with integration tests"
```

---

### Task 8: Task CRUD Server Actions（TDD 集成测）

**Files:**
- Create: `src/lib/server/actions/task.ts`
- Test: `tests/integration/task.test.ts`

**Interfaces:**
- Consumes: `getCurrentUserId()`、`prisma`、`Plan` 必须先存在（外键）。
- Produces：
  - `createTask(input: { planId: string; title: string; milestoneId?: string; dueAt?: Date; recurrence?: 'none' | 'daily' | 'weekly' | 'custom'; notes?: string }): Promise<Task>`
  - `listTasksByPlan(planId: string): Promise<Task[]>`
  - `completeTask(id: string): Promise<Task>`（todo→done 切换）
  - `updateTask(id: string, patch: Partial<...>): Promise<Task>`

- [ ] **Step 1: 写失败测试**

Create `tests/integration/task.test.ts`:
```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { resetTestDb } from '../setup-db';
import { createPlan } from '@/lib/server/actions/plan';
import { createTask, listTasksByPlan, completeTask, updateTask } from '@/lib/server/actions/task';

beforeAll(async () => { await resetTestDb(); });

describe('task actions', () => {
  it('creates a daily recurring task under a plan', async () => {
    const plan = await createPlan({ title: '画画', type: 'ongoing' });
    const t = await createTask({ planId: plan.id, title: '每天画 30 分钟', recurrence: 'daily' });
    expect(t.recurrence).toBe('daily');
    expect(t.status).toBe('todo');
  });

  it('lists tasks by plan', async () => {
    const plan = await createPlan({ title: 'p2', type: 'ongoing' });
    await createTask({ planId: plan.id, title: 't1' });
    await createTask({ planId: plan.id, title: 't2' });
    const list = await listTasksByPlan(plan.id);
    expect(list.length).toBe(2);
  });

  it('completes a task', async () => {
    const plan = await createPlan({ title: 'p3', type: 'ongoing' });
    const t = await createTask({ planId: plan.id, title: 'do' });
    const done = await completeTask(t.id);
    expect(done.status).toBe('done');
  });

  it('updates task notes and title', async () => {
    const plan = await createPlan({ title: 'p4', type: 'ongoing' });
    const t = await createTask({ planId: plan.id, title: 'orig' });
    const u = await updateTask(t.id, { title: 'new', notes: 'n' });
    expect(u.title).toBe('new');
    expect(u.notes).toBe('n');
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test tests/integration/task.test.ts`
Expected: FAIL（`task.ts` 不存在）。

- [ ] **Step 3: 写实现**

Create `src/lib/server/actions/task.ts`:
```ts
import 'server-only';
import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/server/context';
import { touch, ActionError } from './_shared';
import type { Task } from '@prisma/client';

export type Recurrence = 'none' | 'daily' | 'weekly' | 'custom';

export async function createTask(input: {
  planId: string;
  title: string;
  milestoneId?: string;
  dueAt?: Date;
  recurrence?: Recurrence;
  notes?: string;
}): Promise<Task> {
  const userId = await getCurrentUserId();
  const task = await prisma.task.create({
    data: {
      userId,
      planId: input.planId,
      milestoneId: input.milestoneId ?? null,
      title: input.title,
      dueAt: input.dueAt ?? null,
      recurrence: input.recurrence ?? 'none',
      notes: input.notes ?? '',
    },
  });
  touch();
  return task;
}

export async function listTasksByPlan(planId: string): Promise<Task[]> {
  const userId = await getCurrentUserId();
  return prisma.task.findMany({
    where: { planId, userId },
    orderBy: { createdAt: 'asc' },
  });
}

export async function completeTask(id: string): Promise<Task> {
  const userId = await getCurrentUserId();
  const existing = await prisma.task.findFirst({ where: { id, userId } });
  if (!existing) throw new ActionError('not_found', 'task not found');
  const next = existing.status === 'done' ? 'todo' : 'done';
  const updated = await prisma.task.update({ where: { id }, data: { status: next } });
  touch();
  return updated;
}

export async function updateTask(
  id: string,
  patch: Partial<{ title: string; notes: string; dueAt: Date | null; recurrence: Recurrence }>,
): Promise<Task> {
  const userId = await getCurrentUserId();
  const res = await prisma.task.updateMany({ where: { id, userId }, data: patch });
  if (res.count === 0) throw new ActionError('not_found', 'task not found');
  const updated = await prisma.task.findUnique({ where: { id } });
  if (!updated) throw new ActionError('not_found', 'task not found');
  touch();
  return updated;
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test tests/integration/task.test.ts`
Expected: 全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/actions/task.ts tests/integration/task.test.ts
git commit -m "feat(server): Task CRUD server actions with integration tests"
```

---

### Task 9: CheckIn create/list Server Actions + 进度查询（TDD 集成测）

**Files:**
- Create: `src/lib/server/actions/checkin.ts`
- Test: `tests/integration/checkin.test.ts`

**Interfaces:**
- Consumes: `getCurrentUserId()`、`prisma`、`sumProgress` from Task 5、`computeStreak` from Task 4。
- Produces：
  - `createCheckIn(input: { planId?: string; taskId?: string; value?: number; note?: string; mood?: string; occurredAt?: Date }): Promise<CheckIn>`
  - `listCheckIns(planId: string): Promise<CheckIn[]>`（按 occurredAt desc）
  - `getPlanProgress(planId: string): Promise<{ progress: number; streak: { current: number; longest: number } }>`（聚合：进度用 sumProgress，streak 用该计划下所有 CheckIn 算）

- [ ] **Step 1: 写失败测试**

Create `tests/integration/checkin.test.ts`:
```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { resetTestDb } from '../setup-db';
import { createPlan } from '@/lib/server/actions/plan';
import { createCheckIn, listCheckIns, getPlanProgress } from '@/lib/server/actions/checkin';

beforeAll(async () => { await resetTestDb(); });

describe('checkin actions', () => {
  it('creates a check-in with value', async () => {
    const plan = await createPlan({ title: 'token', type: 'deadline', targetValue: 100000000, targetUnit: 'tokens' });
    const ci = await createCheckIn({ planId: plan.id, value: 5_000_000, note: 'today' });
    expect(ci.value).toBe(5_000_000);
    expect(ci.planId).toBe(plan.id);
  });

  it('lists check-ins newest first', async () => {
    const plan = await createPlan({ title: 'list', type: 'deadline' });
    await createCheckIn({ planId: plan.id, value: 1, occurredAt: new Date(2026, 6, 1) });
    await createCheckIn({ planId: plan.id, value: 2, occurredAt: new Date(2026, 6, 5) });
    const list = await listCheckIns(plan.id);
    expect(list[0].value).toBe(2);
    expect(list[1].value).toBe(1);
  });

  it('aggregates progress and streak for a plan', async () => {
    const plan = await createPlan({ title: 'agg', type: 'ongoing' });
    const today = new Date();
    await createCheckIn({ planId: plan.id, occurredAt: today });
    const yest = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    await createCheckIn({ planId: plan.id, occurredAt: yest });
    const agg = await getPlanProgress(plan.id);
    expect(agg.streak.current).toBe(2);
    expect(agg.progress).toBe(0); // 无 value
  });

  it('sums values as progress', async () => {
    const plan = await createPlan({ title: 'sum', type: 'deadline', targetValue: 100 });
    await createCheckIn({ planId: plan.id, value: 30 });
    await createCheckIn({ planId: plan.id, value: 20 });
    const agg = await getPlanProgress(plan.id);
    expect(agg.progress).toBe(50);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test tests/integration/checkin.test.ts`
Expected: FAIL（`checkin.ts` 不存在）。

- [ ] **Step 3: 写实现**

Create `src/lib/server/actions/checkin.ts`:
```ts
import 'server-only';
import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/server/context';
import { touch, ActionError } from './_shared';
import { sumProgress } from '@/lib/rules/progress';
import { computeStreak } from '@/lib/rules/streak';
import type { CheckIn } from '@prisma/client';

export async function createCheckIn(input: {
  planId?: string;
  taskId?: string;
  value?: number;
  note?: string;
  mood?: string;
  occurredAt?: Date;
}): Promise<CheckIn> {
  if (!input.planId && !input.taskId) {
    throw new ActionError('bad_input', 'check-in needs planId or taskId');
  }
  const userId = await getCurrentUserId();
  const ci = await prisma.checkIn.create({
    data: {
      userId,
      planId: input.planId ?? null,
      taskId: input.taskId ?? null,
      value: input.value ?? null,
      note: input.note ?? '',
      mood: input.mood ?? null,
      occurredAt: input.occurredAt ?? new Date(),
    },
  });
  touch();
  return ci;
}

export async function listCheckIns(planId: string): Promise<CheckIn[]> {
  const userId = await getCurrentUserId();
  return prisma.checkIn.findMany({
    where: { planId, userId },
    orderBy: { occurredAt: 'desc' },
  });
}

export async function getPlanProgress(planId: string): Promise<{
  progress: number;
  streak: { current: number; longest: number };
}> {
  const userId = await getCurrentUserId();
  const cis = await prisma.checkIn.findMany({
    where: { planId, userId },
    select: { value: true, occurredAt: true },
  });
  return {
    progress: sumProgress(cis),
    streak: computeStreak(cis, new Date()),
  };
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test tests/integration/checkin.test.ts`
Expected: 全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/actions/checkin.ts tests/integration/checkin.test.ts
git commit -m "feat(server): CheckIn actions + plan progress aggregation"
```

---

### Task 10: 全量测试 + 文档收尾

**Files:**
- Create: `README.md`（项目说明与运行方式）
- Modify: 无

- [ ] **Step 1: 跑全部测试**

Run: `npm test`
Expected: 所有单测 + 集成测通过（streak、progress、plan、task、checkin）。

- [ ] **Step 2: 跑 lint**

Run: `npm run lint`
Expected: 无错误（warning 可接受）。

- [ ] **Step 3: 写 README**

Create `README.md`:
```markdown
# 计划-实施-总结

PDCA 闭环式个人计划管理 Web 应用。详见 \`docs/superpowers/specs/2026-07-06-plan-track-summarize-design.md\`。

## 开发

\`\`\`bash
npm install
npm run db:migrate     # 建表
npm run db:seed        # 预置单用户
npm run dev
\`\`\`

## 测试

\`\`\`bash
npm test               # Vitest（单测 + 集成测，自动用 test.db）
\`\`\`

## 当前进度

- [x] Phase 1：脚手架 + 数据模型 + 核心 CRUD + 核心规则（本计划）
- [ ] Phase 2：仪表盘 + 计划页 + 打卡 UI
- [ ] Phase 3：里程碑 + 量化进度展示 + streak 展示
- [ ] Phase 4：回顾页 + 周期触发 + 预填
- [ ] Phase 5：通知/提醒调度 + Web Push
- [ ] Phase 6：PWA + 打磨 + E2E 烟测
```

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: README with run/test instructions and phase roadmap"
```

---

## 自检结果（plan self-review）

- **Spec 覆盖**：本计划覆盖 spec 第 3（技术栈）、第 5（数据模型——全部 8 张表）、第 8（测试策略——核心规则 TDD、集成测）、第 10 第 1 步（数据模型 + CRUD）。spec 第 6（UI）、第 7（跟进机制）、第 9（商业化扩展点已在 schema 的 userId/Notification/PushSubscription 留口）属后续计划，符合"分阶段"决策。
- **占位符扫描**：无 TBD/TODO；每个代码步骤均含完整代码与命令。
- **类型一致性**：`computeStreak`、`sumProgress`、`milestoneStatus`、`projectedFinishDate`、各 Server Action 签名在产生方与消费方一致；`getPlanProgress` 复用 `sumProgress`/`computeStreak` 的导出名匹配。
- **遗留说明**：UI（Phase 2）、提醒调度与 Web Push（Phase 5）、回顾（Phase 4）明确不在本计划，将在各自计划中展开。
