import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/theme.css'
import './styles/design-system.css'
import './styles/home-motion.css'
import './styles/immersive-3d.css'
import './styles/deck-worlds.css'
import App from './App'
import { bootI18n } from './i18n'

const container = document.getElementById('root')
if (!container) throw new Error('#root 未找到')

/* ── 语言必须在**首帧之前**定下来 ──
   上次选了英文的用户，如果先渲染中文再异步切过去，每次打开都会看到
   一帧中文然后跳变。这条 await 在中文（默认语言，静态导入）下立即 resolve，
   一次网络请求都不发；只有英文用户会多等一个 chunk。
   中文展示字体的 @font-face 也在这一步按语言注入 —— 英文界面不下载它。 */
void bootI18n().then(() => {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})

// Streamlit 自定义组件跑在 iframe 里，必须主动握手，
// 否则 Streamlit 永远不会给我们发 render 事件（应答就回不来）。
// iframe 高度也得自己声明 —— Streamlit 不会跟着内容自适应。
if (import.meta.env.VITE_DEPLOY_TARGET === 'streamlit') {
  // 让 #root 成为滚动容器（iframe 带 scrolling="no"，文档级滚动不可用）
  document.documentElement.classList.add('in-streamlit')

  void import('./features/reading/streamlitTransport').then((m) => {
    m.notifyReady()

    /**
     * iframe 高度对齐父页面视口。
     * 组件与 Streamlit 主页面同源，所以 parent.innerHeight 读得到；
     * 万一将来跨域了，退回一个在手机上够用的固定值。
     */
    const preferredHeight = () => {
      try {
        const h = window.parent?.innerHeight
        if (typeof h === 'number' && h > 320) return h
      } catch {
        /* 跨域：用兜底值 */
      }
      return 780
    }

    const sync = () => m.setFrameHeight(preferredHeight())
    sync()
    window.addEventListener('resize', sync)
    // 父页面尺寸变化时 iframe 内不会触发 resize，轮询一次兜底
    window.setInterval(sync, 1000)
  })
}
