import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

/**
 * Streamlit 自定义组件专用构建。
 *
 * 与主构建的两处关键差异：
 *   base: './'  组件被 Streamlit 挂在一个它自己分配的路径下，
 *               绝对路径 /assets/... 会 404，必须用相对路径
 *   outDir      产物要提交进仓库（Streamlit Cloud 不跑 npm build），
 *               所以单独放 streamlit_build/，不与 dist/ 混淆
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  define: {
    'import.meta.env.VITE_DEPLOY_TARGET': JSON.stringify('streamlit'),
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    outDir: 'streamlit_build',
    emptyOutDir: true,
  },
})
