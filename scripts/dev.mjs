/**
 * 同时启动 Vite(5173) 与解读服务(8787)。
 * 不引 concurrently —— 一个 spawn 就够了，少一个依赖。
 */
import { spawn } from 'node:child_process'

const procs = [
  spawn('npx', ['tsx', 'watch', 'server/index.ts'], { stdio: 'inherit', shell: false }),
  spawn('npx', ['vite'], { stdio: 'inherit', shell: false }),
]

const shutdown = () => {
  for (const p of procs) p.kill('SIGTERM')
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
for (const p of procs) p.on('exit', (code) => { if (code) shutdown() })
