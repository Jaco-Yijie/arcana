import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { SettingsProvider } from '@/store/SettingsContext'
import { SessionProvider } from '@/store/SessionContext'
import { StarfieldBackground } from '@/components/atoms/StarfieldBackground'
import HomePage from '@/pages/HomePage'
import DeckPage from '@/pages/DeckPage'
import QuestionPage from '@/pages/QuestionPage'
import SpreadPage from '@/pages/SpreadPage'
import FocusPage from '@/pages/FocusPage'
import ShufflePage from '@/pages/ShufflePage'
import CutPage from '@/pages/CutPage'
import DrawPage from '@/pages/DrawPage'
import RevealPage from '@/pages/RevealPage'
import ReadingPage from '@/pages/ReadingPage'
import JournalPage from '@/pages/JournalPage'
import JournalDetailPage from '@/pages/JournalDetailPage'
import SharePage from '@/pages/SharePage'
import SettingsPage from '@/pages/SettingsPage'

/**
 * 路由表见 docs/02-ux-spec.md §1.1。
 * 沉浸区（/focus + /table/*）不渲染全局导航，由 ImmersiveShell 统一处理。
 * 这里只做装配 —— 任何业务逻辑都不应该出现在 App.tsx（Guardrail G-19）。
 */
export default function App() {
  return (
    <SettingsProvider>
      <SessionProvider>
        <BrowserRouter>
          <StarfieldBackground />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/deck" element={<DeckPage />} />
            <Route path="/question" element={<QuestionPage />} />
            <Route path="/spread" element={<SpreadPage />} />
            <Route path="/focus" element={<FocusPage />} />
            <Route path="/table/shuffle" element={<ShufflePage />} />
            <Route path="/table/cut" element={<CutPage />} />
            <Route path="/table/draw" element={<DrawPage />} />
            <Route path="/table/reveal" element={<RevealPage />} />
            <Route path="/reading" element={<ReadingPage />} />
            <Route path="/journal" element={<JournalPage />} />
            <Route path="/journal/:id" element={<JournalDetailPage />} />
            <Route path="/share/:id" element={<SharePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SessionProvider>
    </SettingsProvider>
  )
}
