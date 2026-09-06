---
title: Arcana
emoji: 🌙
colorFrom: indigo
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
short_description: 亲手洗牌、切牌、翻牌的沉浸式塔罗 —— LLM 只解读，不替你抽牌
---

# Arcana

一个让用户在线上像线下一样，**亲手完成整个塔罗抽牌过程**的沉浸式数字塔罗 Web MVP。
洗牌 → 切牌 → 摊牌 → 选牌 → 摆牌 → 翻牌，每一步都由用户的真实操作产生。

**LLM 不参与抽牌**，只在牌全部翻开、结果已经冻结之后，对既成事实做解读。

## 运行

```bash
npm install

# 前端 + 解读服务，一条命令全起
npm run dev            # Vite 5173 · 解读服务 8787

# 只想单独起其中一个时
npm run dev:web        # 只跑前端（解读会用本地示例数据，UI 完整可用）
npm run dev:reading    # 只跑解读服务
```

### 接入 DeepSeek

```bash
cp .env.example .env
# 填入 DEEPSEEK_API_KEY
npm run dev
```

`.env`：

```
DEEPSEEK_API_KEY=sk-...
DEEPSEEK_MODEL=deepseek-v4-pro     # 或 deepseek-v4-flash
```

Provider 由服务端 `READING_PROVIDER` 决定：

| 配置 | 行为 |
|---|---|
| 不设置 + 无 Key | 本地示例解读（Mock），**克隆下来直接能跑** |
| 不设置 + 有 Key | DeepSeek |
| `READING_PROVIDER=mock` | 恒为 Mock |
| `READING_PROVIDER=deepseek` 但无 Key | **明确报错**，不静默降级 |

> API Key 只在服务端进程内读取。前端只请求本站的 `/api/tarot/reading`，
> 浏览器永远不直接访问 `api.deepseek.com`。

### 生产

```bash
npm run build
npm start              # 单进程同时托管 dist/ 与 /api，默认 8787
curl -s localhost:8787/health
```

牌面默认走 `public/assets/decks`。要改用 CDN，**在构建期**给一个环境变量：

```bash
VITE_DECK_ASSET_BASE_URL=https://assets.example.com/arcana/decks npm run build
```

> 这个变量由 Vite 在构建期静态替换，`npm start` 时才设置**不会有任何效果**。

## 验证

```bash
npm run engine:check      # 抽牌引擎：64 项，验证「牌不是点击后才生成的」
npm run deck:check        # 牌组契约：338 项
npm run layout:check      # 牌阵布局：119 项
npm run artwork:check     # 美术管线：89 项
npm run reading:check     # 解读评测：118 项（语气红线 / 10 组用例）
npm run release:check     # 发布边界：45 项（密钥 / 资产路径 / 加载时机 / 打包）
npm run deployment:check  # 部署包：53 项（包内容 / 资产根契约 / 服务器契约）
npm run assets:check      # 本地 390 张牌面是否齐备

npm run assets:origin -- <资产根 URL>   # 对真实 CDN／对象存储做核验：
                                        # 200 / WebP 魔数 / sha256 / 缓存头

npm run reading:check -- --live   # 用真实 DeepSeek 跑同一批用例（需 Key）
npm run lint
```

## 部署

```bash
npm run build             # 本地资产模式
npm run deployment:build  # 产出 deployment/（前端包 + 牌面包 + manifest + 密钥审计）
npm run deployment:check  # 验证包
```

部署架构、环境变量、CDN 路径契约、缓存策略、回滚机制见
**[`deployment/README.md`](deployment/README.md)**，
上线勾选清单见 **[`deployment/production-checklist.md`](deployment/production-checklist.md)**。

## 文档

| 文件 | 内容 |
|---|---|
| `docs/00-brief.md` | V1 需求简报（唯一事实来源） |
| `docs/01-product-spec.md` | Scope / 验收标准 AC-01~15 / 产品红线 G-01~24 |
| `docs/02-ux-spec.md` | Sitemap / User Flow / 交互规范 / 移动端手势 |
| `docs/03-design-system.md` | 设计系统 |
| `docs/04-interaction-spec.md` | 洗牌·切牌·摊牌·选牌·摆牌·翻牌 方案 |
| `docs/05-content-spec.md` | 牌义结构 / 语气规范 / Mock 解读 |
| `docs/06-qa-report.md` | V1 QA 报告 |
| `docs/v2/10-product-scope.md` | V2 Scope / AC-V2 / GV2 红线 |
| `docs/v2/11-architecture.md` | V2 架构：后端形态 / 错误契约 / 兼容层 |
| `docs/v2/12-qa-report.md` | V2 QA 报告 |
| `docs/v2/32-e2-real-deployment.md` | 真实部署报告（R2 + Render） |
| `docs/v2/33-e21-asset-domain-and-csp.md` | 资产域名切换 Runbook · CSP · 产物自述资产根 |
| `docs/agent-development-log.md` | Multi-Agent 开发记录（V1 + V2） |

## 安全

服务端对所有响应挂 `nosniff` / `Referrer-Policy` / `X-Frame-Options` /
`Permissions-Policy`，HTTPS 下另加 HSTS。

CSP 默认 **Report-Only**（`CSP_MODE=report-only`），违规上报到 `/api/csp-report`
并打进服务端日志；确认零违规后设 `CSP_MODE=enforce` 切强制，**不需要改代码**。

`connect-src 'self'` 是「浏览器永远只跟本站说话」这句承诺的浏览器强制版本。
`img-src` 里的牌面来源从构建产物 `dist/arcana-build.json` 读 ——
那是构建期的事实，不是运行期环境变量。

## 数据

抽牌记录全部保存在浏览器 `localStorage`，不上传、无账号、无数据库。
只有「已翻开的牌 + 问题 + 牌阵」会在你点「开始完整解读」时发给解读服务。
