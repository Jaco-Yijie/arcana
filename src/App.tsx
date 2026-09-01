import { Suspense, lazy } from 'react'
import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { SettingsProvider } from '@/store/SettingsContext'
import { SessionProvider } from '@/store/SessionContext'
import { DeckProvider } from '@/store/DeckContext'
import { DeckThemeSync } from '@/store/DeckThemeSync'
import { DeckAtmosphere } from '@/atmosphere/DeckAtmosphere'
/* ══════════════════════════════════════════════════════════════
 * 【哪些页面可以懒加载，哪些绝对不行】
 *
 * 主 bundle 曾经是 642KB —— 14 个页面全部 eager import。
 * 但拆分不能一刀切：**仪式区（专注 → 洗 → 切 → 抽 → 翻）必须保持即时**。
 * 那五步是一个连续动作，中间任何一次「加载中…」都会把仪式打断，
 * 而这正是这个产品唯一真正在卖的东西。所以它们连同首页一律 eager。
 *
 * 懒加载的是**离开主流程才会去的地方**：牌组库、解读、日记、分享、设置。
 * 其中解读页与牌组库是最重的两块（解读 UI + Mock 数据；十套牌 × 6 张预览 SVG），
 * 而它们恰好都不在「一口气做完」的那条路径上 —— 用户到达它们时本来就有停顿。
 * ══════════════════════════════════════════════════════════ */

/* ── 主流程：eager ── */
import HomePage from '@/pages/HomePage'
import QuestionPage from '@/pages/QuestionPage'
import SpreadPage from '@/pages/SpreadPage'
import FocusPage from '@/pages/FocusPage'
import ShufflePage from '@/pages/ShufflePage'
import CutPage from '@/pages/CutPage'
import DrawPage from '@/pages/DrawPage'
import RevealPage from '@/pages/RevealPage'

/* ── 主流程之外：lazy ── */
const DeckLibraryPage = lazy(() => import('@/pages/DeckLibraryPage'))
const ReadingPage = lazy(() => import('@/pages/ReadingPage'))
const JournalPage = lazy(() => import('@/pages/JournalPage'))
const JournalDetailPage = lazy(() => import('@/pages/JournalDetailPage'))
const SharePage = lazy(() => import('@/pages/SharePage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))

/**
 * DEV-ONLY · Benchmark Style Anchor 评审台（Phase C1B-1 §15）
 *
 * 【为什么是这种写法】
 * `import.meta.env.DEV` 是 vite 的编译期常量，生产构建里这个三元的
 * false 分支连同 `lazy(() => import(...))` 会被整体 tree-shake 掉 ——
 * 也就是说 `/dev/benchmark` 在生产包里**不存在**，不是"存在但藏起来了"。
 *
 * 它评审的是未经人工批准的 benchmark 试产图。这种东西不该有
 * 任何一条路径能被线上用户走到，哪怕是猜 URL。
 */
const BenchmarkReviewPage = import.meta.env.DEV
  ? lazy(() => import('@/dev/BenchmarkReviewPage'))
  : null

/**
 * 懒加载的兜底。
 * 刻意只是一块空的占位，不放 spinner —— 氛围层已经铺在后面了，
 * 一个转圈只会让这个「安静的房间」突然像个正在忙的网页。
 */
function RouteFallback() {
  return <div className="min-h-[100dvh]" aria-hidden="true" />
}

/**
 * 路由表见 docs/02-ux-spec.md §1.1。
 * 沉浸区（/focus + /table/*）不渲染全局导航，由 ImmersiveShell 统一处理。
 * 这里只做装配 —— 任何业务逻辑都不应该出现在 App.tsx（Guardrail G-19）。
 */
/**
 * Streamlit 自定义组件跑在 iframe 里，路径是 Streamlit 分配的静态地址，
 * BrowserRouter 的 history API 在那里改不动 URL，导航会直接失效 ——
 * 所以这个形态下必须换成 HashRouter（地址会变成 `#/journal` 这样）。
 */
const Router = import.meta.env.VITE_DEPLOY_TARGET === 'streamlit' ? HashRouter : BrowserRouter

export default function App() {
  return (
    <SettingsProvider>
      <DeckProvider>
        <SessionProvider>
          {/* 会话冻结后，把牌组主题锁在那一副上（见组件注释） */}
          <DeckThemeSync />
          <Router>
            <DeckAtmosphere />
            <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              {/* 牌组选择是正式流程的一步（首页「带着问题来」→ 这里 → 问题页）。
                  V2.4 曾经有两个互相矛盾的牌组页：/deck 写着「当前唯一牌组」，
                  /decks 写着五套。现在收敛成一个，旧路径重定向保住书签。 */}
              <Route path="/decks" element={<DeckLibraryPage />} />
              <Route path="/deck" element={<Navigate to="/decks" replace />} />
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
              {/* DEV 专用，不进任何导航。生产构建里 BenchmarkReviewPage 为 null，
                  这一行整体不渲染 —— 路由表里没有它，"*" 会把 /dev/benchmark 送回首页 */}
              {BenchmarkReviewPage && (
                <Route path="/dev/benchmark" element={<BenchmarkReviewPage />} />
              )}
              {/* 未开工的牌组仍然要能看 —— 但只在 dev，不污染用户正式页面。
                  生产构建里 import.meta.env.DEV 为 false，这一行整体不渲染。 */}
              {import.meta.env.DEV && (
                <Route path="/dev/decks" element={<DeckLibraryPage showAll />} />
              )}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </Suspense>
          </Router>
        </SessionProvider>
      </DeckProvider>
    </SettingsProvider>
  )
}
