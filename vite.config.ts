import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
})
