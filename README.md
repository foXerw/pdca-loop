# 计划-实施-总结

PDCA 闭环式个人计划管理 Web 应用。详见 `docs/superpowers/specs/2026-07-06-plan-track-summarize-design.md`。

## 开发

```bash
npm install
npm run db:migrate     # 建表
npm run db:seed        # 预置单用户
npm run dev
```

## 测试

```bash
npm test               # Vitest（单测 + 集成测，自动用 test.db）
```

## 当前进度

- [x] Phase 1：脚手架 + 数据模型 + 核心 CRUD + 核心规则（本计划）
- [ ] Phase 2：仪表盘 + 计划页 + 打卡 UI
- [ ] Phase 3：里程碑 + 量化进度展示 + streak 展示
- [ ] Phase 4：回顾页 + 周期触发 + 预填
- [ ] Phase 5：通知/提醒调度 + Web Push
- [ ] Phase 6：PWA + 打磨 + E2E 烟测
