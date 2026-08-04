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
