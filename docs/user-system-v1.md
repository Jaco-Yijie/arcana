# User System V1

React 页面 `/register`、`/login` 与现有 Node HTTP 服务共用 origin。PostgreSQL 保存账号、登录会话、占卜记录和反馈；游客仍可使用本地日记。

## 本地运行

需要 Node.js 22.12+、npm 和 PostgreSQL 16+。先创建空数据库 `arcana`（例如在已安装 PostgreSQL 的机器执行 `createdb arcana`），然后：

```sh
npm ci
```

在现有 `.env` 中添加 `DATABASE_URL` 和 `JWT_SECRET`，不要覆盖已有 DeepSeek 配置。也可以通过终端环境变量提供。不要加 `VITE_` 前缀，不要提交真实值。

- `DATABASE_URL`：连接到上述数据库的 PostgreSQL URL，由本地数据库账号提供。
- `JWT_SECRET`：至少 32 字节的随机密钥。可在自己的终端执行 `openssl rand -base64 48` 生成，存入未提交的 `.env`。
- `APP_ORIGIN`：可选；开发时默认按请求 Host 校验。固定配置时填写浏览器 origin，例如 `http://localhost:5173`，不要带末尾斜杠。
- `READING_PROVIDER=mock`：本地示例解读无需调用外部 AI；真实解读继续使用已有 DeepSeek 配置。

```sh
npm run db:migrate
npm run dev
```

打开 `http://localhost:5173/register` 注册，或 `/login` 登录。注册成功即登录；首页的「我的账号」入口可以查看当前邮箱、退出。登录后开始一次新占卜，完整解读生成后会出现保存状态。

迁移在事务中执行，使用版本表和 advisory lock，可重复运行。应用不会自行创建数据库或在启动时自动迁移。未配置数据库/JWT 时游客流程可用，账号请求会明确失败。

生产运行：`npm run build`，执行迁移后 `NODE_ENV=production npm start`。必须提供 HTTPS、`APP_ORIGIN=https://实际域名`、数据库 URL 和随机 JWT 密钥。生产 Cookie 使用 Secure。数据库 TLS 使用 PostgreSQL 连接字符串配置，不关闭证书验证。

## 数据库结构

完整 DDL：[`server/db/migrations/001_user_system.sql`](../server/db/migrations/001_user_system.sql)。ID 由服务端生成 UUID；时间使用带时区的 `TIMESTAMPTZ`。

| 表 | 字段 |
| --- | --- |
| users | id UUID PK、email VARCHAR(254) UNIQUE、小写邮箱约束、password_hash TEXT、username VARCHAR(80)、avatar TEXT nullable、created_at、last_login_at nullable、status active/disabled |
| readings | id UUID PK、user_id FK、deck_id VARCHAR(80)、spread_type VARCHAR(80)、question TEXT、cards JSONB、interpretation TEXT、created_at、client_session_id VARCHAR(100) |
| user_sessions | id UUID PK、user_id FK、login_time、device VARCHAR(512)、ip INET、expires_at、revoked_at nullable |
| feedback | id UUID PK、user_id FK、reading_id FK、rating SMALLINT 1–5、comment TEXT ≤4000 字符、created_at |

- `readings(user_id, client_session_id)` 唯一：网络重试、刷新与重复保存返回原记录。
- `readings(user_id, created_at DESC, id DESC)` 索引用于个人历史列表。
- 后续 Admin V1 迁移将 `user_sessions(user_id)` 替换为 `(user_id, login_time)`，同时覆盖用户会话查询和精确留存。
- `feedback(reading_id, user_id)` 复合外键确保只能评价本人记录；每人每次占卜一份反馈，重复提交更新内容。
- 删除用户会级联删除其数据；删除占卜会级联删除对应反馈。V1 没有开放删除接口。
- username 初始使用邮箱 `@` 前的部分，avatar 初始为空；资料编辑不在 V1 范围。

## API

所有写接口只接受 `application/json`，浏览器请求要求同源。统一错误结构：`{"error":{"code":"..."}}`。认证状态和密码哈希不会出现在日志；密码哈希不返回给客户端。

| 方法 | 路径 | 请求 / 响应 |
| --- | --- | --- |
| POST | /api/auth/register | `{email,password,confirmPassword}` → 201 `{user}` + JWT Cookie |
| POST | /api/auth/login | `{email,password}` → 200 `{user}` + JWT Cookie |
| GET | /api/auth/me | → 200 `{user}`；未登录/过期/禁用/撤销为 401 |
| POST | /api/auth/logout | `{}` → 200 `{ok:true}`，撤销当前服务端会话并清 Cookie |
| POST | /api/readings | 已登录；下述字段 + `X-Arcana-User` 当前用户 UUID → 201 `{reading:{id,created_at}}`，重复为 200 |
| GET | /api/readings?offset=0 | 本人记录，每页 50 条 → `{readings,nextOffset}` |
| GET | /api/readings/:id | 本人记录 → `{reading}`；他人/不存在为 404 |
| POST | /api/feedback | `{reading_id,rating,comment?}` → 200 `{feedback}`；他人记录为 404 |

`POST /api/readings` 请求字段：

```text
client_session_id  浏览器占卜会话 ID，用于幂等
deck_id            本次占卜冻结的 Deck ID
spread_type        项目已有 Spread ID
question           本次采用的问题
cards              [{ cardId, orientation: "upright" | "reversed", positionId }]
interpretation     原始 structuredReading（或旧版 reading）的 JSON 字符串，写入 TEXT
created_at         解读首次完成的 ISO 时间
```

用户 ID 只取自已验证 JWT 和数据库会话，不信任请求体中的 `user_id`。`X-Arcana-User` 是账号切换检测，必须与认证用户一致，不能用来指定其他用户。卡牌数量、牌位、正逆位、Deck 和 Spread 会校验。V1 保存浏览器收到的解读，不提供内容真实性签名。

JWT 使用 HS256、固定 issuer/audience、7 天有效期；存于 HttpOnly / SameSite=Lax Cookie，不存 localStorage。每次鉴权还检查数据库中的会话有效期、撤销时间及用户状态。密码使用随机盐 scrypt。注册/登录复用服务端每 IP 每分钟 10 次限制；IP 使用直接连接地址，不信任客户端转发头。反向代理部署时此限制按代理连接 IP 计数。

## 自动保存与边界

- 开始占卜时固定 userId，生成解读时固定 completedAt；仅向同一账号上传。
- 解读完成后在应用级 Provider 自动保存，不要求点击「存入日记」。保存成功/失败在解读页显示；失败可手动重试，恢复网络、重新打开应用或登录原账号后也会重试。
- 本地日记用于恢复待上传记录，仍保留原有最近 100 条上限。清空浏览器存储会丢失尚未成功上传的记录；已经落库的记录不受影响。
- 游客及旧版本无 userId 的记录不会被随后登录的账号自动认领。登录前已经开始的占卜仍算游客占卜。
- 退出或换号后，界面隐藏其他账号的本地日记和活动会话；本地缓存仍在设备上，这不是磁盘加密。
- 云端历史读取 API 已提供；现有日记页面仍展示本设备记录，V1 不包含跨设备历史列表 UI、邮件验证、找回密码、头像上传、资料编辑或反馈表单。
- User System 需要 Node API 同源服务。现有 Streamlit 独立静态部署不提供该后端，不支持账号功能。

## 验证

```sh
npm run user:check
npm run build
```

`user:check` 默认跑密码、请求校验及无密钥 Mock 流式解读测试。数据库集成测试必须显式提供 `TEST_DATABASE_URL`，指向一个独立的测试数据库，然后执行同一命令。它会迁移该库、创建随机测试账号、测试注册登录/JWT/退出/跨账号权限/去重/反馈，并清理这些测试账号。不会隐式使用正常 `DATABASE_URL`。没有 `TEST_DATABASE_URL` 时输出 SKIP，不能算数据库测试通过。

流式解读接口补充了明确的 Mock Provider 分支，修复原先配置 Mock 仍尝试访问真实模型的问题。真实模型路径保持不变。

本次验收结果：4 项自动测试全部通过（含独立 PostgreSQL 的真实 API 集成）；完整 build 和 diff 格式检查通过；lint 无错误，有 Fast Refresh 与既有 QA 脚本警告。Chrome 实测 390×844 注册页、1440×900 登录页、注册校验、退出/重登、Deck 选择、已翻牌会话恢复、Mock 解读、保存失败提示、重试后单条落库、字段一致性、刷新 Reading 和退出后的本地记录隐藏。未连接生产数据库，也未调用真实付费模型。

## 新增文件

- `server/db/migrations/001_user_system.sql`：DDL。
- `server/db/index.ts`、`server/db/migrate.ts`：连接池与迁移命令。
- `server/auth.ts`、`server/api/userRoute.ts`：密码、JWT、Cookie、认证与持久化 API。
- `src/features/auth/client.ts`、`src/store/AuthContext.tsx`：请求封装与用户状态。
- `src/pages/AuthPage.tsx`：注册、登录、账号状态页面。
- `src/features/auth/ReadingSync.tsx`：自动保存和状态提示。
- `tests/user-system.test.ts`：单元与数据库集成验证。
- 本文档。

现有路由、导航、占卜状态、Reading 页面、日记与分享页面、中英文资源、环境变量示例和依赖清单做了对应接入。
