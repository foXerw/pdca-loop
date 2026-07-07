# 计划模型通用化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `Plan.type`（deadline/ongoing 二分枚举）重设为正交 facet（截止日 / 量化目标 / 节奏），并清掉漏进 UI 与测试的「一亿 token」硬编码痕迹。

**Architecture:** 自底向上、可持续绿色提交：先做不依赖 schema 的纯规则（`planKind`、`computeStreak` 周 streak），再用一次 additive 迁移给 `Plan` 加 `cadence`/`cadenceTimes`（保留 `type` 做 bridge），逐层把消费方从 `type` 切到 facet，最后删 `type` 列并清理测试夹具。每个任务结束都 `tsc + 测试` 全绿。

**Tech Stack:** Next.js 16 App Router、TypeScript、Prisma 7 + libsql/SQLite、Vitest 4 + Testing Library。Next 16 有 breaking changes（`params` 为 Promise、Server Action 需 `'use server'` 适配层），本计划不引入新 Next API，但写代码前先看 `node_modules/next/dist/docs/`（见 AGENTS.md）。

## Global Constraints

- **版本下限**：Node ≥ 20；Prisma 7；Next 16.2.10；React 19.2.4；Vitest 4。
- **数据库**：SQLite via libsql。开发库 `dev.db`，测试库 `test.db`，均 gitignore。迁移用 `npx prisma migrate dev --name <name>`（开发库），测试库由 `tests/setup-db.ts` 的 `resetTestDb()` 跑 `prisma migrate deploy` 自动跟上。
- **架构约定**：业务逻辑放 `src/lib/server/actions/*`（`server-only`，可被集成测试直接调用）；`src/app/actions.ts` 是 `'use server'` 表单适配层，只做 FormData 解析 → 调业务函数 → `revalidatePath`/`redirect`。纯规则放 `src/lib/rules/`，先写测试再实现。
- **测试约定**：集成测试顶部 `vi.mock('server-only')` + `vi.mock('next/cache')`；`.tsx` 组件测试首行 `// @vitest-environment jsdom`；`fileParallelism: false`（共享 test.db）。提交前跑 `npm test && npx tsc --noEmit && npm run build`。
- **cadence 取值**：`'none' | 'daily' | 'weekly'`（字符串）。`cadenceTimes` 仅 `weekly` 有意义。周界一律 ISO 周一（与现有 `reminder.ts` 的 `weekMondayKey` 同约定）。
- **桥接期约束**（Task 3–6）：`type` 列仍存在但可为空；`createPlan` 在未传 `cadence` 时从 `type` 派生（`ongoing→daily`、其余→`none`），保证旧测试绿。Task 7 删列时移除该桥接。
- **不动**：单用户模型（`getCurrentUserId` 硬编码 `single-user`）、`Notification`/`PushSubscription` schema、PWA/SW、`Task.recurrence` 语义。

---

## File Structure

新增：
- `src/lib/rules/kind.ts` — `planKind(plan)` 纯函数 + `PlanKind`/`PlanCadence`/`PlanLike` 类型。消费方据此分支，不再读 `type`。
- `src/lib/rules/kind.test.ts`
- `src/app/ui/PlanCard.test.tsx` — PlanCard facet 分支组件测试。

修改：
- `src/lib/rules/streak.ts` — `computeStreak` 加 `cadence`/`cadenceTimes` 参数，新增 weekly 逻辑；导出 `mondayOf`/`weekMondayKey` 供复用。
- `src/lib/rules/streak.test.ts` — 新增 weekly 用例。
- `prisma/schema.prisma` — `Plan` 加 `cadence`/`cadenceTimes`（Task 3），删 `type`（Task 7）。
- `src/lib/server/actions/plan.ts` — `createPlan` 收 `cadence`/`cadenceTimes` + bridge；`listActivePlansOverview` 传 cadence 给 streak + 算 `thisPeriodCount`；Task 7 删 `PlanType`。
- `src/lib/server/actions/checkin.ts` — `getPlanProgress` 读 plan 的 cadence，返回 `thisPeriodCount`。
- `src/app/actions.ts` — `createPlanAction` 按 template 解析 cadence/facet，不再读 `type`。
- `src/app/plans/new/PlanForm.tsx` — 模板选择器（5 模板），各 facet 独立可编辑。
- `src/app/plans/new/PlanForm.test.tsx` — 改按 `name`/label 断言，覆盖模板切换。
- `src/app/ui/PlanCard.tsx` — 按 `planKind` 分支（量化→进度条 / 循环→streak / 里程碑→计数）。
- `src/app/plans/[id]/page.tsx` — 按 `planKind` 决定显示进度/streak/里程碑区。
- `src/app/plans/[id]/EditPlanForm.tsx` — 所有 facet 可编辑。
- `src/app/plans/[id]/CheckInForm.tsx` — `isDeadline` → `isQuantitative`（数值字段在量化计划才显）。
- `src/lib/rules/reminder.ts` — `atRiskPlans` 加 `cadence`/`remaining`，按 cadence 出文案与去重 key。
- `src/lib/rules/reminder.test.ts` — weekly at-risk 用例 + 文案 + 周 key。
- `src/lib/server/actions/reminder.ts` — at-risk 检测改 cadence（daily 查今日；weekly 查本周计数）。
- `tests/integration/{plan,milestone,overview,checkin,task,review,reminder}.test.ts` — Task 3 修 overview 断言 + 加 weekly 用例；Task 7 删所有 `type:`、token 夹具换中性。
- `README.md` + `docs/superpowers/specs/2026-07-06-plan-track-summarize-design.md` — 文档更新（Task 8）。

---

### Task 1: `planKind` 纯函数

**Files:**
- Create: `src/lib/rules/kind.ts`
- Test: `src/lib/rules/kind.test.ts`

**Interfaces:**
- Produces: `planKind(plan: PlanLike): PlanKind`；`PlanCadence = 'none' | 'daily' | 'weekly'`；`PlanKind = { hasDeadline; isQuantitative; isRecurring; cadence; cadenceTimes }`；`PlanLike = { dueAt?; targetValue?; cadence?; cadenceTimes? }`（均可空，兼容 Prisma 返回的 `string | null`）。

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/rules/kind.test.ts
import { describe, it, expect } from 'vitest';
import { planKind } from './kind';

describe('planKind', () => {
  it('deadline + quantitative + none → 终点·量化', () => {
    expect(planKind({ dueAt: new Date('2026-12-31'), targetValue: 100, cadence: 'none' })).toEqual({
      hasDeadline: true,
      isQuantitative: true,
      isRecurring: false,
      cadence: 'none',
      cadenceTimes: null,
    });
  });

  it('deadline + no target + none → 终点·里程碑', () => {
    expect(planKind({ dueAt: new Date('2026-12-31'), cadence: 'none' })).toEqual({
      hasDeadline: true,
      isQuantitative: false,
      isRecurring: false,
      cadence: 'none',
      cadenceTimes: null,
    });
  });

  it('no deadline + daily → 每日练习', () => {
    expect(planKind({ cadence: 'daily' })).toEqual({
      hasDeadline: false,
      isQuantitative: false,
      isRecurring: true,
      cadence: 'daily',
      cadenceTimes: null,
    });
  });

  it('no deadline + weekly(3) → 每周练习', () => {
    expect(planKind({ cadence: 'weekly', cadenceTimes: 3 })).toEqual({
      hasDeadline: false,
      isQuantitative: false,
      isRecurring: true,
      cadence: 'weekly',
      cadenceTimes: 3,
    });
  });

  it('deadline + quantitative + weekly → 混合（每周写 1 篇共 52 篇）', () => {
    expect(planKind({ dueAt: new Date('2026-12-31'), targetValue: 52, cadence: 'weekly', cadenceTimes: 1 })).toEqual({
      hasDeadline: true,
      isQuantitative: true,
      isRecurring: true,
      cadence: 'weekly',
      cadenceTimes: 1,
    });
  });

  it('treats null/undefined cadence as none', () => {
    expect(planKind({ cadence: null }).cadence).toBe('none');
    expect(planKind({}).cadence).toBe('none');
    expect(planKind({ cadence: 'garbage' }).cadence).toBe('garbage'); // 透传，不做白名单校验
  });

  it('drops cadenceTimes when not recurring', () => {
    expect(planKind({ cadence: 'none', cadenceTimes: 3 }).cadenceTimes).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/rules/kind.test.ts`
Expected: FAIL — `Failed to resolve import "./kind"` 或 `planKind is not a function`。

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/rules/kind.ts
export type PlanCadence = 'none' | 'daily' | 'weekly';

export type PlanLike = {
  dueAt?: Date | null;
  targetValue?: number | null;
  cadence?: string | null;
  cadenceTimes?: number | null;
};

export type PlanKind = {
  hasDeadline: boolean;
  isQuantitative: boolean;
  isRecurring: boolean;
  cadence: PlanCadence;
  cadenceTimes: number | null;
};

export function planKind(plan: PlanLike): PlanKind {
  const cadence = (plan.cadence ?? 'none') as PlanCadence;
  const isRecurring = cadence !== 'none';
  return {
    hasDeadline: plan.dueAt != null,
    isQuantitative: plan.targetValue != null,
    isRecurring,
    cadence,
    cadenceTimes: isRecurring && plan.cadenceTimes != null ? plan.cadenceTimes : null,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/rules/kind.test.ts`
Expected: PASS（7 用例）。

- [ ] **Step 5: Commit**

```bash
git add src/lib/rules/kind.ts src/lib/rules/kind.test.ts
git commit -m "feat(rules): add planKind facet descriptor"
```

---

### Task 2: `computeStreak` 支持 weekly

**Files:**
- Modify: `src/lib/rules/streak.ts`
- Test: `src/lib/rules/streak.test.ts`

**Interfaces:**
- Consumes: `PlanCadence` from `./kind`（Task 1）。
- Produces: `computeStreak(checkIns, today, cadence='daily', cadenceTimes?)`；导出 `mondayOf(d: Date): Date`、`weekMondayKey(d: Date): string`（非 padding，供 plan.ts 算本周计数复用，与 streak 内部周界一致）。现有 2 参调用（`computeStreak(cis, today)`）默认 `'daily'`，行为不变。

- [ ] **Step 1: Write the failing test（追加到现有 `streak.test.ts` 末尾，`describe` 块内）**

```ts
// 追加到 src/lib/rules/streak.test.ts 的 describe('computeStreak', ...) 内
// 2026-07-06 是周一；2026-07-08 是周三（本周）。
const w = (y: number, m: number, d: number) => new Date(y, m - 1, d, 10, 0, 0);
const THIS_WEEK = w(2026, 7, 8); // 周三
const LAST_WEEK = w(2026, 6, 30); // 上周三（周一 06-29 那周）
const TWO_WEEKS_AGO = w(2026, 6, 23); // 上上周三（周一 06-22 那周）

it('weekly: returns 0 when cadence none', () => {
  expect(computeStreak([{ occurredAt: THIS_WEEK }], THIS_WEEK, 'none')).toEqual({ current: 0, longest: 0 });
});

it('weekly: this week met (N=3) → current 1, longest 1', () => {
  const cis = [w(2026, 7, 6), w(2026, 7, 7), w(2026, 7, 8)];
  expect(computeStreak(cis, THIS_WEEK, 'weekly', 3)).toEqual({ current: 1, longest: 1 });
});

it('weekly: this week not met but last week met → grace, current 1', () => {
  // 本周 2 次（<3），上周 3 次（周一 06-29/30/07-01）
  const cis = [w(2026, 7, 6), w(2026, 7, 7), w(2026, 6, 29), w(2026, 6, 30), w(2026, 7, 1)];
  expect(computeStreak(cis, THIS_WEEK, 'weekly', 3)).toEqual({ current: 1, longest: 1 });
});

it('weekly: this week + last week both met, gap before → current 2, longest 2', () => {
  // 本周 3、上周 3、上上周 0
  const cis = [
    w(2026, 7, 6), w(2026, 7, 7), w(2026, 7, 8),
    w(2026, 6, 29), w(2026, 6, 30), w(2026, 7, 1),
  ];
  expect(computeStreak(cis, THIS_WEEK, 'weekly', 3)).toEqual({ current: 2, longest: 2 });
});

it('weekly: three consecutive weeks met (N=1) → current 3, longest 3', () => {
  const cis = [w(2026, 7, 6), w(2026, 6, 29), w(2026, 6, 22)];
  expect(computeStreak(cis, THIS_WEEK, 'weekly', 1)).toEqual({ current: 3, longest: 3 });
});

it('weekly: this week 1 (<2) and last week 0 → current 0, longest 0', () => {
  const cis = [w(2026, 7, 6)];
  expect(computeStreak(cis, THIS_WEEK, 'weekly', 2)).toEqual({ current: 0, longest: 0 });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/rules/streak.test.ts`
Expected: FAIL — weekly 用例报 `current`/`longest` 不符（现有实现忽略 cadence 参数，按日算）。

- [ ] **Step 3: Write minimal implementation**

替换 `src/lib/rules/streak.ts` 全文：

```ts
// src/lib/rules/streak.ts
import type { PlanCadence } from './kind';

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

// ISO 周一为起点
export function mondayOf(d: Date): Date {
  const diff = (d.getDay() + 6) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff);
}

export function weekMondayKey(d: Date): string {
  return toDayKey(mondayOf(d));
}

function computeDailyStreak(checkIns: CheckInDate[], today: Date): { current: number; longest: number } {
  const set = new Set<string>();
  for (const c of checkIns) {
    const d = c.occurredAt;
    if (dayDiff(d, today) < 0) continue; // 未来打卡不计入
    set.add(toDayKey(d));
  }
  let current = 0;
  let cursor = new Date(today);
  if (!set.has(toDayKey(cursor))) {
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1);
  }
  while (set.has(toDayKey(cursor))) {
    current += 1;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1);
  }
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

function computeWeeklyStreak(checkIns: CheckInDate[], today: Date, cadenceTimes: number): { current: number; longest: number } {
  const counts = new Map<string, number>();
  for (const c of checkIns) {
    if (dayDiff(c.occurredAt, today) < 0) continue; // 未来打卡不计入
    const k = weekMondayKey(c.occurredAt);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const qualifies = (mondayKey: string) => (counts.get(mondayKey) ?? 0) >= cadenceTimes;

  // current：从本周往回数；本周未达标则跳过（宽限），从上周起算
  let current = 0;
  let cursor = mondayOf(today);
  if (!qualifies(weekMondayKey(cursor))) {
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 7);
  }
  while (qualifies(weekMondayKey(cursor))) {
    current += 1;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 7);
  }

  // longest：达标周一按时间排序，扫连续段（相邻周一相差 7 天）
  const mondays = [...counts.keys()]
    .map((k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m, d); })
    .filter((mo) => qualifies(weekMondayKey(mo)))
    .sort((a, b) => a.getTime() - b.getTime());
  let longest = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const mo of mondays) {
    if (prev && dayDiff(prev, mo) === 7) run += 1;
    else run = 1;
    longest = Math.max(longest, run);
    prev = mo;
  }
  return { current, longest: Math.max(longest, current) };
}

export function computeStreak(
  checkIns: CheckInDate[],
  today: Date,
  cadence: PlanCadence = 'daily',
  cadenceTimes?: number,
): { current: number; longest: number } {
  if (cadence === 'none') return { current: 0, longest: 0 };
  if (cadence === 'weekly') return computeWeeklyStreak(checkIns, today, cadenceTimes ?? 1);
  return computeDailyStreak(checkIns, today);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/rules/streak.test.ts`
Expected: PASS（原 6 个 daily 用例 + 新 6 个 weekly 用例）。daily 用例用 2 参调用，默认 `'daily'`，行为不变。

- [ ] **Step 5: Commit**

```bash
git add src/lib/rules/streak.ts src/lib/rules/streak.test.ts
git commit -m "feat(rules): computeStreak supports weekly cadence with grace"
```

---

### Task 3: Schema 加 cadence/cadenceTimes（保留 type 做 bridge）+ 数据层

**Files:**
- Modify: `prisma/schema.prisma`（`Plan` model）
- Modify: `src/lib/server/actions/plan.ts`
- Modify: `src/lib/server/actions/checkin.ts`
- Test: `tests/integration/overview.test.ts`（修断言）、`tests/integration/checkin.test.ts`（加 weekly 用例）

**Interfaces:**
- Consumes: `computeStreak` 新签名（Task 2）、`weekMondayKey`（Task 2）、`PlanCadence`（Task 1）。
- Produces: `PlanOverview` 增加 `thisPeriodCount: number | null`（weekly = 本周打卡数，其余 null）；`createPlan` 入参增加可选 `cadence`/`cadenceTimes`，`type` 改可选；`getPlanProgress` 返回增加 `thisPeriodCount`。桥接：未传 `cadence` 时从 `type` 派生。

- [ ] **Step 1: 改 schema 并生成迁移**

`prisma/schema.prisma` 的 `model Plan` 中，把 `type String` 改为可空并加两字段：

```prisma
model Plan {
  id          String     @id @default(cuid())
  userId      String
  title       String
  description String     @default("")
  type        String?    // 桥接期保留，Task 7 删除
  cadence     String     @default("none") // none | daily | weekly
  cadenceTimes Int?
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
```

生成迁移：

```bash
npx prisma migrate dev --name plan_cadence
```

迁移生成后，**编辑** `prisma/migrations/<timestamp>_plan_cadence/migration.sql`，在 `ALTER TABLE "Plan" ADD COLUMN "cadence" ...` 之后、最终之前，加一行回填（用生成 SQL 里的同款引号风格）：

```sql
UPDATE "Plan" SET "cadence" = 'daily' WHERE "type" = 'ongoing';
```

再跑一次让开发库应用：

```bash
npx prisma migrate dev  # 已是最新则无操作；确认 dev.db 已应用
npm run db:generate
```

- [ ] **Step 2: 写失败的集成测试（先加 weekly 用例 + 修 overview 断言）**

在 `tests/integration/checkin.test.ts` 的 `describe` 末尾追加：

```ts
  it('computes weekly streak and this-period count for a weekly plan', async () => {
    const plan = await createPlan({ title: '每周跑', cadence: 'weekly', cadenceTimes: 3 });
    const today = new Date();
    // 本周打 3 次（同日多次也计入本周计数）
    await createCheckIn({ planId: plan.id, occurredAt: today });
    await createCheckIn({ planId: plan.id, occurredAt: today });
    await createCheckIn({ planId: plan.id, occurredAt: today });
    const agg = await getPlanProgress(plan.id);
    expect(agg.streak.current).toBe(1); // 本周达标
    expect(agg.thisPeriodCount).toBe(3);
  });
```

在 `tests/integration/overview.test.ts` 把 deadline 的 streak 断言改掉（终点·量化不再算 streak）：

```ts
// 原：expect(d.streak.current).toBeGreaterThanOrEqual(1);
    expect(d.streak.current).toBe(0); // 量化终点计划非循环，不算 streak
    expect(d.thisPeriodCount).toBeNull(); // 非周节奏
```

（`o` 的 `expect(o.streak.current).toBeGreaterThanOrEqual(1);` 保持。）

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/integration/checkin.test.ts tests/integration/overview.test.ts`
Expected: FAIL — `getPlanProgress` 无 `thisPeriodCount` 字段；`createPlan` 不收 `cadence`；`PlanOverview` 无 `thisPeriodCount`。

- [ ] **Step 4: 改 `plan.ts`**

替换 `src/lib/server/actions/plan.ts` 顶部相关部分（imports + `createPlan` + `PlanOverview` + `listActivePlansOverview`）。`getPlan`/`updatePlan`/`setPlanStatus` 不变。完整新版：

```ts
import 'server-only';
import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/server/context';
import { touch, ActionError } from './_shared';
import { sumProgress } from '@/lib/rules/progress';
import { computeStreak, weekMondayKey } from '@/lib/rules/streak';
import { planKind } from '@/lib/rules/kind';
import type { PlanCadence } from '@/lib/rules/kind';
import type { Plan } from '@prisma/client';

export type PlanType = 'deadline' | 'ongoing'; // 桥接期保留，Task 7 删除
export type PlanStatus = 'active' | 'paused' | 'done' | 'archived';

export async function createPlan(input: {
  title: string;
  type?: PlanType | null; // 桥接期可选
  cadence?: PlanCadence;
  cadenceTimes?: number;
  targetValue?: number;
  targetUnit?: string;
  dueAt?: Date;
  description?: string;
}): Promise<Plan> {
  const userId = await getCurrentUserId();
  // 桥接：未传 cadence 时从 type 派生（保证旧调用方绿）。Task 7 移除。
  const cadence: PlanCadence = input.cadence ?? (input.type === 'ongoing' ? 'daily' : 'none');
  const plan = await prisma.plan.create({
    data: {
      userId,
      title: input.title,
      type: input.type ?? null,
      cadence,
      cadenceTimes: input.cadenceTimes ?? null,
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

export type PlanOverview = Plan & {
  progress: number;
  streak: { current: number; longest: number };
  thisPeriodCount: number | null;
};

// 仪表盘用：活跃计划 + 进度/streak。个人量级 N+1 可接受。
export async function listActivePlansOverview(): Promise<PlanOverview[]> {
  const userId = await getCurrentUserId();
  const plans = await prisma.plan.findMany({
    where: { userId, status: 'active' },
    orderBy: { createdAt: 'desc' },
  });
  const now = new Date();
  const result: PlanOverview[] = [];
  for (const plan of plans) {
    const cis = await prisma.checkIn.findMany({
      where: { planId: plan.id, userId },
      select: { value: true, occurredAt: true },
    });
    const cadence = plan.cadence as PlanCadence;
    const thisWeek = weekMondayKey(now);
    result.push({
      ...plan,
      progress: sumProgress(cis),
      streak: computeStreak(cis, now, cadence, plan.cadenceTimes ?? undefined),
      thisPeriodCount: cadence === 'weekly'
        ? cis.filter((c) => weekMondayKey(c.occurredAt) === thisWeek).length
        : null,
    });
  }
  return result;
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

> 注意：`planKind` 此处暂未在 `listActivePlansOverview` 使用（留给 Task 5 的 UI 消费），但已 import 备用；若 lint 报未使用，先在 Task 5 之前不导入它——即在 `listActivePlansOverview` 里直接用 `plan.cadence as PlanCadence` 即可，把 `import { planKind }` 这行去掉，Task 5 再按需引入。**实现时：不要 import 未用符号，去掉 `planKind` 的 import。**

- [ ] **Step 5: 改 `checkin.ts` 的 `getPlanProgress`**

`src/lib/server/actions/checkin.ts` 中 `getPlanProgress` 改为同时读 plan 的 cadence：

```ts
import 'server-only';
import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/server/context';
import { touch, ActionError } from './_shared';
import { sumProgress } from '@/lib/rules/progress';
import { computeStreak, weekMondayKey } from '@/lib/rules/streak';
import type { PlanCadence } from '@/lib/rules/kind';
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
  thisPeriodCount: number | null;
}> {
  const userId = await getCurrentUserId();
  const [plan, cis] = await Promise.all([
    prisma.plan.findFirst({
      where: { id: planId, userId },
      select: { cadence: true, cadenceTimes: true },
    }),
    prisma.checkIn.findMany({
      where: { planId, userId },
      select: { value: true, occurredAt: true },
    }),
  ]);
  const cadence = (plan?.cadence ?? 'none') as PlanCadence;
  const now = new Date();
  return {
    progress: sumProgress(cis),
    streak: computeStreak(cis, now, cadence, plan?.cadenceTimes ?? undefined),
    thisPeriodCount: cadence === 'weekly'
      ? cis.filter((c) => weekMondayKey(c.occurredAt) === weekMondayKey(now)).length
      : null,
  };
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run tests/integration/checkin.test.ts tests/integration/overview.test.ts`
Expected: PASS。weekly 用例 streak=1、thisPeriodCount=3；overview deadline streak=0。

- [ ] **Step 7: 全量回归 + 类型检查**

```bash
npm test
npx tsc --noEmit
```
Expected: 全绿。现有 `plan/milestone/task/review/reminder` 集成测试仍用 `type:`，bridge 派生 cadence，行为不变。

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/lib/server/actions/plan.ts src/lib/server/actions/checkin.ts tests/integration/checkin.test.ts tests/integration/overview.test.ts
git commit -m "feat(plan): add cadence/cadenceTimes facets (bridge from type)"
```

---

### Task 4: 新建计划表单改为模板选择器

**Files:**
- Modify: `src/app/plans/new/PlanForm.tsx`
- Modify: `src/app/plans/new/PlanForm.test.tsx`
- Modify: `src/app/actions.ts`（`createPlanAction`）

**Interfaces:**
- Consumes: `createPlan`（Task 3，收 `cadence`/`cadenceTimes`，不再需要 `type`）。
- Produces: `createPlanAction` 按 `template` 解析 facet，向 `createPlan` 传 `cadence`/`cadenceTimes`/`targetValue`/`targetUnit`/`dueAt`，不传 `type`。`PlanForm` 5 模板切换显隐 facet。

- [ ] **Step 1: 改写组件测试**

替换 `src/app/plans/new/PlanForm.test.tsx` 全文（按 `name`/label 断言，不再依赖 token 占位符）：

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { PlanForm } from './PlanForm';

vi.mock('@/app/actions', () => ({
  createPlanAction: vi.fn(),
}));

afterEach(cleanup);

describe('PlanForm', () => {
  it('deadline-quant 模板默认显示目标值/单位/截止日', () => {
    render(<PlanForm />);
    fireEvent.click(screen.getByLabelText(/终点·量化/));
    expect(screen.getByLabelText('目标值')).toBeInTheDocument();
    expect(screen.getByLabelText('单位')).toBeInTheDocument();
    expect(screen.getByLabelText('截止日期')).toBeInTheDocument();
    expect(screen.queryByLabelText('每周次数')).not.toBeInTheDocument();
  });

  it('milestone 模板只显示截止日', () => {
    render(<PlanForm />);
    fireEvent.click(screen.getByLabelText(/终点·里程碑/));
    expect(screen.getByLabelText('截止日期')).toBeInTheDocument();
    expect(screen.queryByLabelText('目标值')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('每周次数')).not.toBeInTheDocument();
  });

  it('daily 模板不显示目标/截止/周次数', () => {
    render(<PlanForm />);
    fireEvent.click(screen.getByLabelText(/每日练习/));
    expect(screen.queryByLabelText('目标值')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('截止日期')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('每周次数')).not.toBeInTheDocument();
  });

  it('weekly 模板显示每周次数', () => {
    render(<PlanForm />);
    fireEvent.click(screen.getByLabelText(/每周练习/));
    expect(screen.getByLabelText('每周次数')).toBeInTheDocument();
    expect(screen.queryByLabelText('目标值')).not.toBeInTheDocument();
  });

  it('custom 模板显示全部 facet（含 cadence 选择）', () => {
    render(<PlanForm />);
    fireEvent.click(screen.getByLabelText(/自定义/));
    expect(screen.getByLabelText('目标值')).toBeInTheDocument();
    expect(screen.getByLabelText('截止日期')).toBeInTheDocument();
    expect(screen.getByLabelText('节奏')).toBeInTheDocument(); // cadence select
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/plans/new/PlanForm.test.tsx`
Expected: FAIL — 找不到 `/终点·量化/` label 等（旧表单是 radio `终点型`）。

- [ ] **Step 3: 改写 `PlanForm.tsx`**

替换全文：

```tsx
'use client';

import { useActionState, useState } from 'react';
import { createPlanAction, type ActionState } from '@/app/actions';

type Template = 'deadline-quant' | 'milestone' | 'daily' | 'weekly' | 'custom';

const inputCls = 'w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700';

export function PlanForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createPlanAction,
    {},
  );
  const [tpl, setTpl] = useState<Template>('deadline-quant');
  const [cadence, setCadence] = useState<'none' | 'daily' | 'weekly'>('none');

  const showTarget = tpl === 'deadline-quant' || tpl === 'custom';
  const showDue = tpl === 'deadline-quant' || tpl === 'milestone' || tpl === 'custom';
  const showCadenceTimes = tpl === 'weekly' || (tpl === 'custom' && cadence === 'weekly');
  const showCadenceSelect = tpl === 'custom';

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="template" value={tpl} />

      <div className="space-y-1">
        <label htmlFor="title" className="text-sm font-medium">标题</label>
        <input id="title" name="title" required placeholder="给计划起个名字" className={inputCls} />
      </div>

      <div className="space-y-1">
        <span className="text-sm font-medium">模板</span>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {([
            ['deadline-quant', '终点·量化'],
            ['milestone', '终点·里程碑'],
            ['daily', '每日练习'],
            ['weekly', '每周练习'],
            ['custom', '自定义'],
          ] as const).map(([value, label]) => (
            <label key={value} className="flex items-center gap-1">
              <input
                type="radio"
                name="template-radio"
                value={value}
                checked={tpl === value}
                onChange={() => { setTpl(value); setCadence('none'); }}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="description" className="text-sm font-medium">描述</label>
        <textarea id="description" name="description" rows={2} placeholder="这个计划为什么重要？" className={inputCls} />
      </div>

      {showCadenceSelect && (
        <div className="space-y-1">
          <label htmlFor="cadence" className="text-sm font-medium">节奏</label>
          <select
            id="cadence"
            name="cadence"
            value={cadence}
            onChange={(e) => setCadence(e.target.value as 'none' | 'daily' | 'weekly')}
            className={inputCls}
          >
            <option value="none">无（一次性/里程碑驱动）</option>
            <option value="daily">每日</option>
            <option value="weekly">每周</option>
          </select>
        </div>
      )}

      {showCadenceTimes && (
        <div className="space-y-1">
          <label htmlFor="cadenceTimes" className="text-sm font-medium">每周次数</label>
          <input id="cadenceTimes" name="cadenceTimes" type="number" min={1} defaultValue={3} className={inputCls} />
        </div>
      )}

      {(showTarget || showDue) && (
        <div className="space-y-2">
          {showTarget && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="targetValue" className="text-sm font-medium">目标值</label>
                <input id="targetValue" name="targetValue" type="number" inputMode="decimal" placeholder="例如 100" className={inputCls} />
              </div>
              <div className="space-y-1">
                <label htmlFor="targetUnit" className="text-sm font-medium">单位</label>
                <input id="targetUnit" name="targetUnit" placeholder="次 / 篇 / 分钟…" className={inputCls} />
              </div>
            </div>
          )}
          {showDue && (
            <div className="space-y-1">
              <label htmlFor="dueAt" className="text-sm font-medium">截止日期</label>
              <input id="dueAt" name="dueAt" type="date" className={inputCls} />
            </div>
          )}
        </div>
      )}

      {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50 hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
      >
        {pending ? '创建中…' : '创建计划'}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: 改 `createPlanAction`（`src/app/actions.ts`）**

把现有 `createPlanAction` 函数体替换为按 template 解析（去掉 `type` 校验）：

```ts
export async function createPlanAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const title = str(fd, 'title');
  if (!title) return { error: '请填写标题' };
  const template = str(fd, 'template') || 'custom';

  // cadence：preset 由 template 决定；custom 读 cadence select
  let cadence: 'none' | 'daily' | 'weekly';
  if (template === 'daily') cadence = 'daily';
  else if (template === 'weekly') cadence = 'weekly';
  else if (template === 'custom') {
    const c = str(fd, 'cadence');
    cadence = c === 'daily' || c === 'weekly' ? c : 'none';
  } else cadence = 'none';

  const description = str(fd, 'description');

  let targetValue: number | undefined;
  let targetUnit: string | undefined;
  const tv = str(fd, 'targetValue');
  if (tv) {
    targetValue = Number(tv);
    if (Number.isNaN(targetValue)) return { error: '目标值需为数字' };
  }
  targetUnit = str(fd, 'targetUnit') || undefined;

  const d = str(fd, 'dueAt');
  const dueAt = d ? new Date(d) : undefined;

  let cadenceTimes: number | undefined;
  if (cadence === 'weekly') {
    const ct = str(fd, 'cadenceTimes');
    if (ct) {
      cadenceTimes = Number(ct);
      if (Number.isNaN(cadenceTimes)) return { error: '每周次数需为数字' };
    }
  }

  const plan = await createPlan({ title, description, cadence, cadenceTimes, targetValue, targetUnit, dueAt });
  redirect(`/plans/${plan.id}`);
}
```

同时把文件顶部 `import { ... type PlanType ... } from '@/lib/server/actions/plan'` 中的 `type PlanType` 去掉（`PlanStatus` 仍需保留）。即：

```ts
import {
  createPlan,
  updatePlan,
  setPlanStatus,
  type PlanStatus,
} from '@/lib/server/actions/plan';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/app/plans/new/PlanForm.test.tsx`
Expected: PASS（5 用例）。

- [ ] **Step 6: 类型检查 + 构建（验证 server/client 边界）**

```bash
npx tsc --noEmit
npm run build
```
Expected: 全绿。

- [ ] **Step 7: Commit**

```bash
git add src/app/plans/new/PlanForm.tsx src/app/plans/new/PlanForm.test.tsx src/app/actions.ts
git commit -m "feat(app): plan form template picker (5 presets, editable facets)"
```

---

### Task 5: 显示/编辑层切换到 `planKind` facet

**Files:**
- Modify: `src/app/ui/PlanCard.tsx`
- Modify: `src/app/plans/[id]/page.tsx`
- Modify: `src/app/plans/[id]/EditPlanForm.tsx`
- Modify: `src/app/plans/[id]/CheckInForm.tsx`
- Create: `src/app/ui/PlanCard.test.tsx`

**Interfaces:**
- Consumes: `planKind`（Task 1）、`PlanOverview.thisPeriodCount`（Task 3）、`Plan` 含 `cadence`/`cadenceTimes`。
- Produces: `PlanCard` 按 facet 分支；`CheckInForm` prop `isDeadline` → `isQuantitative`；plan page 里程碑区按 `hasDeadline || 有里程碑`、进度区按 `isQuantitative`、streak 区按 `isRecurring`。

- [ ] **Step 1: 写 PlanCard 组件测试**

新建 `src/app/ui/PlanCard.test.tsx`：

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { PlanCard } from './PlanCard';
import type { PlanOverview } from '@/lib/server/actions/plan';

vi.mock('next/link', () => ({ __esModule: true, default: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));

afterEach(cleanup);

const base = {
  id: 'p1', userId: 'u', title: '计划', description: '', type: null,
  cadence: 'none', cadenceTimes: null, status: 'active',
  targetValue: null, targetUnit: null, startAt: new Date(), dueAt: null, icon: null,
  createdAt: new Date(), updatedAt: new Date(),
  progress: 0, streak: { current: 0, longest: 0 }, thisPeriodCount: null,
} as PlanOverview;

describe('PlanCard', () => {
  it('量化计划显示进度数字', () => {
    render(<PlanCard plan={{ ...base, title: '读 30 本书', targetValue: 30, targetUnit: '本', progress: 12 }} />);
    expect(screen.getByText(/12/)).toBeInTheDocument();
    expect(screen.getByText(/30/)).toBeInTheDocument();
    expect(screen.queryByText(/连续/)).not.toBeInTheDocument();
  });

  it('daily 计划显示连续天数', () => {
    render(<PlanCard plan={{ ...base, cadence: 'daily', streak: { current: 5, longest: 9 } }} />);
    expect(screen.getByText(/连续 5 天/)).toBeInTheDocument();
  });

  it('weekly 计划显示本周次数 + 周连胜', () => {
    render(<PlanCard plan={{ ...base, title: '每周跑', cadence: 'weekly', cadenceTimes: 3, thisPeriodCount: 2, streak: { current: 4, longest: 6 } }} />);
    expect(screen.getByText(/本周 2\/3/)).toBeInTheDocument();
    expect(screen.getByText(/连续 4 周/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/ui/PlanCard.test.tsx`
Expected: FAIL — 当前 PlanCard 用 `plan.type`，weekly 用例无 `本周 X/N` 文案。

- [ ] **Step 3: 改 `PlanCard.tsx`**

替换全文：

```tsx
import Link from 'next/link';
import type { PlanOverview } from '@/lib/server/actions/plan';
import { planKind } from '@/lib/rules/kind';
import { ProgressBar } from './ProgressBar';

function formatDate(d: Date): string {
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

const STATUS_LABEL: Record<string, string> = {
  active: '进行中',
  paused: '已暂停',
  done: '已完成',
  archived: '已归档',
};

export function PlanCard({ plan }: { plan: PlanOverview }) {
  const kind = planKind(plan);
  const unit = plan.targetUnit ? ` ${plan.targetUnit}` : '';
  return (
    <Link
      href={`/plans/${plan.id}`}
      className="block rounded-lg border border-neutral-200 p-4 transition-colors hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="truncate font-medium">{plan.title}</h3>
        <span className="shrink-0 text-xs text-neutral-500">
          {STATUS_LABEL[plan.status] ?? plan.status}
        </span>
      </div>

      <div className="mt-3 space-y-1">
        {kind.isQuantitative ? (
          <>
            <ProgressBar value={plan.progress} target={plan.targetValue} />
            <div className="flex justify-between text-xs text-neutral-500">
              <span>{plan.progress.toLocaleString()}{unit} / {plan.targetValue?.toLocaleString() ?? '—'}{unit}</span>
              {plan.dueAt && <span>截止 {formatDate(plan.dueAt)}</span>}
            </div>
            {kind.isRecurring && kind.cadence === 'weekly' && plan.thisPeriodCount != null && (
              <span className="text-xs text-neutral-500">本周 {plan.thisPeriodCount}/{plan.cadenceTimes ?? 1} 次</span>
            )}
          </>
        ) : kind.isRecurring ? (
          <div className="flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400">
            {kind.cadence === 'weekly' ? (
              <>
                <span>本周 {plan.thisPeriodCount ?? 0}/{plan.cadenceTimes ?? 1} 次</span>
                <span>连续 {plan.streak.current} 周</span>
              </>
            ) : (
              <>
                <span>🔥 连续 {plan.streak.current} 天</span>
                <span>最长 {plan.streak.longest} 天</span>
              </>
            )}
          </div>
        ) : (
          plan.dueAt && <span className="text-xs text-neutral-500">截止 {formatDate(plan.dueAt)}</span>
        )}
      </div>
    </Link>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/ui/PlanCard.test.tsx`
Expected: PASS。

- [ ] **Step 5: 改 plan 详情页 `page.tsx`**

在 `src/app/plans/[id]/page.tsx` 顶部 import 加 `planKind`，并把 `isDeadline` 逻辑替换为 facet 分支。关键改动点（替换对应片段）：

顶部 import 块加入：

```ts
import { planKind } from '@/lib/rules/kind';
```

把 `const [tasks, checkIns, { progress, streak }, milestones] = ...` 改为解构 `thisPeriodCount`：

```ts
  const [tasks, checkIns, { progress, streak, thisPeriodCount }, milestones] = await Promise.all([
    listTasksByPlan(id),
    listCheckIns(id),
    getPlanProgress(id),
    listMilestonesByPlan(id),
  ]);
```

替换 `isDeadline` 块及 header/进度区/里程碑区/CheckInForm 调用：

```ts
  const kind = planKind(plan);
  const remaining = kind.isQuantitative && plan.targetValue ? Math.max(0, plan.targetValue - progress) : 0;
  const projected = kind.isQuantitative && plan.targetValue
    ? projectedFinishDate(progress, plan.targetValue, plan.startAt, now)
    : null;
  const showMilestones = kind.hasDeadline || milestones.length > 0;
```

header 里 `{isDeadline ? '终点型' : '持续型'}` 改为：

```tsx
          <span>{kind.hasDeadline ? '终点型' : '持续型'}</span>
```

进度/streak 区整段替换：

```tsx
      <section className="mt-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        {kind.isQuantitative ? (
          <div className="space-y-1">
            <ProgressBar value={progress} target={plan.targetValue} />
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-neutral-500">
              <span>
                {progress.toLocaleString()}{plan.targetUnit ? ` ${plan.targetUnit}` : ''}
                {' / '}{plan.targetValue?.toLocaleString() ?? '—'}{plan.targetUnit ? ` ${plan.targetUnit}` : ''}
              </span>
              <span>剩余 {remaining.toLocaleString()}{plan.targetUnit ? ` ${plan.targetUnit}` : ''}</span>
              {plan.dueAt && <span>截止 {plan.dueAt.toLocaleDateString('zh-CN')}</span>}
              {projected && <span>按当前速率预计 {projected.toLocaleDateString('zh-CN')} 达成</span>}
            </div>
          </div>
        ) : kind.isRecurring ? (
          <div className="flex items-center gap-4 text-sm">
            {kind.cadence === 'weekly' ? (
              <>
                <span>本周 {thisPeriodCount ?? 0}/{plan.cadenceTimes ?? 1} 次</span>
                <span className="text-neutral-500">连续 {streak.current} 周（最长 {streak.longest} 周）</span>
              </>
            ) : (
              <>
                <span>🔥 当前连续 {streak.current} 天</span>
                <span className="text-neutral-500">最长 {streak.longest} 天</span>
              </>
            )}
          </div>
        ) : (
          <p className="text-sm text-neutral-500">无量化目标，靠里程碑推进。</p>
        )}
      </section>
```

里程碑区门控改 `showMilestones`：

```tsx
      {showMilestones && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-medium text-neutral-500">里程碑</h2>
          <MilestoneList planId={plan.id} milestones={milestonesWithStatus} />
        </section>
      )}
```

`CheckInForm` 调用 `isDeadline={isDeadline}` 改 `isQuantitative`：

```tsx
        <CheckInForm planId={plan.id} isQuantitative={kind.isQuantitative} />
```

- [ ] **Step 6: 改 `CheckInForm.tsx`**

`src/app/plans/[id]/CheckInForm.tsx` 把 `{ planId, isDeadline }` 改为 `{ planId, isQuantitative }`，并把 `{isDeadline && (` 改 `{isQuantitative && (`，placeholder 通用化：

```tsx
export function CheckInForm({ planId, isQuantitative }: { planId: string; isQuantitative: boolean }) {
```

```tsx
      {isQuantitative && (
        <div>
          <label htmlFor="value" className="text-sm font-medium">
            数值（可选）
          </label>
          <input
            id="value"
            name="value"
            type="number"
            inputMode="decimal"
            placeholder="本次进展数值"
            className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
          />
        </div>
      )}
```

- [ ] **Step 7: 改 `EditPlanForm.tsx`**

`src/app/plans/[id]/EditPlanForm.tsx`：所有 facet 可编辑（不再按 type 门控显隐）。把 `isDeadline` 去掉，目标值/单位/截止日块去掉 `{isDeadline && (...)}` 包裹，恒显：

```tsx
import { useActionState } from 'react';
import { updatePlanAction, type ActionState } from '@/app/actions';
import type { Plan } from '@prisma/client';

function toDateInput(d: Date | null | undefined): string {
  if (!d) return '';
  return d.toISOString().slice(0, 10);
}

export function EditPlanForm({ plan }: { plan: Plan }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    updatePlanAction,
    {},
  );

  return (
    <details className="rounded-md border border-neutral-200 dark:border-neutral-800">
      <summary className="cursor-pointer px-3 py-2 text-sm">编辑计划</summary>
      <form action={formAction} className="space-y-3 p-3">
        <input type="hidden" name="id" value={plan.id} />
        <div>
          <label htmlFor={`edit-title-${plan.id}`} className="text-sm font-medium">标题</label>
          <input id={`edit-title-${plan.id}`} name="title" defaultValue={plan.title} className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700" />
        </div>
        <div>
          <label htmlFor={`edit-desc-${plan.id}`} className="text-sm font-medium">描述</label>
          <textarea id={`edit-desc-${plan.id}`} name="description" defaultValue={plan.description} rows={2} className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={`edit-value-${plan.id}`} className="text-sm font-medium">目标值</label>
            <input id={`edit-value-${plan.id}`} name="targetValue" type="number" defaultValue={plan.targetValue ?? ''} className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700" />
          </div>
          <div>
            <label htmlFor={`edit-unit-${plan.id}`} className="text-sm font-medium">单位</label>
            <input id={`edit-unit-${plan.id}`} name="targetUnit" defaultValue={plan.targetUnit ?? ''} className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700" />
          </div>
          <div className="col-span-2">
            <label htmlFor={`edit-due-${plan.id}`} className="text-sm font-medium">截止日期</label>
            <input id={`edit-due-${plan.id}`} name="dueAt" type="date" defaultValue={toDateInput(plan.dueAt)} className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700" />
          </div>
        </div>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button type="submit" disabled={pending} className="rounded-md bg-neutral-900 px-4 py-1.5 text-sm text-white disabled:opacity-50 hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300">
          {pending ? '保存中…' : '保存'}
        </button>
      </form>
    </details>
  );
}
```

> 注：编辑 cadence/cadenceTimes 暂不放进编辑表单（YAGNI，改节奏是少见操作，可重建计划）。`updatePlan` 也不收 cadence。如确需，后续再加。

- [ ] **Step 8: 类型检查 + 全量测试 + 构建**

```bash
npx tsc --noEmit
npm test
npm run build
```
Expected: 全绿。

- [ ] **Step 9: Commit**

```bash
git add src/app/ui/PlanCard.tsx src/app/ui/PlanCard.test.tsx src/app/plans/[id]/page.tsx src/app/plans/[id]/CheckInForm.tsx src/app/plans/[id]/EditPlanForm.tsx
git commit -m "refactor(app): branch plan display/edit on planKind facets, not type"
```

---

### Task 6: 提醒规则泛化到 cadence

**Files:**
- Modify: `src/lib/rules/reminder.ts`
- Modify: `src/lib/rules/reminder.test.ts`
- Modify: `src/lib/server/actions/reminder.ts`
- Modify: `tests/integration/reminder.test.ts`（加 weekly at-risk 用例）

**Interfaces:**
- Consumes: `PlanOverview.thisPeriodCount`/`streak`/`cadence`/`cadenceTimes`（Task 3）。
- Produces: `computeDueReminders` 的 `atRiskPlans` 项变为 `{ id; title; cadence: 'daily'|'weekly'; remaining: number }`；daily 用 `dayKey` 去重 + 「今天还没打卡」文案，weekly 用 `weekMondayKey`（reminder.ts 内已有的 padded 版）去重 + 「本周还差 N 次」文案。`runReminderScan` at-risk 检测改 cadence。

- [ ] **Step 1: 改纯规则测试**

`src/lib/rules/reminder.test.ts` 现有 `atRiskPlans: [{ id: 'p1', title: '学画画' }]` 要加字段；并追加 weekly 用例。改 `at20` helper 与现有用例：

把现有 `atRiskPlans: [{ id: 'p1', title: '学画画' }]` 改为：

```ts
        atRiskPlans: [{ id: 'p1', title: '学画画', cadence: 'daily', remaining: 1 }],
```

`combines all three types` 用例里的 `atRiskPlans` 改为：

```ts
        atRiskPlans: [
          { id: 'p1', title: 'x', cadence: 'daily', remaining: 1 },
          { id: 'p2', title: 'y', cadence: 'weekly', remaining: 2 },
        ],
```

并在 `describe` 末尾追加：

```ts
  it('emits weekly streak_risk with week-Monday key and remaining count', () => {
    const r = computeDueReminders(
      at20({ atRiskPlans: [{ id: 'pw', title: '每周跑', cadence: 'weekly', remaining: 2 }] }),
      AFTER, // 2026-07-07 周二 → 周一 2026-07-06
    );
    expect(r).toHaveLength(1);
    expect(r[0].type).toBe('streak_risk');
    expect(r[0].key).toBe('streak_risk:pw:2026-07-06');
    expect(r[0].title).toBe('「每周跑」本周还差 2 次');
    expect(r[0].body).toContain('别断签');
    expect(r[0].href).toBe('/plans/pw');
  });

  it('daily streak_risk keeps day key and today copy', () => {
    const r = computeDueReminders(
      at20({ atRiskPlans: [{ id: 'pd', title: '画画', cadence: 'daily', remaining: 1 }] }),
      AFTER,
    );
    expect(r[0].key).toBe('streak_risk:pd:2026-07-07');
    expect(r[0].title).toBe('「画画」今天还没打卡');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/rules/reminder.test.ts`
Expected: FAIL — 类型不匹配（缺 `cadence`/`remaining`）+ weekly 文案/key 不符。

- [ ] **Step 3: 改纯规则 `reminder.ts`**

替换 `ReminderInput` 的 `atRiskPlans` 类型与 `streak_risk` 产出循环：

```ts
export type ReminderInput = {
  settings: { dailyCheckHour: number };
  dueTasks: { id: string; title: string; planId: string }[];
  reviewDueWeek: boolean;
  atRiskPlans: { id: string; title: string; cadence: 'daily' | 'weekly'; remaining: number }[];
};
```

`for (const p of input.atRiskPlans)` 循环替换为：

```ts
  for (const p of input.atRiskPlans) {
    if (p.cadence === 'weekly') {
      out.push({
        type: 'streak_risk',
        key: `streak_risk:${p.id}:${weekMondayKey(now)}`,
        title: `「${p.title}」本周还差 ${p.remaining} 次`,
        body: '保持节奏，别断签。',
        href: `/plans/${p.id}`,
      });
    } else {
      out.push({
        type: 'streak_risk',
        key: `streak_risk:${p.id}:${dayKey(now)}`,
        title: `「${p.title}」今天还没打卡`,
        body: 'streak 即将断签，去打个卡吧。',
        href: `/plans/${p.id}`,
      });
    }
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/rules/reminder.test.ts`
Expected: PASS。

- [ ] **Step 5: 改 server action `reminder.ts` at-risk 检测**

`src/lib/server/actions/reminder.ts` 中 `atRiskPlans` 块替换（去 `p.type`，改 cadence；daily 仍查今日打卡，weekly 用 `thisPeriodCount`）：

```ts
  // at-risk：循环计划、streak>0、当前周期未达标
  const atRiskPlans: { id: string; title: string; cadence: 'daily' | 'weekly'; remaining: number }[] = [];
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  for (const p of activePlans) {
    const cadence = p.cadence as 'none' | 'daily' | 'weekly';
    if (cadence === 'none' || p.streak.current <= 0) continue;
    if (cadence === 'daily') {
      const checkedInToday = await prisma.checkIn.findFirst({
        where: { planId: p.id, userId, occurredAt: { gte: startOfToday, lt: endOfToday } },
        select: { id: true },
      });
      if (!checkedInToday) atRiskPlans.push({ id: p.id, title: p.title, cadence: 'daily', remaining: 1 });
    } else {
      const need = p.cadenceTimes ?? 1;
      const done = p.thisPeriodCount ?? 0;
      if (done < need) atRiskPlans.push({ id: p.id, title: p.title, cadence: 'weekly', remaining: need - done });
    }
  }
```

- [ ] **Step 6: 加集成测试 weekly at-risk**

`tests/integration/reminder.test.ts` 末尾追加（用 ISO 周一锚定上周/本周）：

```ts
  it('creates a weekly streak_risk notification when this week under target but last week met', async () => {
    const plan = await createPlan({ title: '周跑', cadence: 'weekly', cadenceTimes: 3 });
    // 上周打 3 次（满足）→ 周 streak >=1；本周 0 次 → at-risk
    const today = new Date();
    const diffToMonday = (today.getDay() + 6) % 7;
    const thisMonday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - diffToMonday);
    const lastMonday = new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() - 7);
    await createCheckIn({ planId: plan.id, occurredAt: lastMonday });
    await createCheckIn({ planId: plan.id, occurredAt: new Date(lastMonday.getTime() + 86400000) });
    await createCheckIn({ planId: plan.id, occurredAt: new Date(lastMonday.getTime() + 2 * 86400000) });

    const { created } = await runReminderScan();
    expect(created).toBeGreaterThanOrEqual(1);

    const userId = await getTestUserId();
    const risk = await prisma.notification.findFirst({
      where: { userId, type: 'streak_risk', payload: { contains: plan.id } },
    });
    expect(risk).not.toBeNull();
    const payload = JSON.parse(risk!.payload);
    expect(payload.title).toContain('本周还差');
    expect(payload.body).toContain('别断签');
  });
```

- [ ] **Step 7: Run integration tests**

Run: `npx vitest run tests/integration/reminder.test.ts`
Expected: PASS。注意该文件 `beforeAll` 设 `dailyCheckHour: 0`，扫描任意时刻产出。daily 用例（`streak-plan` 用 `type:'ongoing'` → bridge 派生 `daily`）仍绿。

- [ ] **Step 8: 全量回归**

```bash
npm test
npx tsc --noEmit
npm run build
```
Expected: 全绿。

- [ ] **Step 9: Commit**

```bash
git add src/lib/rules/reminder.ts src/lib/rules/reminder.test.ts src/lib/server/actions/reminder.ts tests/integration/reminder.test.ts
git commit -m "feat(reminder): cadence-aware streak risk (daily today / weekly this-week)"
```

---

### Task 7: 删 `type` 列 + 清测试夹具

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/lib/server/actions/plan.ts`（删 `PlanType`、bridge、`type` 入参/存储）
- Modify: `src/app/actions.ts`（确认无 `PlanType` 残留）
- Modify: `tests/integration/{plan,milestone,overview,checkin,task,review,reminder}.test.ts`（删 `type:`、token 夹具换中性）

**Interfaces:**
- 产出：`Plan` schema 无 `type`；`createPlan` 不收 `type`、无 bridge；所有测试用 `cadence`/中性夹具。

- [ ] **Step 1: 删 schema `type` 并迁移**

`prisma/schema.prisma` 的 `model Plan` 删去 `type String?` 行。生成迁移：

```bash
npx prisma migrate dev --name drop_plan_type
npm run db:generate
```

- [ ] **Step 2: 改 `plan.ts` 删 bridge/PlanType**

`src/lib/server/actions/plan.ts`：

- 删 `export type PlanType = 'deadline' | 'ongoing';`
- `createPlan` 入参删 `type?: PlanType | null;`，删 `const cadence: PlanCadence = input.cadence ?? (input.type === 'ongoing' ? 'daily' : 'none');`，改为 `const cadence: PlanCadence = input.cadence ?? 'none';`
- `prisma.plan.create` 的 `data` 删 `type: input.type ?? null,`

- [ ] **Step 3: 确认 `actions.ts` 无 `PlanType` 残留**

`src/app/actions.ts` 顶部 import 已在 Task 4 去掉 `type PlanType`；`grep` 确认：

```bash
grep -n "PlanType\|\.type" src/app/actions.ts
```
Expected: 无输出（或仅注释）。若有残留按需删。

- [ ] **Step 4: 改测试夹具（删 `type:`、token→中性）**

逐文件替换（`type: 'deadline'` 直接删该行；`type: 'ongoing'` 换成 `cadence: 'daily'`；`一亿 token/100000000/tokens` 换中性）：

`tests/integration/plan.test.ts`：
- 第 18-30 行 `creates a deadline plan with target` 用例：`title: '一亿 token'`→`'读 30 本书'`，删 `type: 'deadline',`，`targetValue: 100000000`→`30`，`targetUnit: 'tokens'`→`'本'`，断言 `toBe('一亿 token')`→`'读 30 本书'`、`toBe(100000000)`→`30`。
- 第 32-36 行 `ongoing` 用例：`type: 'ongoing'`→`cadence: 'daily'`，删 `expect(p.type).toBe('ongoing');`。
- 第 45、51、58 行 `createPlan({ title: ..., type: 'ongoing' })`→`{ title: ..., cadence: 'daily' }`。

`tests/integration/milestone.test.ts`：
- 第 23-28 行：`title:'一亿 token'`→`'读 30 本书'`，删 `type:'deadline',`，`targetValue:100000000`→`30`，`targetUnit:'tokens'`→`'本'`；其下 `25M/25000000`→`'10 本'/10`、`50M/50000000`→`'20 本'/20`，断言 `toBe(25000000)`→`10`。
- 第 47、56、64、72、88 行 `type: 'deadline'`：删该行。

`tests/integration/overview.test.ts`：
- 第 24-29 行 deadline：`title:'一亿 token'`→`'读 30 本书'`，删 `type:'deadline',`，`targetValue:100000000`→`30`，`targetUnit:'tokens'`→`'本'`。
- 第 31 行 ongoing：`type:'ongoing'`→`cadence:'daily'`。
- 第 49 行 `type:'ongoing'`→`cadence:'daily'`。
- 第 65、90 行 `type:'ongoing'`→`cadence:'daily'`。

`tests/integration/checkin.test.ts`：
- 第 14 行 `title:'token', type:'deadline', targetValue:100000000, targetUnit:'tokens'`→`title:'读书', cadence:'none', targetValue:30, targetUnit:'本'`（`cadence:'none'` 可省略，这里显式便于阅读；`value: 5_000_000`→`5`，断言 `toBe(5_000_000)`→`5`）。
- 第 21 行 `type:'deadline'`→删。
- 第 30 行 `type:'ongoing'`→`cadence:'daily'`。
- 第 41 行 `type:'deadline', targetValue:100`→`cadence:'none', targetValue:100`（或省略 cadence）。
- Task 3 加的 weekly 用例不动。

`tests/integration/task.test.ts`：
- 第 20、27、35、42 行 `type: 'ongoing'`→`cadence: 'daily'`。

`tests/integration/review.test.ts`：
- 第 42 行 `type:'ongoing'`→`cadence:'daily'`。
- 第 94-99 行 `type:'deadline', targetValue:100, targetUnit:'x'`→`cadence:'none', targetValue:100, targetUnit:'x'`（或省略 cadence）。

`tests/integration/reminder.test.ts`：
- 第 26、47、64 行 `type: 'ongoing'`→`cadence: 'daily'`。
- Task 6 加的 weekly 用例不动。

- [ ] **Step 5: 全量回归 + 类型 + 构建**

```bash
npm test
npx tsc --noEmit
npm run build
```
Expected: 全绿。无任何 `type:` 残留、无 token 字面量。

- [ ] **Step 6: 残留扫描**

```bash
grep -rn "一亿\|100000000\|'tokens'\|PlanType\|plan\.type\|\.type === 'deadline'\|\.type === 'ongoing'" src tests prisma
```
Expected: 无输出（或仅注释/非业务命中）。命中则清理。

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/lib/server/actions/plan.ts src/app/actions.ts tests/integration
git commit -m "refactor(plan): drop type column, neutralize token test fixtures"
```

---

### Task 8: 文档更新

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-07-06-plan-track-summarize-design.md`

- [ ] **Step 1: README「建计划」段落反映模板**

`README.md` 第 48-50 行「建计划」段，把「选终点型/持续型」改为模板说法：

```markdown
1. **建计划**：访问 `/plans/new`
   - 选模板（终点·量化 / 终点·里程碑 / 每日练习 / 每周练习 / 自定义）→ 按需填标题/目标值/单位/截止日/每周次数 → 创建，跳转到计划详情页。各 facet 独立可编辑，组合而非二选一。
```

并在「架构约定」补一句单用户之外的本期重点：

```markdown
- **计划模型为正交 facet**：`cadence`（none/daily/weekly）+ `targetValue?` + `dueAt?` 独立组合，UI 按模板预填但可改；不再有 `type` 二分枚举。
```

- [ ] **Step 2: 旧设计文档标注 token 为示例之一**

`docs/superpowers/specs/2026-07-06-plan-track-summarize-design.md` 第 14 行「典型场景」改为：

```markdown
- 终点型目标（示例）：年度"用一亿 token 做 AI 编程"——拆里程碑、累计进度对照目标。（仅为示例之一；模型支持任意量化/非量化、每日/每周组合，见 2026-07-08 通用化设计）
- 持续型目标（示例）："学画画"——无终点，靠每日打卡 + streak 维持；"每周跑 3 次"——周节奏 + 周连胜。
```

第 66 行「设计逻辑」的 `一亿 token` 示例前加「（示例）」并补一行 weekly：

```markdown
- **每周跑 3 次**（示例）：`Plan(cadence=weekly, cadenceTimes=3)` → 每周打卡记 `CheckIn`，本周计数对照 cadenceTimes，周 streak = 连续达标周。
```

- [ ] **Step 3: Commit**

```bash
git add README.md docs/superpowers/specs/2026-07-06-plan-track-summarize-design.md
git commit -m "docs: reflect cadence-facet plan model, mark token as one example"
```

---

## Self-Review（已自查）

1. **Spec coverage**：§2 表层清理 → Task 4（表单占位符）+ Task 7（测试夹具）+ Task 8（文档）；§3 数据模型 → Task 3 + Task 7；§4 UI → Task 4 + Task 5；§5 streak → Task 2；§6 提醒 → Task 6；§7 迁移与测试 → Task 3/6/7。`planKind` → Task 1。全覆盖。
2. **Placeholder scan**：无 TBD/TODO；每个代码步骤都有完整代码；测试夹具替换有具体值（`读 30 本书/30/本`）。
3. **Type consistency**：`PlanCadence` 定义于 Task 1 `kind.ts`，Task 2/3/6 均从 `kind` 导入；`computeStreak` 签名 Task 2 定 `(checkIns, today, cadence='daily', cadenceTimes?)`，Task 3 调用 `(cis, now, cadence, plan.cadenceTimes ?? undefined)` 一致；`PlanOverview.thisPeriodCount` Task 3 加入，Task 5/6 消费一致；`atRiskPlans` 项 Task 6 改 `{id,title,cadence,remaining}`，规则与 action 两处一致。
4. **绿色提交**：Task 3 的 bridge 保证 Task 3–6 期间旧 `type:` 测试不破；Task 7 才删列并改测试，顺序无破窗。

## 执行选择

**Plan complete and saved to `docs/superpowers/plans/2026-07-08-generalize-plan-model.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
