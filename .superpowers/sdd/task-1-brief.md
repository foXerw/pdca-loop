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

