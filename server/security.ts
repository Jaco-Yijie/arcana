/**
 * 安全响应头与 CSP。
 *
 * 【为什么 CSP 对这个产品是有意义的，而不是仪式】
 * Arcana 的整条安全边界只有一句话：**浏览器永远只跟本站说话**
 * （`server/index.ts` 顶部）。`DEEPSEEK_API_KEY` 待在 Node 进程里，
 * 前端拿不到，所以泄漏路径不是「读到 Key」，而是「让浏览器替我们把请求发到别处」。
 *
 * CSP 正好锁的是这一条：`connect-src 'self'` 之后，任何一段被注入的脚本
 * 都无法把 session、问题文本或解读内容 POST 到第三方；`script-src 'self'`
 * 之后，也无法从外域加载那段脚本。这不是「加个 header 显得规范」，
 * 是把那句设计承诺变成浏览器**强制执行**的东西。
 *
 * 【为什么默认 Report-Only】
 * CSP 是少数「配错了不会报错、只会让产品悄悄坏掉」的东西 ——
 * 拦掉的是资源，表现是牌面空白或动画失效，而服务端一切正常、日志全绿。
 * 390 张牌面走的又是跨源的对象存储，正是最容易被拦的那一类。
 * 所以默认先跑 Report-Only：违规照常放行，但送到 `/api/csp-report`，
 * 观察一轮确认零违规之后，再用 `CSP_MODE=enforce` 切强制 —— 不改一行代码。
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export type CspMode = 'report-only' | 'enforce' | 'off'

function readCspMode(): CspMode {
  const raw = (process.env.CSP_MODE ?? '').trim().toLowerCase()
  if (raw === 'enforce') return 'enforce'
  if (raw === 'off') return 'off'
  return 'report-only'
}

/**
 * 牌面来源。**从构建产物读，不从运行期环境变量读。**
 *
 * 资产根是构建期被 vite 静态替换进 bundle 的。运行期的
 * `VITE_DECK_ASSET_BASE_URL` 是另一件事，两者完全可能不一致
 * （构建时设了、启动时没设，或换了 CDN 但没重新构建）。
 *
 * 按运行期变量推断会得到一个「大部分时候对」的 CSP：本地开发全绿，
 * 线上某次只改环境变量没重新构建，780 张牌面**全部被自己的 CSP 拦掉**。
 * `dist/arcana-build.json` 里那个值才是这份产物真正会去请求的地方。
 */
function readAssetOriginFromBundle(): string | null {
  try {
    const raw = readFileSync(resolve(process.cwd(), 'dist', 'arcana-build.json'), 'utf8')
    const manifest = JSON.parse(raw) as { assetBase?: string }
    const base = (manifest.assetBase ?? '').trim()
    if (!base.startsWith('http')) return null // 本地模式：牌面就在 'self'
    return new URL(base).origin
  } catch {
    /* 没有 dist（纯开发模式，前端在 Vite 那边）或 manifest 读不出来。
       此时静态资源不由本进程托管，CSP 也就管不到前端页面，按本地模式处理。 */
    return null
  }
}

export const cspMode: CspMode = readCspMode()
export const assetOrigin: string | null = readAssetOriginFromBundle()

/**
 * 策略本体。
 *
 * | 指令 | 值 | 理由 |
 * |---|---|---|
 * | `default-src` | `'self'` | 兜底：没单独列出的一律只许本站 |
 * | `script-src` | `'self'` | 无内联脚本、无 CDN 脚本。index.html 里那个 `<script type="module">` 构建后是 `/assets/*.js` |
 * | `style-src` | `'self' 'unsafe-inline'` | **必须**。framer-motion 与 React 通过 `style` 属性做动画，那是内联样式 |
 * | `img-src` | `'self'` + 牌面来源 | 远端模式下 390 张牌走对象存储，跨源 |
 * | `connect-src` | `'self'` | **这条是重点**：解读走本站 `/api/**` 的 SSE，不存在任何跨源请求 |
 * | `frame-ancestors` | `'none'` | 不允许被嵌进 iframe |
 * | `base-uri` / `form-action` | `'self'` | 挡住改 `<base>` 或把表单指向外域这两类注入 |
 * | `object-src` | `'none'` | 不用插件 |
 */
export function buildCsp(): string {
  const img = ["'self'", assetOrigin].filter(Boolean).join(' ')
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    `img-src ${img}`,
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'report-uri /api/csp-report',
  ].join('; ')
}

/**
 * 一次性给所有响应挂上安全头。
 *
 * 放在请求入口而不是每个 `writeHead` 里：Node 的 `setHeader()` 会与
 * 之后 `writeHead(status, headers)` 传入的头合并。分散到各处写迟早漏一处，
 * 而漏掉的那一处通常就是 SSE —— 唯一长连接、也最值得保护的那条。
 */
export function applySecurityHeaders(req: IncomingMessage, res: ServerResponse): void {
  /* 让浏览器严格按 Content-Type 处理。少了它，一个被当成 HTML 嗅探的
     用户内容就是一次 XSS —— 而我们的 MIME 表刚好是手写的。 */
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  /* frame-ancestors 的老浏览器等价物。两个都给，代价为零 */
  res.setHeader('X-Frame-Options', 'DENY')
  /* 这个产品不需要任何一项。默认全关，将来要用再显式打开 */
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), interest-cohort=()',
  )

  /* HSTS 只在确实走 HTTPS 时发。
     【为什么必须判断】本地开发是 http://localhost。对 localhost 断言 HSTS
     会让浏览器此后强制把 localhost 升级成 https —— 一次误发，整台开发机上
     所有跑在 localhost 的项目一起坏掉，而且清除起来很麻烦。
     Render 在边缘终止 TLS，用 `x-forwarded-proto` 告诉我们真实协议。 */
  const proto = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0]?.trim()
  if (proto === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }

  if (cspMode === 'off') return
  const header = cspMode === 'enforce'
    ? 'Content-Security-Policy'
    : 'Content-Security-Policy-Report-Only'
  res.setHeader(header, buildCsp())
}

/* ── CSP 违规上报 ──
   Report-Only 阶段唯一的产出。没有它，违规只出现在每个访问者自己的
   浏览器控制台里 —— 也就是我们永远看不到，那这一轮观察等于没做。 */

/** 同一条违规只记一次。一个被拦的资源会在每次渲染重复上报，不去重会淹掉日志 */
const seen = new Set<string>()

export function handleCspReport(req: IncomingMessage, res: ServerResponse): void {
  const chunks: Buffer[] = []
  let size = 0
  req.on('data', (c: Buffer) => {
    size += c.length
    if (size > 16 * 1024) { req.destroy(); return } // 上报体很小，超了就是滥用
    chunks.push(c)
  })
  req.on('end', () => {
    try {
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
        'csp-report'?: Record<string, unknown>
      }
      const r = body['csp-report'] ?? {}
      const directive = String(r['effective-directive'] ?? r['violated-directive'] ?? '?')
      /* 只留来源，丢掉路径与 query。既够定位，也不把用户访问过的具体 URL 写进日志 */
      const blockedRaw = String(r['blocked-uri'] ?? '?')
      let blocked = blockedRaw
      try { blocked = new URL(blockedRaw).origin } catch { /* 'inline' / 'eval' 这类关键字不是 URL */ }
      const key = `${directive} ← ${blocked}`
      if (!seen.has(key)) {
        seen.add(key)
        console.warn(`[arcana] CSP 违规（${cspMode}）：${key}`)
      }
    } catch {
      // 上报体不合法就丢掉。这个端点无鉴权，不能因为脏数据崩掉
    }
    res.writeHead(204).end()
  })
}
