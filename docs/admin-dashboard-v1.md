# Admin Dashboard V1

基于现有 React、Node HTTP、PostgreSQL、JWT HttpOnly Cookie 实现，不增加后端框架。后台入口 `/admin`。所有展示值来自数据库聚合；不显示账号、IP、问题、解读原文或反馈评论。

## 本地运行与管理员设置

使用现有 Node.js 22.12+、npm、PostgreSQL 16+ 环境，保留 User System 的环境配置。在本地未提交的 `.env` 或进程环境中设置 `DATABASE_URL`、至少 32 字节随机 `JWT_SECRET`。增加可选 `APP_TIMEZONE=Asia/Shanghai`；它是服务端配置，不使用 VITE 前缀。不需要新增 AI 密钥。

```sh
npm ci
npm run db:migrate
npm run dev
```

打开 http://localhost:5173/register 注册普通测试账号。用有数据库管理权限的本地终端连接相同数据库（确保 DATABASE_URL 已导出到该终端；psql 不自动读取项目 .env）：

```sh
psql "$DATABASE_URL"
```

在 psql 中交互输入邮箱，避免写入命令行历史：

```sql
\prompt 'Test account email: ' admin_email
UPDATE users SET role = 'admin'
WHERE email = lower(:'admin_email') AND status = 'active'
RETURNING id, role;
\q
```

必须返回恰好一个账号；零行表示没有对应的有效账号。刷新浏览器，再访问 http://localhost:5173/admin。角色不在 JWT 中决定，每次后台请求都查询数据库；降级为 user 后旧 Cookie 也会立即失去后台权限。前端角色刷新通过 `/api/auth/me` 恢复。没有公开注册管理员、修改角色或用户编辑 API。

生产先迁移，再 `npm run build`，最后 `NODE_ENV=production npm start`。沿用 HTTPS、APP_ORIGIN 和数据库 TLS 配置；本轮未执行生产迁移或部署。Streamlit 独立静态部署不支持该 Node 后台。

## Migration

`server/db/migrations/002_admin_analytics.sql`：

```sql
ALTER TABLE users ADD COLUMN role VARCHAR(16) NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin'));
CREATE INDEX users_created_idx ON users(created_at);
CREATE INDEX readings_created_idx ON readings(created_at);
CREATE INDEX user_sessions_user_login_idx ON user_sessions(user_id, login_time);
DROP INDEX user_sessions_user_idx;
CREATE INDEX user_sessions_login_idx ON user_sessions(login_time);
CREATE INDEX feedback_created_idx ON feedback(created_at);
```

原有用户默认 user；保留原表和数据。迁移器依次执行 001、002，使用事务、版本表、advisory lock 和 5 秒锁等待上限。重复执行不会重复建列/索引。失败整体回滚，不在服务启动时隐式迁移。

复用已有 `readings(user_id, created_at DESC, id DESC)`。会话复合索引取代单列 user_id 索引。排行榜先按时间筛选、再聚合全部 Deck/Spread，故不重复增加 ID 在首列的索引。标准 CREATE INDEX 会影响写入并持有锁；大库应安排维护窗口，未来在线索引迁移需要独立于事务执行 CONCURRENTLY。

所有业务时间字段沿用 TIMESTAMPTZ；连接池设置 session timezone UTC。APP_TIMEZONE 用于 SQL 业务日边界和前端日期展示，默认 Asia/Shanghai，非法时区明确返回服务错误。

## API

所有接口只接受 GET，成功返回 JSON；错误统一 `{"error":{"code":"..."}}`。未登录/会话失效/禁用为 401，普通用户为 403，未知路径为 404，错误方法 405，参数错误 400，服务不可用 503。返回 Cache-Control: no-store。

| 路径 | 默认 / 参数 | 响应 |
| --- | --- | --- |
| `/api/admin/overview` | 无参数 | totalUsers, newUsersToday/7d/30d, dau/wau/mau, totalReadings, readingsToday/7d/30d, readingsPerActiveUser, d1Retention/d7Retention/d30Retention, averageRating, feedbackCount；附 timeZone、generatedAt |
| `/api/admin/trends` | range=7d | 每日 `{date,newUsers,activeUsers,readings}` 数组 |
| `/api/admin/decks` | range=30d | Top 5 `{deckId,readings,percentage}` 数组 |
| `/api/admin/spreads` | range=30d | Top 5 `{spreadType,readings,percentage}` 数组 |
| `/api/admin/feedback` | range=30d | `{averageRating,total,distribution:{"1":n,"2":n,"3":n,"4":n,"5":n}}` |
| `/api/admin/retention` | 无参数 | `{d1,d7,d30,denominators:{d1,d7,d30},cohorts:[...]}` |

range 仅允许 7d、30d、90d；不接受重复、未知参数。overview/retention 不接受 range。cohorts 返回最近 90 个有注册用户的 cohort 日期，每项 `{date,users,d1,d7,d30}`，各 dn 为 `{eligible,returned,rate}`。整体留存使用全部成熟历史，不能用返回的 90 行重新算整体值。

每个接口内部使用只读 REPEATABLE READ 事务及数据库 CURRENT_TIMESTAMP。同一响应内口径一致；六个独立请求不承诺跨响应共用一个快照。generatedAt 表示 overview 的快照时间。当前无缓存和预聚合。

## 指标准确定义

SQL 源码集中于 `server/admin/queries.ts`。设 T 为数据库快照时刻，D 为 T 在 APP_TIMEZONE 的日期，start(d) 为该时区日期 d 的零点对应绝对时刻。区间一律左闭右开，排除未来事件。7/30/90 天都是含今天的日历日，今天只累计至 T，不是滚动 N×24 小时。

| 指标 | SQL 口径 |
| --- | --- |
| Total Users | users.created_at < T 且 status != disabled 的 count |
| New Users Today / 7d / 30d | users.created_at 分别在 [start(D),T)、[start(D−6),T)、[start(D−29),T) 的 count |
| Active | 区间内 user_sessions.login_time 的 user_id 与 readings.created_at 的 user_id 合并去重；多次登录、登录加 Reading 只计一次；仅 Reading 也算活跃 |
| DAU / WAU / MAU | Active 分别按今天/7天/30天窗口 count(distinct user_id)；WAU/MAU 不是每日 DAU 求和 |
| DAU / MAU | 100 × DAU / MAU；MAU=0 显示数据不足 |
| Total / Today / 7d / 30d Readings | readings 行数，分别为 created_at<T 和上述时间窗口；幂等保存重试不会新增行 |
| Readings Per Active User | readings30d / MAU；MAU=0 返回 0 |
| 每日趋势 | 按业务日期聚合新增、活跃和 Reading；generate_series 补齐所有 7/30/90 个日期，缺失值 0，升序 |
| D1 / D7 / D30 | 注册日 c 的用户在 c+N 当日发生 Active 行为；仅 c+N<D 的 cohort 入分母，确保回访日已完整结束；分子=sum(returned)，分母=sum(eligible)，不是 cohort 百分比平均；无分母返回 null；完整窗口无人回访才是 0% |
| Top Deck / Spread | 选定窗口按 ID count，降序、同数按 ID 排序，取前5；percentage=100×该ID次数/窗口全部Reading次数；分母不是Top5总数，因此前5合计可小于100% |
| Feedback | 按 feedback.created_at 统计；平均=avg(rating)，数量=count，分布为1至5各自count；没有反馈平均null、数量0、五档0；分布百分比=档位数量/反馈总数×100 |

除 Total Users 外，历史新增、活跃、Reading、留存均保留禁用账号的历史贡献，避免禁用动作抹掉运营历史。管理员也属于注册用户。退出或撤销会话不会删除真实登录事件。feedback 在 V1 每人每次 Reading 只有一条，更新评分仍使用原 created_at，因此这里是记录创建窗口内的当前评分，并非评分修改事件流。

所有比率 API 返回 0–100 的数值，不是 0–1；前端最多一位小数。数据不足返回 null，绝不伪造为 0%。未知 Deck/Spread 显示本地化未知名称，已知 ID 复用现有 metadata/i18n，不直接显示内部 ID。

## 页面结构

- 顶部 Tarot Admin、返回主站、中英切换、7/30/90天选择、刷新、最后更新时间及业务时区。
- 四张 KPI：总用户+今日新增，DAU+DAU/MAU，今日Reading+7天，平均评分+全部反馈数量。
- 补充指标：新增7/30天、WAU/MAU、全部/30天Reading、人均30天Reading。
- 三张趋势图：新增用户折线、活跃用户折线、每日Reading柱图；可展开精确数据表。
- 两个横向排行榜：Deck和Spread；同时提供数量、占比表格。
- 留存卡：D1/D7/D30、有效分母及可展开cohort表。
- 反馈卡：范围内平均分、5至1星的数量及比例。

范围选择只影响趋势、排行榜和下方反馈；顶部 KPI 保持固定统计口径，留存为全部成熟 cohort，页面明确说明。Loading、无活动、无Reading、无反馈、留存不足、网络失败重试及权限状态分别处理。切换范围中止旧请求，避免慢响应覆盖新数据。

Recharts 图表无播放动画；后台样式仅作用于 admin 类名，不使用主站艺术背景。桌面4列KPI/3列趋势/2列下方卡，平板趋势单列，手机2列KPI和单列内容。图表、页面及样式按后台路由加载，图表依赖不进入主站首屏预加载。

## 验证

```sh
# TEST_DATABASE_URL 必须指向独立测试数据库；不要使用生产库
npm run admin:check
npm run user:check
npm run typecheck
npm run build
```

先在运行上述测试的终端设置 TEST_DATABASE_URL。无该变量时数据库测试明确 SKIP，不能视作集成通过。测试在随机 schema 内回滚数据；API测试会执行迁移、创建随机账号并清理自己的账号。EXPLAIN 可通过 ADMIN_EXPLAIN_REPORT 环境变量输出 JSON。

本轮实测：后台4项测试、User System4项测试全部通过，无跳过；typecheck及完整build通过。构建包含原有 i18n、Deck、layout、artwork 检查。测试覆盖六接口401/403/200、伪造JWT角色无效、注册传admin无效、数据库升降级立即生效、禁用401、参数、重复迁移、空库/单用户、零反馈、无成熟cohort、精确D1/D7/D30、加权分母、5次登录去重、仅Reading活跃、跨来源去重、Top5之外的分母、7/30/90补零、上海零点和纽约DST。

EXPLAIN ANALYZE 使用2000用户、20000会话、6000Reading的可回滚合成数据。本机一次记录：overview 3.78ms，retention 32.16ms，trends 3.76ms，decks 0.23ms，spreads 0.21ms，feedback 0.014ms。它是开发环境样本，不是生产性能承诺。历史全量统计/留存仍会随用户和事件增长；未来应基于真实负载增加增量日聚合和缓存。

浏览器使用独立 PostgreSQL 验收库，实测未登录跳转、普通用户禁止页/API 403、数据库升级管理员后可访问；真实单用户库显示1用户、零Reading/反馈、留存不足。合成历史库验证7/30/90天分别返回7/30/90个日期且数据变化。另以浏览器专用响应注入验证全零聚合、延迟Loading、503错误及重试恢复，注入在验收后全部撤销；空库真实SQL已由集成测试验证。

桌面1440px、平板820px、手机390px在图表尺寸更新后无横向溢出；快速连续缩放时Recharts会短暂沿用旧宽度，更新后恢复。中文和英文均正常。真实主站回归经过Deck选择、问题/牌阵、键盘洗牌、切点确认、抽牌、摆牌、翻牌、Mock解读；自动保存返回201，云端新增1条/1张牌，刷新后仍1条。没有产品JS异常；控制台有预期401/403、故障注入503以及现有字体预加载警告。完整build有现有Vite未来配置加载警告，lint无错误、保留Fast Refresh及既有QA脚本警告。

截图使用独立测试库，不代表真实用户数据：
- `output/playwright/admin-v1-desktop.png`、`admin-v1-tablet.png`、`admin-v1-mobile.png`、`admin-v1-english.png`
- `output/playwright/admin-v1-single-user.png`、`admin-v1-empty.png`、`admin-v1-forbidden.png`
- `output/playwright/admin-v1-loading.png`、`admin-v1-error.png`
- `output/playwright/admin-v1-decks-regression.png`、`admin-v1-reading-regression.png`
- `output/playwright/admin-v1-explain.json`：完整合成数据查询计划。趋势命中users/readings/session时间索引，留存命中用户时间复合索引；小数据/空feedback顺序扫描是优化器正常选择。

## 文件清单（本阶段）

新增：
- `server/db/migrations/002_admin_analytics.sql`
- `server/admin/queries.ts`、`server/admin/analytics.ts`
- `server/api/adminRoute.ts`
- `src/types/admin.ts`、`src/features/admin/AdminRoute.tsx`
- `src/pages/AdminPage.tsx`、`src/styles/admin.css`
- `tests/admin.test.ts`
- `docs/admin-dashboard-v1.md`

修改：
- `server/db/migrate.ts`、`server/db/index.ts`：迁移版本及UTC连接。
- `server/auth.ts`、`server/api/userRoute.ts`：当前数据库角色与用户状态返回。
- `server/index.ts`：后台API挂载。
- `src/features/auth/client.ts`：role类型、可取消请求。
- `src/pages/AuthPage.tsx`：安全的后台登录返回路径。
- `src/App.tsx`、`src/components/layout/SiteNavigation.tsx`：路由、后台导航及背景隔离。
- `src/i18n/locales/zh-CN.json`、`src/i18n/locales/en-US.json`：后台文案。
- `vite.config.ts`：图表分包，隔离主站加载。
- `.env.example`、`package.json`、`package-lock.json`、`README.md`、`docs/user-system-v1.md`。

此前 User System V1 文件保留，不属于本阶段重新实现；详见其文档。

## 当前边界与下一阶段 AI Usage

本轮不包含支付、收入、订阅、AI成本展示、用户画像、地图/IP定位、用户编辑删除、群发通知或CMS。未接生产库、未部署。没有数据导出、管理员审计、预聚合缓存或完整历史cohort分页；首页不展示任何评论。真实模型和生产规模压测不在本轮验收中。

建议下一阶段新增下表，**本轮只设计，不创建，不填充虚构数据**：

| 字段 | 建议类型/含义 |
| --- | --- |
| id | UUID PK，每次provider请求唯一 |
| user_id | UUID nullable FK，游客可空；删除用户SET NULL |
| reading_id | UUID nullable FK，失败或尚未持久化可空；删除Reading SET NULL |
| provider / model | TEXT，记录真实供应商和返回的模型版本 |
| input_tokens / output_tokens / total_tokens | BIGINT nullable，非负；仅从真实usage读取，未知为null |
| latency_ms | BIGINT nullable，非负，服务端实测 |
| estimated_cost | NUMERIC(20,10) nullable，明确是估算，无法计费时null |
| prompt_version | TEXT，服务端模板版本 |
| created_at | TIMESTAMPTZ NOT NULL DEFAULT now() |

推荐补充 provider_request_id（供应商范围内唯一）、status、currency、pricing_version、缓存/推理token明细和重试序号；不能简单假设所有供应商total_tokens恒等于输入加输出。一次Reading多次尝试保留多行，失败也记录实际消耗。由服务器在每次真实模型调用完成/失败时写入，不能接收浏览器申报的用量。先形成可追溯usage和价格版本，再显示估算成本；账单对账另做，不把估算称为实际账单。
