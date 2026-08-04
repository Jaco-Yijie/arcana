# Arcana

一个让用户在线上像线下一样，**亲手完成整个塔罗抽牌过程**的沉浸式数字塔罗 Web MVP。
洗牌 → 切牌 → 摊牌 → 选牌 → 摆牌 → 翻牌，每一步都由用户的真实操作产生。

**LLM 不参与抽牌**，只在牌全部翻开、结果已经冻结之后，对既成事实做解读。

## 运行

```bash
npm install

# 只跑前端（解读会用本地示例数据，UI 完整可用）
npm run dev

# 前端 + 解读服务（推荐）
npm run dev:all        # Vite 5173 · 解读服务 8787
```

### 接入 DeepSeek

```bash
cp .env.example .env
# 填入 DEEPSEEK_API_KEY
npm run dev:all
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
```

## 其他命令

```bash
npm run engine:check   # 抽牌引擎自检：64 项断言，验证「牌不是点击后才生成的」
npm run reading:check  # 解读评测：106 项断言（牌面完整性 / 语气红线 / 10 组用例）
npm run reading:check -- --live   # 用真实 DeepSeek 跑同一批用例（需 Key）
npm run build
npm run lint
```

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
| `docs/agent-development-log.md` | Multi-Agent 开发记录（V1 + V2） |

## 数据

抽牌记录全部保存在浏览器 `localStorage`，不上传、无账号、无数据库。
只有「已翻开的牌 + 问题 + 牌阵」会在你点「开始完整解读」时发给解读服务。
