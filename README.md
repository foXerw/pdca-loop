# pdca-loop · 计划-实施-总结

PDCA 闭环式个人计划管理 Web 应用——围绕「计划 → 执行 → 检查 → 调整」构建，直击「一时兴起做两次就忘」「年初目标被时间稀释」的痛点。完整设计见 [`docs/superpowers/specs/2026-07-06-plan-track-summarize-design.md`](docs/superpowers/specs/2026-07-06-plan-track-summarize-design.md)。

仓库：https://github.com/foXerw/pdca-loop

## 技术栈

- **Next.js 16**（App Router，全栈一体，Server Components + Server Actions）
- **TypeScript** + **Tailwind CSS v4**
- **Prisma 7** + **libsql adapter**（SQLite，本地零运维；商业化时切 PostgreSQL 几乎零成本）
- **Vitest 4**（单元 + 集成测试）+ **@testing-library/react**（组件测试，jsdom）

> ⚠️ 本仓库的 Next.js 是带 breaking changes 的版本，`params`/`searchParams` 是 Promise、Server Actions 需 `'use server'` 适配层。写代码前请先看 `node_modules/next/dist/docs/`。

## 前置要求

- Node.js ≥ 20
- npm（随 Node 自带）

## 首次本地启动

```bash
# 1. 安装依赖
npm install

# 2. 生成 Prisma Client
npm run db:generate

# 3. 应用迁移建表（写入 dev.db）
npm run db:migrate

# 4. 预置单用户（id=single-user，个人阶段无需登录）
npm run db:seed

# 5. 启动开发服务器
npm run dev
```

打开 http://localhost:3000 即可。

`.env` 已含 `DATABASE_URL="file:./dev.db"` 与本地用的 `CRON_SECRET="dev-secret"`（用于测试 `/api/cron/reminders`，生产请换强随机值），无需额外配置。

## 本地开发验证流程

启动 `npm run dev` 后，按以下主链路验证功能：

1. **建计划**：访问 `/plans/new`
   - 选「终点型」→ 填标题/目标值/单位/截止日 → 创建，跳转到计划详情页。
   - 选「持续型」→ 只填标题/描述 → 创建。
2. **打卡**：在计划详情页「打卡」区填数值（终点型可选）+ 备注 + 心情 → 提交；下方「最近打卡」立即更新，进度条/streak 同步刷新。
3. **任务**：详情页「任务」区添加任务（可勾选「循环」设为每日/每周），点圆点勾选完成。
4. **里程碑**（终点型计划）：详情页「里程碑」区添加阶段节点（标题/目标日期/目标值），可标记完成/撤销/删除；进度区显示「剩余」与「按当前速率预计达成日」。
5. **状态控制**：详情页「调整」区可暂停/恢复/标为完成/归档；归档后仪表盘不再显示。
6. **回顾**：访问 `/reviews/new`
   - 选周期（周/月/季）+ 范围（全部计划或某计划）→ 「重新预填」自动汇总本期打卡次数、任务完成率、进度变化（只读统计卡）。
   - 填主观三栏（顺利/卡住/调整）→ 保存。
   - `/reviews` 列出所有回顾；仪表盘在「本周回顾未做」时显示红点提醒。
7. **仪表盘** `/`：活跃计划卡片（终点型显进度条，持续型显 streak）+ 今日待办 + 本周回顾红点。
8. **通知**：到「每日检查时间」（默认 20:00，可在 `/settings` 改）后，未完成的待办、未打卡的 ongoing 计划（streak 风险）、未写的本周回顾会自动生成通知——导航栏铃铛红点 + `/notifications` 列表。

> 想快速看到有数据的样子：dev.db 是 gitignore 的本地库，可直接在 UI 操作写入；想清空重来执行 `npm run db:migrate`（会重建）即可。

## 提醒与通知调度

提醒扫描逻辑是纯函数 `src/lib/rules/reminder.ts`（`computeDueReminders`，TDD），由 `runReminderScan()`（`src/lib/server/actions/reminder.ts`）拉取数据、去重后写 `Notification`。触发方式两种，按部署选其一：

- **自托管 / `next start` / `npm run dev`**：`src/instrumentation.ts` 在服务启动时注册一个 `setInterval`（默认 60s，可用 `REMINDER_SCAN_INTERVAL_MS` 环境变量调），自动跑扫描。无需额外配置。
- **Vercel / serverless**：实例不保活 interval，改用 Vercel Cron 定时 GET `/api/cron/reminders?secret=<CRON_SECRET>`。需在环境变量配置 `CRON_SECRET`（本地开发 `.env` 已预置 `dev-secret`，生产请换成强随机值）。未配置或不匹配返回 401/403。

通知类型：`task_due`（今日待办聚合）、`review_due`（本周回顾未写）、`streak_risk`（ongoing 计划有 streak 但今日未打卡）。每个 key 每天最多一条，自动去重。浏览器 Web Push 需要 Service Worker，留给 Phase 6 与 PWA 一起做。

## 测试

```bash
npm test          # 跑全部单元 + 集成测试
npm run test:watch  # watch 模式
```

测试约定：

- **数据库隔离**：`vitest.config.ts` 在顶层把 `DATABASE_URL` 指向 `test.db`（与 `dev.db` 隔离），不会污染开发数据。
- **集成测试**：每个文件的 `beforeAll` 调用 `tests/setup-db.ts` 的 `resetTestDb()`（`prisma migrate deploy` 重建 + 清表 + 预置 `single-user`）。
- **关闭文件级并行**（`fileParallelism: false`）：集成测试共享同一个 `test.db`，并行会竞争数据。
- **mock Next 运行时**：集成测试顶部 `vi.mock('server-only')` + `vi.mock('next/cache')`，因为 action 模块在 Next 请求运行时之外会抛错。
- **组件测试**：`.tsx` 用 `// @vitest-environment jsdom`，`tests/setup-jest-dom.ts` 注册 `@testing-library/jest-dom` 匹配器。

测试覆盖：纯规则（progress/streak/review/reminder）、Server Actions CRUD（plan/task/checkin/milestone/review/notification/settings + 提醒扫描去重）、表单组件条件渲染。

## 代码质量

```bash
npm run lint      # ESLint
npx tsc --noEmit  # 类型检查
npm run build     # 生产构建（验证 server/client 边界、'use server' 指令、路由类型）
```

提交前建议三条都跑一遍。

## 项目结构

```
prisma/
  schema.prisma            # User/Plan/Task/CheckIn/Milestone/Review/Notification/PushSubscription
  migrations/              # 迁移历史
  seed.ts                  # 预置 single-user
src/
  app/
    layout.tsx page.tsx   # 根布局 + 仪表盘
    actions.ts             # 'use server' 表单适配层（FormData → 类型化 action）
    ui/                    # ProgressBar / PlanCard
    plans/new/             # 新建计划表单（条件字段）
    plans/[id]/            # 计划详情：任务/打卡/里程碑/状态/编辑
    reviews/               # 回顾列表/新建（预填）/查看编辑
    notifications/         # 通知列表 + 标记已读
    settings/              # 每日检查时间 / 周回顾触发日
    api/cron/reminders/    # Vercel Cron 触发提醒扫描（CRON_SECRET 校验）
    ui/                    # ProgressBar / PlanCard / NotificationBell
  instrumentation.ts       # 服务启动注册提醒扫描 interval（自托管/next start）
  lib/
    db.ts                  # Prisma 单例（libsql adapter）
    server/context.ts      # getCurrentUserId（个人阶段硬编码 single-user）
    server/actions/        # 类型化 server action（server-only，可被集成测试复用）
    rules/                 # 纯函数规则（progress/streak/review/reminder，TDD）
tests/
  setup-db.ts              # resetTestDb / getTestUserId
  setup-jest-dom.ts        # jsdom 匹配器
  integration/             # plan/task/checkin/milestone/review/overview/notification/settings/reminder 集成测试
```

## 架构约定

- **业务逻辑与表单适配分离**：`src/lib/server/actions/*`（`server-only`）放类型化业务函数，可被集成测试直接调用；`src/app/actions.ts`（`'use server'`）只做 FormData 解析 → 调用业务函数 → `revalidatePath`/`redirect`。不要把业务逻辑塞进表单适配层。
- **单用户模型**：现在硬编码 `single-user`（`src/lib/server/context.ts` + seed），所有数据挂 `userId`；将来加注册登录只需换掉 `getCurrentUserId`，不动数据模型。
- **纯规则先行 TDD**：streak/进度/里程碑状态/回顾统计等核心规则是纯函数，先写测试再实现，页面只组合调用。

## 数据库备注

- `dev.db`（开发）与 `test.db`（测试）均为本地 SQLite，已 gitignore。
- 改了 `schema.prisma` 后：`npm run db:migrate`（开发库）生成迁移；测试库会在下次 `npm test` 时由 `resetTestDb` 自动 `migrate deploy`。
- 想重置开发库：删 `dev.db` 后重新 `db:migrate && db:seed`。

## 当前进度

- [x] Phase 1：脚手架 + 数据模型 + 核心 CRUD + 核心规则
- [x] Phase 2：仪表盘 + 计划页 + 打卡 UI
- [x] Phase 3：里程碑 + 量化进度展示 + streak 展示
- [x] Phase 4：回顾页 + 周期触发 + 预填
- [x] Phase 5：通知/提醒调度（应用内；Web Push 推迟到 Phase 6）
- [ ] Phase 6：PWA + Web Push + 打磨 + E2E 烟测
