/**
 * Arcana 后端。
 *
 * 开发：Vite(5173) 把 `/api` 代理到这里(8787)
 * 生产：这一个进程同时托管 `dist/` 与 `/api`
 *
 * 存在的唯一理由：**让 DEEPSEEK_API_KEY 待在浏览器碰不到的地方。**
 * 浏览器永远只跟本站说话，从不直接访问 api.deepseek.com。
 */

import { createServer } from 'node:http'
import type { IncomingMessage } from 'node:http'
import { createGzip } from 'node:zlib'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve } from 'node:path'
import { config, describeConfig } from './env.ts'
import { handleConfig, handleReading, handleReadingStream } from './api/readingRoute.ts'
import { handleFollowUp } from './api/followUpRoute.ts'
import { sendJson } from './http.ts'
import { applySecurityHeaders, assetOrigin, cspMode, handleCspReport } from './security.ts'

const DIST = resolve(process.cwd(), 'dist')

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  /* 牌面/卡背/封面全部是 WebP。缺了它，390 张资产会按
     application/octet-stream 发出 —— <img> 靠嗅探通常还能显示，
     但一旦配合 fetch()、<picture> 或 CSP 就会炸。 */
  '.webp': 'image/webp',
  '.avif': 'image/avif',
}

/** 值得压缩的类型。图片和 woff2 本身已压缩，再压是浪费 CPU。 */
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.svg', '.json'])

function serveStatic(
  urlPath: string,
  req: IncomingMessage,
  res: import('node:http').ServerResponse,
): boolean {
  if (!existsSync(DIST)) return false

  // 归一化并锁在 dist 内，防目录穿越
  const clean = normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, '')
  let filePath = join(DIST, clean)
  if (!filePath.startsWith(DIST)) return false

  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    // SPA：未知路径一律回 index.html，交给前端路由
    filePath = join(DIST, 'index.html')
    if (!existsSync(filePath)) return false
  }

  const ext = extname(filePath)
  const headers: Record<string, string> = {
    'Content-Type': MIME[ext] ?? 'application/octet-stream',
    /* immutable 长缓存的前提是「这个 URL 的内容永不改变」。
       Vite 产物靠内容哈希文件名满足它；牌面资产靠**路径里的 r<rev>** 满足它
       （见 src/decks/artwork/paths.ts）。返修一版画 = rev+1 = 新 URL。
       没有 rev 的时候这里是个陷阱：牌面文件名按设计恒定，
       于是资产在架构上不可更新，老用户一年看不到返修结果。 */
    'Cache-Control': filePath.includes(`${'assets'}/`)
      ? 'public, max-age=31536000, immutable'
      : 'no-cache',
  }

  // gzip：主 bundle 未压缩 553KB，压完约 190KB。
  // 手机上这是「秒开」和「白屏三秒」的差别，而且我们没有 nginx 代劳。
  const acceptsGzip = /\bgzip\b/.test(req.headers['accept-encoding'] ?? '')
  if (acceptsGzip && COMPRESSIBLE.has(ext)) {
    headers['Content-Encoding'] = 'gzip'
    headers['Vary'] = 'Accept-Encoding'
    res.writeHead(200, headers)
    createReadStream(filePath).pipe(createGzip()).pipe(res)
    return true
  }

  res.writeHead(200, headers)
  createReadStream(filePath).pipe(res)
  return true
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)

  /* 安全头挂在入口，一处覆盖静态、API 与 SSE 三条出口。
     setHeader 会与之后 writeHead 传入的头合并，所以下面各处都不用重复写。 */
  applySecurityHeaders(req, res)

  void (async () => {
    try {
      if (url.pathname === '/api/tarot/reading' && req.method === 'POST') {
        await handleReading(req, res)
        return
      }
      if (url.pathname === '/api/tarot/reading/stream' && req.method === 'POST') {
        await handleReadingStream(req, res)
        return
      }
      if (url.pathname === '/api/tarot/followup' && req.method === 'POST') {
        await handleFollowUp(req, res)
        return
      }
      if (url.pathname === '/api/tarot/config' && req.method === 'GET') {
        await handleConfig(res)
        return
      }
      /* ── GET /health ──
         给部署平台用的存活/就绪探针（负载均衡、容器编排、监控都要它）。
         `/api/tarot/config` 也能反映就绪状态，但它在 `/api/` 命名空间下，
         语义是「前端要用的配置」；探针不该和业务接口共用一条路径 ——
         哪天业务接口加了鉴权或限流，探针会跟着一起挂。

         【只回可以公开的三件事】
         绝不返回 Key、baseUrl、模型参数或任何环境变量原文。
         `readingProviderConfigured` 是布尔值，不是「配了什么」。 */
      if (url.pathname === '/health' && (req.method === 'GET' || req.method === 'HEAD')) {
        sendJson(res, 200, {
          status: 'ok',
          readingProviderConfigured: config.ready,
          provider: config.provider,
        })
        return
      }
      /* CSP 违规上报。浏览器发这个请求时不带凭证、不看响应体，
         回 204 即可。它必须排在 `/api/` 兜底 404 之前。 */
      if (url.pathname === '/api/csp-report' && req.method === 'POST') {
        handleCspReport(req, res)
        return
      }
      if (url.pathname.startsWith('/api/')) {
        sendJson(res, 404, { ok: false, error: { code: 'bad-request', message: '接口不存在' } })
        return
      }
      if (serveStatic(url.pathname, req, res)) return

      // 没有 dist（纯开发模式，前端在 Vite 那边）
      sendJson(res, 404, { ok: false, error: { code: 'bad-request', message: 'Not found' } })
    } catch (err) {
      console.error('[arcana] 未捕获的服务端错误：', err)
      if (!res.headersSent) {
        sendJson(res, 500, {
          ok: false,
          error: {
            code: 'unknown',
            message: '这次解读没有成功完成，你抽出的牌仍然保留，可以重新尝试解读。',
            retryable: true,
            canFallbackToMock: true,
          },
        })
      }
    }
  })()
})

server.listen(config.port, () => {
  console.log(`[arcana] 解读服务已启动 http://localhost:${config.port}`)
  console.log(`[arcana] ${describeConfig()}`)
  console.log(
    `[arcana] CSP=${cspMode} · 牌面来源=${assetOrigin ?? "'self'（本地资产模式）"}`,
  )
  if (config.provider === 'deepseek' && !config.apiKey) {
    // 显式要求 deepseek 却没有 Key —— 这一定是配置错误，必须吼出来，
    // 而不是悄悄降级成 Mock 让人以为在用真模型
    console.error(
      '[arcana] ⚠ READING_PROVIDER=deepseek 但没有 DEEPSEEK_API_KEY，所有解读请求都会以 missing-api-key 失败。',
    )
    console.error('[arcana]   要用本地示例解读，请显式设置 READING_PROVIDER=mock。')
  } else if (config.provider === 'mock') {
    console.log(
      '[arcana] 当前为 Mock 模式（本地示例解读）：复制 .env.example 为 .env 并填入 DEEPSEEK_API_KEY 即可切换到 DeepSeek。',
    )
  }
})
