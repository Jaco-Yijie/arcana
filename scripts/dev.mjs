/**
 * `npm run dev` —— 启动一个**完整可用的 Arcana**。
 *
 * 【为什么这是默认命令】
 * 旧版 `npm run dev` 只起 Vite。牌能抽、能翻，但一点「开始解读」就 502 ——
 * 因为 8787 上的解读服务根本没起。用户看到的是产品坏了，
 * 而真相是他需要知道另有一个 `dev:all` 才行。
 *
 * 「最容易被输入的那条命令，必须给出一个完整可用的产品」——
 * 所以 dev 现在同时起两个进程。想单独调试用：
 *   npm run dev:web       只起前端（解读会 502，属预期）
 *   npm run dev:reading   只起解读服务
 *
 * 不引 concurrently —— 两个 spawn 就够了，少一个依赖。
 */
import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/* ── 启动前把「解读能不能用」如实说清楚 ───────────────────── */

function readingReadiness() {
  if (process.env.READING_PROVIDER === 'mock') {
    return { level: 'mock', note: 'READING_PROVIDER=mock —— 解读走本地示例数据' }
  }
  if ((process.env.DEEPSEEK_API_KEY ?? '').trim()) {
    return { level: 'live', note: '已从环境变量读到 DEEPSEEK_API_KEY' }
  }
  for (const file of ['.env.local', '.env']) {
    const path = resolve(process.cwd(), file)
    if (!existsSync(path)) continue
    const hit = readFileSync(path, 'utf8')
      .split('\n')
      .some((line) => /^\s*DEEPSEEK_API_KEY\s*=\s*\S/.test(line))
    if (hit) return { level: 'live', note: `已从 ${file} 读到 DEEPSEEK_API_KEY` }
  }
  return {
    level: 'mock',
    note: '未找到 DEEPSEEK_API_KEY —— 解读将使用本地示例数据（cp .env.example .env 后填入即可接真实模型）',
  }
}

const readiness = readingReadiness()
console.log('')
console.log('  Arcana dev')
console.log(`    前端      http://localhost:5173`)
console.log(`    解读服务  http://localhost:8787`)
console.log(
  `    解读      ${readiness.level === 'live' ? 'DeepSeek（真实模型）' : '本地示例数据'} · ${readiness.note}`,
)
console.log('')

/* ── 两个进程 ─────────────────────────────────────────────── */

const procs = [
  spawn('npx', ['tsx', 'watch', 'server/index.ts'], { stdio: 'inherit', shell: false }),
  spawn('npx', ['vite'], { stdio: 'inherit', shell: false }),
]

let shuttingDown = false
const shutdown = (code = 0) => {
  if (shuttingDown) return
  shuttingDown = true
  for (const p of procs) p.kill('SIGTERM')
  process.exit(code)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

/* 任一进程退出就一起收摊 —— 只剩前端活着最危险：
   页面看起来正常，解读却全部 502，而这正是我们要根除的那个状态。 */
for (const p of procs) {
  p.on('exit', (code) => {
    if (!shuttingDown && code) {
      console.error(`\n  [arcana] 一个子进程以 code ${code} 退出，已停止其余进程。`)
    }
    shutdown(code ?? 0)
  })
}
