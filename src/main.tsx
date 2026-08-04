import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/theme.css'
import App from './App'

const container = document.getElementById('root')
if (!container) throw new Error('#root 未找到')

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Streamlit 自定义组件跑在 iframe 里，必须主动握手，
// 否则 Streamlit 永远不会给我们发 render 事件（应答就回不来）。
// iframe 高度也得自己声明 —— Streamlit 不会跟着内容自适应。
if (import.meta.env.VITE_DEPLOY_TARGET === 'streamlit') {
  void import('./features/reading/streamlitTransport').then((m) => {
    m.notifyReady()
    const sync = () => m.setFrameHeight(Math.max(720, window.innerHeight))
    sync()
    window.addEventListener('resize', sync)
  })
}
