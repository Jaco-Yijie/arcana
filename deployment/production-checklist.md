# Arcana Production Checklist

每项可勾选。带 ⚠️ 的是**踩空后很难当场看出来**的项。

---

## Before Deployment

- [ ] `git status` 干净，或明确知道未提交的是什么
- [ ] `npm ci`（不是 `npm install`，避免锁文件漂移）
- [ ] `npm run release:check` → 60/60
- [ ] `npm run deployment:check` → 56/56
- [ ] `npm run assets:check` → 780 个牌面齐备且与 `artwork.lock.json` 一致
- [ ] `npm run build` 通过（内含 deck / layout / artwork check）
- [ ] `npm run deployment:build` 通过
- [ ] 确认 `deployment/secret-audit.json` 的 `findings` 为空数组
- [ ] 已决定牌面走 **CDN** 还是**跟随前端部署**（决定下一节怎么构建）

## Environment

- [ ] Reading Server 已设 `DEEPSEEK_API_KEY`（在平台的 Secret 管理里，**不是**写进文件）
- [ ] ⚠️ 确认 Key **没有** `VITE_` 前缀（加了就等于公开发布）
- [ ] `.env` **没有**被提交（`git check-ignore .env` 应有输出）
- [ ] 已选定 `DEEPSEEK_MODEL`（`deepseek-v4-flash` 约 55–60s / `deepseek-v4-pro` 约 40–140s）
- [ ] `PORT` 与平台要求一致
- [ ] ⚠️ 若走 CDN：`VITE_DECK_ASSET_BASE_URL` 在 **`npm run build` 时**给，不是 `npm start` 时

## Frontend

- [ ] 上传 `deployment/frontend/`（15 文件 / 768.2 KB）
- [ ] ⚠️ **SPA fallback 已配置**：未知路径回 `index.html`
- [ ] 用 `frontend-manifest.json` 的 sha256 抽查几个文件，确认传完整了
- [ ] `index.html` → `Cache-Control: no-cache`
- [ ] `assets/*.js` `*.css` → `public, max-age=31536000, immutable`
- [ ] HTTPS 已启用
- [ ] 未把 `src/` `server/` `.env` `node_modules/` 传上去

## Reading Server

- [ ] 部署内容包含 `server/` **与** `src/`（服务端值依赖 `src/` 的 6 个模块）
- [ ] Node 22+
- [ ] `npm ci` 后 `npm start`
- [ ] ⚠️ **平台请求超时 ≥ 180s**（深度解读实测 141.3s）
- [ ] ⚠️ **平台支持 SSE 流式响应**（`/api/tarot/reading/stream`）
- [ ] 出站可访问 `api.deepseek.com`
- [ ] `GET /health` 返回 `{"status":"ok","readingProviderConfigured":true}`
- [ ] 前端与 API **同源**（否则要另配 CORS，v1 不建议拆）

## Artwork

- [ ] 上传 `deployment/artwork/` 全部 780 个文件到 `<ASSET_BASE>`
- [ ] 目录结构保持 `<deckId>/{cards,thumbs}/<cardId>.webp`
- [ ] `Content-Type: image/webp`
- [ ] `Cache-Control: public, max-age=31536000, immutable`
- [ ] 关闭目录列举
- [ ] 用 `artwork-manifest.json` 的 sha256 抽查 ≥5 个文件（含 full 与 thumb 各若干）
- [ ] ⚠️ 确认 780 个都传完了 —— 传一半不会报错，只会在某几张牌上显示兜底图
- [ ] 记下本次各套牌的 rev（`legacy-moonlight=r1` `legacy-classic=r2` `legacy-forest=r2` `legacy-celestial=r1` `legacy-shadow=r2`）

## Security

- [ ] `deployment/secret-audit.json` 全部 check 为期望值
- [ ] 浏览器 Network 面板确认**没有**任何到 `api.deepseek.com` 的请求
- [ ] `/health` 与 `/api/tarot/config` 的响应里没有 Key、baseUrl、环境变量原文
- [ ] Security headers 已配（先 `Report-Only` 跑一轮再切强制）
- [ ] ⚠️ CSP 的 `style-src` 保留 `'unsafe-inline'`（布局引擎写内联样式，去掉会白屏）
- [ ] `/api/*` → `Cache-Control: no-store`

## Smoke Test（部署后，真机跑一遍）

- [ ] 首页打开，**0 张牌面请求**
- [ ] `/decks` 显示 5 套牌组、25 张缩略图、0 张加载失败
- [ ] 完整走一次：问题 → 牌阵 → 洗 → 切 → 摊 → 摆 → 翻 → 解读
- [ ] 摊开 78 张时**没有**新增牌面请求
- [ ] 翻牌后牌面清晰，原画题字可读
- [ ] 解读成功返回，且引用了真实抽到的牌与正逆位
- [ ] 追问两次，牌不变、不重抽
- [ ] 存入日记 → 刷新 → 日记还在
- [ ] ⚠️ 直接刷新 `/reading`（验证 SPA fallback）
- [ ] 只用键盘走一遍：Tab / 方向键 / Enter / Escape
- [ ] Console 无 error

## Post Deployment

- [ ] 记录本次发布的 commit SHA 与各套牌 rev
- [ ] 保留上一版 `deployment/frontend/` 以便回滚
- [ ] 观察一段时间的错误率与解读耗时
- [ ] 确认限流行为符合预期（当前是**进程内内存限流**；多实例部署需共享存储或交给网关）

## Rollback

- [ ] **前端**：静态托管切回上一版 `frontend/`
- [ ] **牌面**：manifest 的 rev 改回上一版 → 重新构建前端 → 重新部署（旧 rev 文件不要删）
- [ ] **服务端**：重新部署上一个 commit（无状态，无数据迁移）
- [ ] **紧急降级**：`READING_PROVIDER=mock` 重启 —— 抽牌与 390 张原画完全可用，只有解读换成本地示例
