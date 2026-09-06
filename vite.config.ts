import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import { rmSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * 配了远端资产根时，把牌面从构建产物里剔掉。
 *
 * 【为什么必须有这一步】
 * vite 会把整个 `public/` 复制进 `dist/`，而 `public/assets/decks` 是 139MB 的牌面。
 * 于是即便生产环境的牌面走 CDN、客户端一张都不会从本站请求，
 * `dist/` 仍然是 151MB —— 部署平台每次都要传这 139MB 死重量，
 * 而它们上线后一次都不会被访问到。
 *
 * 【为什么不直接 publicDir: false】
 * `public/` 里还有 favicon.svg 与 icons.svg，它们必须进产物。
 * 关掉 publicDir 会把这两个也丢掉。
 *
 * 【为什么按环境变量分支，而不是无条件删】
 * 不配 `VITE_DECK_ASSET_BASE_URL` 时，牌面**必须**留在 dist ——
 * 那是「克隆下来直接能跑」和单机部署所依赖的本地兜底。
 * 只有在明确指向了远端资产根时，本地那份才是多余的。
 */
function dropLocalArtworkWhenRemote(assetBase: string | undefined) {
  const remote = (assetBase ?? '').trim()
  const isRemote = remote.length > 0 && remote !== '/assets/decks'
  return {
    name: 'arcana:drop-local-artwork-when-remote',
    apply: 'build' as const,
    closeBundle() {
      if (!isRemote) return
      const dir = resolve(import.meta.dirname ?? '.', 'dist/assets/decks')
      if (!existsSync(dir)) return
      rmSync(dir, { recursive: true, force: true })
      console.log(
        `\n[arcana] 资产根指向 ${remote} —— 已从产物中移除本地牌面副本（dist/assets/decks）`,
      )
    },
  }
}

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [
    react(),
    tailwindcss(),
    dropLocalArtworkWhenRemote(
      /* 只读这一个变量。loadEnv 会连 .env 一起读，但资产根不是 secret，可以进产物 */
      process.env.VITE_DECK_ASSET_BASE_URL,
    ),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        /**
         * 把不变的第三方代码单独切出来。
         *
         * 这不是为了让总体积变小（它不会变），是为了两件事：
         * 一、每个 chunk 回到 500KB 阈值以内，警告不再是被忽略的噪音；
         * 二、react / framer-motion 这类依赖在版本不变时哈希不变，
         *     发一次业务代码不会让用户重下整包。
         */
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('framer-motion') || id.includes('motion-dom') || id.includes('motion-utils')) {
            return 'vendor-motion'
          }
          if (id.includes('react-router')) return 'vendor-router'
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('scheduler')) {
            return 'vendor-react'
          }
          return 'vendor'
        },
      },
    },
  },
  server: {
    host: true,
    proxy: {
      // 浏览器只跟本站说话；DEEPSEEK_API_KEY 待在 8787 那个进程里，前端永远碰不到
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: false,
      },
    },
  },
}))
