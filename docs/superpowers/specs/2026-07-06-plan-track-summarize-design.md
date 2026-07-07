# 计划-实施-总结 Web 应用 · 设计文档

- **日期**：2026-07-06
- **状态**：已通过设计评审，待用户复审
- **起点**：空项目（`D:\code\20260706`）

## 1. 背景与目标

用户的核心痛点是"一时兴起做两次就忘"和"年初目标被时间稀释"。问题不在"记录"，而在**持续跟进到最终完成**。

本应用围绕 **PDCA 闭环**（计划 → 执行 → 检查 → 调整）构建一个 Web 应用，主动推送用户跟进，让长期目标和持续练习都"很难彻底忘掉"。

**典型场景**：
- 终点型目标（示例）：年度"用一亿 token 做 AI 编程"——拆里程碑、累计进度对照目标。（仅为示例之一；模型支持任意量化/非量化、每日/每周组合，见 2026-07-08 通用化设计）
- 持续型目标（示例）："学画画"——无终点，靠每日打卡 + streak 维持；"每周跑 3 次"——周节奏 + 周连胜。

## 2. 范围与取舍

### 使用范围
**个人自用起步**，架构预留商业化扩展口，将来功能成熟后平滑升级为正式产品。

### 路线选择
在"轻量记录型 / PDCA 闭环型 / 目标仪表盘型"三条路线中选 **B：PDCA 闭环型**——直击"忘记/跟不下去"痛点，并内含 A 的记录能力与 C 的量化进度能力，但不强制每个计划量化。

### 明确不做（YAGNI）
- 多用户 / 注册登录（个人阶段）
- 邮件、短信通道
- 移动端原生 App（用 PWA 替代）
- 社交 / 分享 / 排行榜
- 复杂权限、组织、团队
- AI 自动总结（作为 v2 候选卖点，不在初版）
- 富文本编辑器（用 Markdown）

## 3. 技术栈

- **框架**：Next.js（App Router，全栈一体）
- **语言**：TypeScript
- **样式**：Tailwind CSS
- **ORM**：Prisma
- **数据库**：SQLite（本地优先、零运维；商业化时 Prisma 切 PostgreSQL 几乎零成本）
- **PWA**：可"安装"到桌面/主屏，离线壳 + Web Push

选型理由：AI 编程最熟悉、类型安全、本地优先、未来迁移成本低，契合"先个人后产品"节奏。

## 4. 架构

- 前端 React（Server Components + Client Components）+ Tailwind。
- 后端：Route Handlers / Server Actions 直接读写数据库。
- 单用户起步，但**现在就建 `User` 表并预置一个用户**，所有数据挂 `userId`。将来加注册登录只需"换掉硬编码用户"，不动数据模型。
- 提醒调度：轻量定时任务（Vercel Cron 或本地 node-cron），每分钟扫描"到点未完成"项，写 `Notification` + 触发 Web Push。

## 5. 数据模型

| 实体 | 作用 | 关键字段 |
|---|---|---|
| **User** | 预留多用户扩展 | id, name, createdAt |
| **Plan** | 一个计划/目标 | title, cadence(`none`/`daily`/`weekly`), cadenceTimes?, status(`active`/`paused`/`done`/`archived`), targetValue?, targetUnit?, startAt, dueAt?, icon, userId |
| **Milestone** | 计划下的阶段节点 | planId, title, targetDate, targetValue?, order, status |
| **Task** | 具体行动项 | planId, milestoneId?, title, status(`todo`/`done`), dueAt?, recurrence(`none`/`daily`/`weekly`/`custom`), userId |
| **CheckIn** | 打卡/进度记录（"执行"痕迹） | planId?, taskId?, value?(数值), note, mood?, occurredAt, userId |
| **Review** | 阶段总结（"总结"产物） | planId?, period(`week`/`month`/`quarter`/`custom`), wentWell, blocked, adjustments, dateRange, userId |
| **Notification** | 提醒数据 | userId, type(`task_due`/`review_due`/`streak_risk`), payload, readAt?, createdAt |
| **PushSubscription** | Web Push 订阅 | userId, endpoint, keys, createdAt |

### 设计逻辑
- **一亿 token**（示例）：`Plan(cadence=none, targetValue=100000000, targetUnit="tokens", dueAt=年底)` → 4 个 `Milestone`（25M/50M/75M/100M 带 targetDate）→ 每次 AI 编程记一条 `CheckIn(value=…)`，进度 = ∑CheckIn.value，对照里程碑 burn-down。
- **每周跑 3 次**（示例）：`Plan(cadence=weekly, cadenceTimes=3)` → 每周打卡记 `CheckIn`，本周计数对照 cadenceTimes，周 streak = 连续达标周。
- **画画**（示例）：`Plan(cadence=daily)` → 一个 `Task(recurrence=daily)` → 每天打卡生成 `CheckIn`，streak 由连续 CheckIn 算出，不设终点。
- **Review** 落脚"总结计划"：定期写"哪些顺 / 哪些卡 / 怎么调整"，调整项可一键落回 Plan/Milestone。

## 6. 功能与页面

### 首页 / 仪表盘（Dashboard）
- 今日待办：今日到期任务、待打卡循环任务
- 进度概览：活跃计划卡片（量化型显进度条，持续型显 streak）
- 红点提醒：未完成今日项 / 该做周期回顾

### 计划页（Plan detail）
- 计划头：标题、类型、状态、目标值、起止、进度
- 里程碑时间线（deadline 型）：目标日期、达成度、状态
- 任务清单：可勾选完成；循环任务显今日是否已打卡
- 打卡入口：一键打卡（带数值/备注/心情），最近 N 条打卡列表
- 调整区：编辑、暂停、归档、改目标值/截止日

### 新建 / 编辑计划（表单）
- 选类型 → 类型决定后续字段
- 终点型：目标值+单位、截止日、批量加里程碑
- 持续型：循环任务频率（每天/每周/自定义）
- 模板引导，避免空白页

### 回顾页（Review）
- 列出所有 Review（按计划/按时间）
- 新建回顾：选周期 → 应用预填"本期打卡统计、任务完成率、进度变化" → 填主观三栏（顺/卡/调整）
- 调整项可一键落到对应计划（如推迟里程碑两周）

### 归档页（Archive）
- 已完成/已放弃计划，附最终总结，便于年底回看

### 设置页
- 提醒偏好、每日回顾时间、数据导出

### 贯穿性小功能
- **快速捕获**：快捷键/按钮秒记想法或打卡，免先进计划页
- **全局搜索**：按计划/任务/打卡找历史
- **标签**：跨计划分类

## 7. 跟进机制（B 路线核心）

### 7.1 每日节奏（Daily nudge）
- 每用户设"每日检查时间"（默认 20:00）
- 到点未完成今日项 → 浏览器推送 + 应用内红点
- 内容极简："今天还有 2 件事：画画打卡、写 500 字" + 一键跳转
- 未完成的循环任务**宽限到次日午前**再算断签，避免"忘一天就前功尽弃"

### 7.2 Streak（连胜）
- 持续型计划算 streak：连续打卡天数
- 显当前 streak + 历史最长；断签归零但保留历史记录（不删）
- 量化型不算 streak，改用"距目标剩余 + 按当前速率预计达成日"

### 7.3 周期回顾触发（Review cadence）
- 默认每周日触发周回顾提示（频次/日期可配）
- 回顾未做 → 首页持续红点，直到补做（轻量施压，不挡其他操作）
- 月/季回顾同理，自动汇总该周期打卡数、完成任务数、各计划进度变化并预填

### 技术落地
- 短期：浏览器通知 + 应用内提醒。
- 调度：Next.js 挂定时任务（Vercel Cron / 本地 node-cron），每分钟扫描"到点未完成"项 → 写 `Notification` + 触发 Web Push。
- 不引入邮件/短信（商业化时再接 SendGrid 等）。
- 应用打开时 Server Action 实时查未读 `Notification`，红点来自此。

### 语气取舍
提醒只做"提醒"不做"催债"：语气友好、断签有宽限、回顾可补做，避免工具变压力源。

## 8. 测试策略

- **核心规则函数（TDD）**：streak 计算、进度汇总、里程碑状态流转、回顾周期触发——Vitest 纯函数单测。
- **API / Server Actions**：关键路径集成测（建计划、打卡、生成回顾预填）。
- **前端**：Vitest + Testing Library，只测交互复杂的（新建计划条件字段、回顾预填），不追覆盖率。
- **E2E**：Playwright 烟测一条主链路（单用户预置态→建计划→打卡→看进度→写回顾）。个人阶段无登录，"登录态"即预置的单一用户上下文。

## 9. 商业化扩展点

| 将来要加 | 现在留的口 |
|---|---|
| 注册/登录 | `User` 表 + `userId` 外键已就位 |
| 多端云同步 | 数据在服务端，前端为消费方 |
| 邮件/短信提醒 | `Notification` 数据驱动，加 delivery channel 字段 |
| 订阅付费 | 无硬上限，加 `Subscription` 关联 User |
| 团队/共享计划 | `Plan.userId` 已在，加 `PlanMember` 多对多 |
| PostgreSQL 迁移 | Prisma schema 不动，换 datasource |

## 10. 开发顺序（粗略）

1. 数据模型 + 基础 CRUD（Plan/Task/CheckIn）
2. 仪表盘 + 计划页 + 打卡
3. 里程碑 + 量化进度 + streak 计算
4. 回顾页 + 周期触发 + 预填
5. 通知/提醒调度 + Web Push
6. PWA + 打磨 + 烟测

## 11. 风险与对策

- **提醒需要常驻进程**：本地开发用 node-cron；部署 Vercel 时用 Vercel Cron（免费档有频次限制，分钟级可能需降频或自建）。对策：调度逻辑抽象成接口，后端可切换实现。
- **Web Push 在 iOS** 需 PWA 安装后才支持——文档里说明安装步骤。
- **断签宽限逻辑**复杂度集中在 streak 计算，必须用 TDD 锁死边界（跨日、时区、补卡）。
