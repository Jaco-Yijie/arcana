import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import { rmSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { LOCAL_ASSET_BASE, normalizeAssetBase } from './src/decks/artwork/paths'

/**
 * 【产物自述资产根】—— 构建期把这次构建真正用的资产根写进 `dist/arcana-build.json`。
 *
 * 资产根是**构建期**被 vite 静态替换进 bundle 的事实，而运行期的 `process.env`
 * 是另一件事。两者可以不一致（构建时设了、启动时没设，或反过来），
 * 而所有下游都需要知道**产物**用的是哪一个：
 *
 *   - `server/index.ts` 的 CSP `img-src` 必须放行牌面来源。
 *     按运行期 env 推断，一旦不一致就会把 780 张牌全部拦掉 —— 而且是线上才炸。
 *   - `release:check` 的 REL-12b 要按资产模式分支判定牌面该不该在 dist 里。
 *
 * 在此之前这两处各自靠猜：REL-12b 从 bundle 文本里正则捞第一个 http 字面量，
 * 并把 `r2\.dev|cloudflarestorage` 写死在判据里。那是**绑定到当前供应商**的 ——
 * E2.1 换成自有域名（assets.example.com）之后，那条正则就不再认识自己的资产根。
 *
 * 让产物自己说出来，这些推断全部消失，且与供应商无关。
 */
function emitBuildManifest(assetBase: string, isRemote: boolean) {
  return {
    name: 'arcana:emit-build-manifest',
    apply: 'build' as const,
    generateBundle() {
      const manifest = {
        /** 这次构建静态替换进 bundle 的资产根。末尾无斜杠 */
        assetBase,
        /** local = 牌面随产物走；remote = 牌面在 CDN／对象存储 */
        assetMode: isRemote ? 'remote' : 'local',
        /** remote 模式下 dist/assets/decks 已被移除 */
        localArtworkInBundle: !isRemote,
        builtAt: new Date().toISOString(),
      }
      // @ts-expect-error rollup 插件上下文由 vite 在运行时注入
      this.emitFile({
        type: 'asset',
        fileName: 'arcana-build.json',
        source: `${JSON.stringify(manifest, null, 2)}\n`,
      })
    },
  }
}

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
function dropLocalArtworkWhenRemote(assetBase: string, isRemote: boolean) {
  return {
    name: 'arcana:drop-local-artwork-when-remote',
    apply: 'build' as const,
    closeBundle() {
      if (!isRemote) return
      const dir = resolve(import.meta.dirname ?? '.', 'dist/assets/decks')
      if (!existsSync(dir)) return
      rmSync(dir, { recursive: true, force: true })
      console.log(
        `\n[arcana] 资产根指向 ${assetBase} —— 已从产物中移除本地牌面副本（dist/assets/decks）`,
      )
    },
  }
}

/**
 * 资产根的归一与「是不是远端」的判定，**全站只在这里做一次**，
 * 然后同时喂给上面两个插件与产物 manifest。
 *
 * 归一复用产品代码自己的 `normalizeAssetBase` —— 不在构建配置里抄第二份规则。
 * 那条规则决定 780 个 URL 长什么样，抄一份迟早和产品代码漂移。
 */
function resolveAssetContract(raw: string | undefined) {
  const assetBase = normalizeAssetBase(raw)
  return { assetBase, isRemote: assetBase !== LOCAL_ASSET_BASE }
}

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [
    react(),
    tailwindcss(),
    /* 只读这一个变量。loadEnv 会连 .env 一起读，但资产根不是 secret，可以进产物 */
    ...(() => {
      const { assetBase, isRemote } = resolveAssetContract(process.env.VITE_DECK_ASSET_BASE_URL)
      return [
        emitBuildManifest(assetBase, isRemote),
        dropLocalArtworkWhenRemote(assetBase, isRemote),
      ]
    })(),
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
