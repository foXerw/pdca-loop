# 计划模型通用化 · 设计文档

- **日期**：2026-07-08
- **状态**：已通过设计评审，待用户复审
- **背景**：初版设计里「一亿 token」只是举例场景，却漏进了 UI 占位符与测试数据，使应用看起来像「token 计数器」专用工具。更深层的问题是 `Plan.type` 这个二分枚举把三个互相独立的问题耦合在了一起：有没有截止日、有没有数值目标、节奏是什么。本设计清理表层硬编码，并把模型重设为正交 facet，让「ship v1 by Q3」「每周跑 3 次」这类当前无法表达的计划成为一等公民。
- **路线**：方案 B（干净重设）——删 `type`，存 facet，逻辑全部从 facet 推导。

## 1. 目标与非目标

### 目标
1. 清掉产品表面所有「一亿 token」硬编码痕迹，读起来像通用计划跟踪工具。
2. 把「终点型 / 持续型」二分拆成正交 facet：截止日、量化目标、节奏三者独立可组合。
3. 让以下新组合成为一等公民：里程碑驱动的终点计划（有截止日、无数值目标）、每周 N 次的持续计划、带周节奏的量化终点计划。
4. 节奏从「每日」泛化到「每日 / 每周 N 次」，streak 与提醒随之泛化。

### 非目标（YAGNI）
- 月度 / 自定义 cron 节奏（`cadence` 字段结构上可扩展，本期不实现）。
- 可配置周起点（硬编码 ISO 周一，复用现有 `weekMondayKey`）。
- 周 streak 的「当前未完成周不中断」之外的宽限逻辑。
- 多用户、注册登录、邮件/短信通道等初版已排除项。

## 2. 表层清理（所有方案共有，基线）

- `src/app/plans/new/PlanForm.tsx`：标题占位符 `例如：一亿 token / 学画画` → 通用文案；目标值占位符 `100000000` → `例如 100`；单位占位符 `tokens` → `次 / 篇 / 分钟…`。
- `src/app/plans/new/PlanForm.test.tsx`：不再断言 `getByPlaceholderText('100000000')` / `('tokens')`，改按 `name` / label 断言条件字段显隐。
- 集成测试（`plan/milestone/overview/checkin`）：将 `一亿 token / 100000000 / tokens` 夹具换成中性值（如 `读 30 本书 / 30 / 本`），断言行为而非 token 叙事。
- 初版设计文档 `2026-07-06-plan-track-summarize-design.md`：把「一亿 token」场景标为「示例之一」，补上新组合作为示例。

## 3. 数据模型

`Plan` 变更：

| 字段 | 动作 | 说明 |
|---|---|---|
| `type String` | **删除** | 二分枚举是耦合根源 |
| `cadence String @default("none")` | **新增** | `none \| daily \| weekly` |
| `cadenceTimes Int?` | **新增** | 周节奏的目标次数/周，仅 `cadence=weekly` 有意义 |
| `targetValue Float?` | 保留 | 已可选 |
| `targetUnit String?` | 保留 | 已可选 |
| `dueAt DateTime?` | 保留 | 已可选 |

迁移：从旧 `type` 回填 `cadence`（`ongoing → daily`、`deadline → none`），再删 `type` 列。开发库 `dev.db` 由 `npm run db:migrate` 重建，测试库由 `resetTestDb` 的 `migrate deploy` 自动跟上，无线上数据顾虑。

### 派生 kind

新增纯函数 `planKind(plan)`：

```ts
type PlanKind = {
  hasDeadline: boolean;     // dueAt != null
  isQuantitative: boolean;  // targetValue != null
  isRecurring: boolean;     // cadence !== 'none'
  cadence: 'none' | 'daily' | 'weekly';
  cadenceTimes: number | null;
};
```

所有消费方（UI、提醒）按 facet 分支，不再读 `type`。

### 首要组合矩阵

| hasDeadline | isQuantitative | cadence | 示例 | 旧类型 |
|---|---|---|---|---|
| ✓ | ✓ | none | 年度一亿 token | deadline |
| ✓ | ✗ | none | Q3 上线 v1（里程碑驱动） | **新** |
| ✗ | ✗ | daily | 学画画 / 每日练习 | ongoing |
| ✗ | ✗ | weekly(3) | 每周跑 3 次 | **新** |
| ✓ | ✓ | weekly(1) | 年底前每周写 1 篇共 52 篇 | **新** |

## 4. UI

### 新建计划表单 `PlanForm.tsx`
- 二选一 radio → **模板选择器**：终点·量化 / 终点·里程碑 / 每日练习 / 每周练习 / 自定义。
- 选模板 = 预填 facet（`dueAt`、`targetValue/Unit`、`cadence/cadenceTimes`），但**每个 facet 仍可独立编辑**——这是解耦的核心。
- 「自定义」展示全部 facet 空白。
- 「每周练习」展示 `cadenceTimes` 输入（每周目标次数）。

### 仪表盘卡片 `PlanCard.tsx`
按 facet 分支（不再 `isDeadline`）：
- `isQuantitative` → 进度条（累计值 / 目标值）。
- 否则 `isRecurring` → streak：daily `🔥 连续 N 天`；weekly `本周 X/N · 连续 N 周`。
- 否则有里程碑 → `X/Y 里程碑 · 截止 …`。
- 否则 → 仅状态 + 截止日。
- 量化且循环的计划（如每周写 1 篇共 52 篇）：主显进度条，附小号 streak chip。

### 计划详情页 `plans/[id]/page.tsx`
- 里程碑区：只要计划**有**里程碑就显示（不再按 type 门控）。
- 打卡/streak 区：`isRecurring` 时显示。
- 进度 + 预计达成日：`isQuantitative` 时显示。
- 三者可同时出现（量化+循环+里程碑）。

### 编辑表单 `EditPlanForm.tsx`
所有 facet 可编辑，与新建一致。

## 5. streak 规则（唯一新逻辑）

泛化 `src/lib/rules/streak.ts` 的 `computeStreak`：

```ts
computeStreak(
  checkIns: { occurredAt: Date }[],
  today: Date,
  cadence: 'none' | 'daily' | 'weekly',
  cadenceTimes?: number,
): { current: number; longest: number }
```

- **none**：直接返回 `{ current: 0, longest: 0 }`（非循环计划不算 streak）。
- **daily**：现有日 streak，含「今日未打卡不立即断签」宽限，逻辑不变。
- **weekly**：按 ISO 周分组（复用 `weekMondayKey`）。某周「达标」= 该周打卡数 ≥ `cadenceTimes`。
  - `current`：从本周往回数连续达标周；**宽限**——若本周尚未达标，跳过本周从上周起算（对应「今日未打卡不立即断日 streak」）。
  - `longest`：全序列中最长的连续达标周段。
  - 边界用例（TDD 锁死）：本周未结束、部分周、断档周、`cadenceTimes=3` 而本周只打了 2 次。

`plan.ts` 的 `listActivePlansOverview` 调用 `computeStreak` 时按 `plan.cadence` 传参（含 `none`）。

## 6. 提醒规则

### 纯函数 `src/lib/rules/reminder.ts`
扩展 `atRiskPlans` 输入项：

```ts
atRiskPlans: { id: string; title: string; cadence: 'daily' | 'weekly'; remaining: number }[];
```

- daily：`remaining = 1`（今日那一次）。
- weekly：`remaining = cadenceTimes − 本周已打卡数`。

`computeDueReminders` 按 cadence 出不同文案：
- daily → `「${title}」今天还没打卡` / `streak 即将断签，去打个卡吧。`
- weekly → `「${title}」本周还差 ${remaining} 次` / `保持节奏，别断签。`

去重 key：weekly 用 `weekMondayKey(now)`（每周每计划一条，不每日刷屏），daily 沿用 `dayKey(now)`。Notification `type` 仍为 `streak_risk`，schema 不变。

### 服务 action `src/lib/server/actions/reminder.ts`
at-risk 检测去 `type`、改 cadence：
- daily：`streak.current > 0` 且今日无打卡（现有逻辑）。
- weekly：周 streak > 0 且本周打卡数 < `cadenceTimes`。

需为本计划算本周打卡数：复用按 `weekMondayKey` 归类的 check-in 计数（与 streak 规则同一周界定）。

## 7. 迁移与测试计划

### 迁移
- 一条 Prisma migration：回填 `cadence`、删 `type`。`resetTestDb` 自动跟上。
- `PlanType` 类型删除；`createPlan` / `updatePlan` 入参改 `cadence` / `cadenceTimes`。

### 受影响消费方
- `src/app/actions.ts`：表单适配层去掉 `type` 校验，按模板/facet 解析。
- `src/lib/server/actions/plan.ts`：`createPlan`/`updatePlan`/`listActivePlansOverview`（streak 按 cadence 传参）。
- `src/app/ui/PlanCard.tsx`、`src/app/plans/[id]/page.tsx`、`src/app/plans/[id]/EditPlanForm.tsx`、`src/app/plans/new/PlanForm.tsx`。
- `src/lib/rules/reminder.ts` + `src/lib/server/actions/reminder.ts`。
- 新增 `src/lib/rules/kind.ts`（`planKind` 纯函数）。

### 测试
- `streak.test.ts`：新增 weekly 用例（达标/未达标/宽限/断档/cadenceTimes 边界）。
- `reminder.test.ts`：weekly at-risk 用例、weekly 文案、weekly 去重 key。
- 集成测试：中性夹具替换 token；新增 weekly 计划创建 + 本周打卡计数。
- `PlanForm.test.tsx`：模板选择器行为（选模板预填 facet、facet 可独立改、条件字段显隐）。
- `kind.test.ts`：`planKind` 各组合。

## 8. 风险与对策

- **streak 周边界复杂度**：集中在 `computeStreak` weekly 分支，必须 TDD 锁死（跨周、未结束周、宽限、cadenceTimes）。与初版设计对 daily streak 的边界风险对策一致。
- **迁移删列**：SQLite 删列需重建表；Prisma 自动处理，但 `dev.db` 会被重建——文档提示用户本地数据会丢（个人阶段可接受，`dev.db` 本就 gitignore）。
- **UI 模板与 facet 漂移**：模板只在创建时预填，之后 facet 是唯一真相；不再持久化「模板」字段（区别于方案 C），避免双真相。
