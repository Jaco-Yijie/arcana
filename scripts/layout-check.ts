/**
 * 牌阵布局自检（L 组 · Phase C0）
 *
 * 【它守的是什么】
 * Phase C0 之前，牌桌高度写死 288px、牌位尺寸写死 64×110，牌位坐标却是 0–1 浮点。
 * 三个常量相除得到一个硬阈值：**纵向间距小于 0.382 的牌位必然重叠**。
 * 二选一（Δ0.34）与关系（Δ0.26）当场中招，且与视口无关。
 *
 * 这个 bug 存活到实测才被发现，原因很直接：**全库没有一条断言看布局**。
 * engine/deck/reading 三套自检加起来 483 项，没有一项会因为两张牌叠在一起而变红。
 *
 * 所以这份文件的存在意义不是「再加几个测试」，而是把
 * 「牌阵不许重叠」从一条口头约定变成机器守着的不变量 ——
 * 和这个代码库对待牌义不变性、文案红线、抽牌独立性的方式完全一致。
 *
 * 用法：`npm run layout:check`（零网络、零 token）
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spreads } from '../src/data/spreads.ts'
import {
  ABSOLUTE_MIN_CARD_W,
  CARD_RATIO,
  MIN_CARD_W,
  computeSpreadLayout,
  inspectLayout,
  rectsIntersect,
  validateSpreadGrid,
} from '../src/features/table/layout/spreadLayout.ts'
import type { Rect } from '../src/features/table/layout/spreadLayout.ts'

const G = '\x1b[32m'
const R = '\x1b[31m'
const D = '\x1b[2m'
const B = '\x1b[1m'
const X = '\x1b[0m'

let pass = 0
let fail = 0

function check(name: string, ok: boolean, note = ''): void {
  if (ok) {
    pass += 1
    console.log(`  ${G}PASS${X}  ${name}${note ? `  ${D}${note}${X}` : ''}`)
  } else {
    fail += 1
    console.log(`  ${R}FAIL${X}  ${name}${note ? `  ${D}${note}${X}` : ''}`)
  }
}

function section(title: string): void {
  console.log(`\n${B}${title}${X}`)
}

const REPO_ROOT = resolve(import.meta.dirname, '..')

const SHEET_SRC = readFileSync(
  resolve(REPO_ROOT, 'src/features/table/components/CardMeaningSheet.tsx'),
  'utf8',
)

/**
 * 面板高度上限，**从组件源码里解析出来**。
 *
 * 刻意不 import 那个组件：它是 .tsx，而 scripts/ 这条编译路径没开 jsx，
 * `tsc -b` 会直接失败。也刻意不在这里另写一个 0.55 —— 两处各写一份必然会漂。
 * 解析源码同时还多守一件事：那个常量必须真的存在于组件里。
 */
const SHEET_MAX_VH = (() => {
  const m = SHEET_SRC.match(/SHEET_MAX_VH\s*=\s*([0-9.]+)/)
  if (!m) throw new Error('[layout-check] CardMeaningSheet 里找不到 SHEET_MAX_VH')
  return Number(m[1])
})()

/* ══════════════════════════════════════════════════════════════
 * 支持的视口 —— 与 Phase C0 验收清单一致
 * ══════════════════════════════════════════════════════════ */

interface Viewport {
  label: string
  w: number
  h: number
}

const VIEWPORTS: Viewport[] = [
  { label: '320×700  最小支持', w: 320, h: 700 },
  { label: '360×800  小屏 Android', w: 360, h: 800 },
  { label: '390×844  iPhone', w: 390, h: 844 },
  { label: '430×932  大屏手机', w: 430, h: 932 },
  { label: '768×1024 平板竖屏', w: 768, h: 1024 },
  { label: '1024×768 平板横屏', w: 1024, h: 768 },
  { label: '1280×800 笔记本', w: 1280, h: 800 },
  { label: '1440×900 桌面', w: 1440, h: 900 },
  { label: '1512×982 大桌面', w: 1512, h: 982 },
  { label: '1920×1080 全高清', w: 1920, h: 1080 },
]

/**
 * 由视口推导牌桌可用尺寸。
 *
 * 必须与 ImmersiveShell / DrawTable / RevealPage 的实际盒模型保持一致，
 * 否则断言守的是一个不存在的布局。下面这几个数字各自的来源：
 *   header      h-11  = 44px（ImmersiveShell）
 *   StepHint    h-9   = 36px
 *   底部操作区  min-h-28 = 112px
 *   mx-4        左右各 16px
 * 抽牌页牌桌是 flex-[3]，与 Hand(96) + Fan(flex-[2]) 分剩余高度。
 */
const SHELL_HEADER = 44
const STEP_HINT = 36
const FOOTER = 112
const HAND_H = 64

/**
 * 沉浸区内容列宽度 —— **必须与 ImmersiveShell 的 VARIANT_WIDTH.table 一致**
 * （抽牌 / 翻牌两页用的就是 table 变体）。
 * 断言守的必须是真实存在的那套布局，两边各写一份迟早会漂。
 */
export function shellMaxWidth(vw: number): number {
  return Math.min(vw * 0.96, 90 * 16)
}

/** 牌桌左右内边距 —— 与 `clamp(0.5rem, 3vw, 1.5rem)` 一致，两侧各一份 */
function boardPadX(vw: number): number {
  return 2 * Math.min(Math.max(vw * 0.03, 8), 24)
}

/** 扇形区高度 —— 与 `clamp(8.5rem, 24vh, 15rem)` 一致 */
function fanHeight(vh: number): number {
  return Math.min(Math.max(vh * 0.24, 8.5 * 16), 15 * 16)
}

function drawBoardSize(vp: Viewport): { w: number; h: number } {
  const colW = shellMaxWidth(vp.w)
  return {
    w: colW - boardPadX(vp.w),
    h: vp.h - SHELL_HEADER - STEP_HINT - HAND_H - fanHeight(vp.h),
  }
}

function revealBoardSize(vp: Viewport): { w: number; h: number } {
  const colW = shellMaxWidth(vp.w)
  return { w: colW - boardPadX(vp.w), h: vp.h - SHELL_HEADER - STEP_HINT - FOOTER }
}

/* ══════════════════════════════════════════════════════════════
 * 0. 牌阵定义自洽
 * ══════════════════════════════════════════════════════════ */

function checkSpreadDefinitions(): void {
  section('0. 牌阵定义自洽性')

  for (const spread of spreads) {
    const errors = validateSpreadGrid(spread)
    check(`${spread.name} 的 row/col 落在声明的 grid 内且不重格`, errors.length === 0, errors.join('; '))
    check(
      `${spread.name} 的牌位数与 cardCount 一致`,
      spread.positions.length === spread.cardCount,
      `${spread.positions.length} / ${spread.cardCount}`,
    )
  }

  /* 牌位 id 全局唯一：解读管线用 positionId 关联牌与牌位，重名会串位 */
  const allIds = spreads.flatMap((s) => s.positions.map((p) => `${s.id}:${p.id}`))
  check('牌位 id 在各自牌阵内唯一', new Set(allIds).size === allIds.length)

  /* CARD_RATIO 必须与 theme.css 的 --card-ratio 一致 ——
     两处各写一个数字迟早会漂，卡牌会在牌桌上变形 */
  const css = readFileSync(resolve(REPO_ROOT, 'src/styles/theme.css'), 'utf8')
  const m = css.match(/--card-ratio:\s*([0-9.]+)/)
  check(
    'CARD_RATIO 与 theme.css 的 --card-ratio 一致',
    m !== null && Math.abs(Number(m[1]) - CARD_RATIO) < 1e-6,
    `theme.css=${m?.[1]} engine=${CARD_RATIO}`,
  )
}

/* ══════════════════════════════════════════════════════════════
 * L-01 / L-02 / L-03 —— 几何安全
 * ══════════════════════════════════════════════════════════ */

function checkGeometry(): void {
  section('L-01/02/03. 几何安全（5 牌阵 × 5 视口 × 抽牌/翻牌两页）')

  const pages: Array<{ name: string; size: (vp: Viewport) => { w: number; h: number } }> = [
    { name: '抽牌', size: drawBoardSize },
    { name: '翻牌', size: revealBoardSize },
  ]

  for (const vp of VIEWPORTS) {
    let collisions = 0
    let labelHits = 0
    let oob = 0
    const detail: string[] = []

    for (const page of pages) {
      const { w, h } = page.size(vp)
      for (const spread of spreads) {
        const layout = computeSpreadLayout(spread, w, h)
        const r = inspectLayout(layout, { w, h })
        collisions += r.cardCollisions.length
        labelHits += r.labelOverCard.length
        oob += r.outOfBounds.length
        if (r.cardCollisions.length) {
          detail.push(`${page.name}/${spread.name} 卡相交 ${JSON.stringify(r.cardCollisions)}`)
        }
        if (r.labelOverCard.length) {
          detail.push(`${page.name}/${spread.name} 标签压卡 ${JSON.stringify(r.labelOverCard)}`)
        }
        if (r.outOfBounds.length) {
          detail.push(`${page.name}/${spread.name} 越界 ${r.outOfBounds.join(',')}`)
        }
      }
    }

    check(`L-01 ${vp.label} 任意两个 Card Zone 不相交`, collisions === 0, detail.slice(0, 2).join(' | '))
    check(`L-02 ${vp.label} 牌位 Label 不覆盖其他 Card`, labelHits === 0)
    check(`L-03 ${vp.label} Card 不超出牌桌可用区域`, oob === 0)
  }
}

/* ══════════════════════════════════════════════════════════════
 * L-04 —— 主 CTA 不被遮挡
 * ══════════════════════════════════════════════════════════ */

function checkCtaClearance(): void {
  section('L-04. 主 CTA 不被 Card / Sheet / Label 遮挡')

  /* SHEET_MAX_VH 直接从组件导入 —— 两处各写一个 0.55 迟早会漂 */

  for (const vp of VIEWPORTS) {
    const board = revealBoardSize(vp)
    /* CTA 区在牌桌下方，占 FOOTER 高度 */
    const ctaTop = SHELL_HEADER + STEP_HINT + board.h
    const cta: Rect = { x: 0, y: ctaTop, w: vp.w, h: FOOTER }

    let worst = 0
    for (const spread of spreads) {
      const layout = computeSpreadLayout(spread, board.w, board.h)
      for (const slot of layout.slots) {
        /* 牌的绝对 y = header + hint + 牌桌内偏移 */
        const abs: Rect = {
          x: slot.bounds.x,
          y: SHELL_HEADER + STEP_HINT + slot.bounds.y,
          w: slot.bounds.w,
          h: slot.bounds.h,
        }
        if (rectsIntersect(abs, cta)) worst += 1
      }
    }
    check(`L-04a ${vp.label} 牌不侵入 CTA 区域`, worst === 0, worst ? `${worst} 张` : '')

    /* Sheet 打开时：面板顶边必须低于 CTA 顶边才算遮挡。
       55vh 面板从底部升起 → 顶边 = vh × 0.45 */
    const sheetTop = vp.h * (1 - SHEET_MAX_VH)
    check(
      `L-04b ${vp.label} 牌义面板高度上限不吃满全屏（可露出牌桌）`,
      sheetTop > SHELL_HEADER + STEP_HINT,
      `面板顶边 ${sheetTop.toFixed(0)}px > 牌桌顶 ${SHELL_HEADER + STEP_HINT}px`,
    )
  }

  /* ── 桌面端：面板是常驻右栏而不是浮层 ──
     它必须**占掉自己的宽度**，而不是压在牌桌与 CTA 上面。
     实测过一次压住 CTA 右半边的版本，所以这条要钉死。
     几何在运行期才成立，这里用源码断言守它不被改回浮层。 */
  const revealSrc = readFileSync(resolve(REPO_ROOT, 'src/pages/RevealPage.tsx'), 'utf8')
  const sheetSrc = SHEET_SRC
  check(
    'L-04c 桌面端面板打开时牌桌让出右侧宽度',
    /sidePanelOpen \? 'lg:mr-\[\d+px\]'/.test(revealSrc),
  )
  check(
    'L-04d 桌面端面板打开时 CTA 区同样让位（两处都要有）',
    (revealSrc.match(/sidePanelOpen \? 'lg:mr-\[\d+px\]'/g) ?? []).length >= 2,
  )

  /* ── 牌义面板的四条关闭路径 ──
     旧版唯一入口是顶部一根小灰条：没有遮罩、不响应点击外部、不响应 Escape，
     而且在 664px 高的窗口里它同时盖住了「开始完整解读」。 */
  check("L-04e 面板可用 Escape 关闭", /'Escape'/.test(sheetSrc) && /addEventListener\('keydown'/.test(sheetSrc))
  check('L-04f 面板有遮罩且点击外部关闭', /onPointerDown=\{onClose\}/.test(sheetSrc))
  check(
    'L-04g 面板有明确的文字关闭入口（小灰条对第一次来的人不构成 affordance）',
    />\s*收起\s*</.test(sheetSrc),
  )
  check(
    'L-04h 面板高度封顶且内部可滚动',
    /SHEET_MAX_VH \* 100\}dvh/.test(sheetSrc) && /overflow-y-auto/.test(sheetSrc),
  )
  check(
    'L-04i 抽屉升起时内容列让出等高空间（牌与 CTA 都不被盖住）',
    /bottomInset=\{!isDesktop && sheetPlacement \? sheetH : 0\}/.test(revealSrc) &&
      /onHeightChange=\{handleSheetHeight\}/.test(revealSrc),
  )
  /* 【实测抓到过的回归】渲染期读 DOM 会和动画构成反馈回路：
     牌桌位移动画每帧改变 getBoundingClientRect，触发重渲染，
     把抽屉的入场动画反复打断 —— 实测卡在 translateY(127.77px) 再没落下去。
     这条断言禁止 RevealPage 在渲染期读布局。 */
  check(
    'L-04j RevealPage 不在渲染期读 getBoundingClientRect（防动画反馈回路）',
    !/getBoundingClientRect/.test(revealSrc),
  )
  check(
    'L-04k 抽屉高度由 ResizeObserver 上报，不由调用方在渲染期测量',
    /ResizeObserver/.test(sheetSrc) && /onHeightChange/.test(sheetSrc),
  )
}

/* ══════════════════════════════════════════════════════════════
 * L-05 —— 最小视口可用
 * ══════════════════════════════════════════════════════════ */

function checkMinViewport(): void {
  section('L-05. 所有 Spread 在最小支持 viewport 下可用')

  const min = VIEWPORTS[0]!
  for (const spread of spreads) {
    for (const [pageName, size] of [
      ['抽牌', drawBoardSize(min)],
      ['翻牌', revealBoardSize(min)],
    ] as const) {
      const layout = computeSpreadLayout(spread, size.w, size.h)
      const r = inspectLayout(layout, size)
      /* 320px 上「牌一定 ≥62」和「牌一定不被裁」不可兼得。
         产品选后者：宁可牌小，也不能把牌裁掉一半。
         所以这里断言的是绝对下限 + 不溢出；期望值只作为提示输出。 */
      check(
        `L-05 ${min.label} ${pageName}·${spread.name} 卡宽 ≥ ${ABSOLUTE_MIN_CARD_W}px 且不溢出`,
        layout.cardW >= ABSOLUTE_MIN_CARD_W - 0.01 && r.outOfBounds.length === 0,
        `cardW=${layout.cardW.toFixed(0)}px${layout.cramped ? ` （低于期望值 ${MIN_CARD_W}）` : ''}`,
      )
    }
  }
}

/* ══════════════════════════════════════════════════════════════
 * L-06 —— Reveal 前后无结构性跳动
 * ══════════════════════════════════════════════════════════ */

function checkNoRevealShift(): void {
  section('L-06. Reveal 前后布局不发生结构性跳动')

  /* 布局引擎只吃 (spread, w, h)，不吃 revealed 状态 ——
     所以「翻开」在结构上不可能改变任何牌位的几何。
     这里断言的是这条性质本身：同一输入两次调用完全一致。 */
  for (const vp of VIEWPORTS) {
    const size = revealBoardSize(vp)
    let same = true
    for (const spread of spreads) {
      const a = computeSpreadLayout(spread, size.w, size.h)
      const b = computeSpreadLayout(spread, size.w, size.h)
      if (JSON.stringify(a) !== JSON.stringify(b)) same = false
    }
    check(`L-06 ${vp.label} 布局与翻牌状态无关（引擎签名不含 revealed）`, same)
  }

  /* 结构性保证：FlipCard 的牌背与牌面共用同一个 width */
  const flip = readFileSync(
    resolve(REPO_ROOT, 'src/features/table/components/FlipCard.tsx'),
    'utf8',
  )
  check(
    'L-06 FlipCard 把同一个 width 同时给牌背与牌面（CardFrame 只有一处）',
    (flip.match(/<CardFrame/g) ?? []).length === 1,
    `CardFrame 出现 ${(flip.match(/<CardFrame/g) ?? []).length} 次`,
  )
}

/* ══════════════════════════════════════════════════════════════
 * L-07 —— 确定性
 * ══════════════════════════════════════════════════════════ */

function checkDeterminism(): void {
  section('L-07. 同一 viewport 下 slot placement 必须 deterministic')

  for (const vp of VIEWPORTS) {
    const size = revealBoardSize(vp)
    let stable = true
    for (const spread of spreads) {
      const runs = Array.from({ length: 5 }, () =>
        JSON.stringify(computeSpreadLayout(spread, size.w, size.h).slots),
      )
      if (new Set(runs).size !== 1) stable = false
    }
    check(`L-07 ${vp.label} 连续 5 次求解结果完全一致`, stable)
  }

  /* 引擎里不许出现随机源 —— 有随机就谈不上确定性 */
  const src = readFileSync(
    resolve(REPO_ROOT, 'src/features/table/layout/spreadLayout.ts'),
    'utf8',
  )
  check('L-07 布局引擎不含 Math.random / Date.now', !/Math\.random|Date\.now/.test(src))
}

/* ══════════════════════════════════════════════════════════════
 * L-08 —— 移动端无横向溢出
 * ══════════════════════════════════════════════════════════ */

function checkNoHorizontalOverflow(): void {
  section('L-08. 移动端不发生横向页面 overflow')

  for (const vp of VIEWPORTS.filter((v) => v.w < 768)) {
    for (const [pageName, size] of [
      ['抽牌', drawBoardSize(vp)],
      ['翻牌', revealBoardSize(vp)],
    ] as const) {
      let maxRight = 0
      for (const spread of spreads) {
        const layout = computeSpreadLayout(spread, size.w, size.h)
        for (const slot of layout.slots) {
          maxRight = Math.max(maxRight, slot.bounds.x + slot.bounds.w)
        }
      }
      check(
        `L-08 ${vp.label} ${pageName} 内容右边界 ≤ 牌桌宽`,
        maxRight <= size.w + 0.01,
        `${maxRight.toFixed(1)} / ${size.w.toFixed(1)}px`,
      )
    }
  }
}

/* ══════════════════════════════════════════════════════════════
 * L-09 —— 桌面端放大不致相交
 * ══════════════════════════════════════════════════════════ */

function checkContinuousSweep(): void {
  section('L-09. 320–1920 连续宽度扫描（每 16px 一次）')

  /* 【为什么必须是连续扫描而不是几个代表性视口】
     只测 320/390/768/1024/1440 这几档，等于允许「针对这几个宽度写特殊 CSS」通过。
     而真实用户会把窗口拖到任意宽度 —— 断裂恰恰发生在没被测到的地方。
     旧实现的 767→768（内容列 +71%）与 1023→1024（+56%）就是这么漏掉的。 */

  const STEP = 16
  const MIN_W = 320
  const MAX_W = 1920
  /* 高度取两档：矮屏最容易发生纵向裁切，高屏最容易露出巨大空白 */
  const HEIGHTS = [700, 1080]

  let overflow = 0
  let clipping = 0
  let overlap = 0
  let labelHit = 0
  const samples: string[] = []

  for (let w = MIN_W; w <= MAX_W; w += STEP) {
    for (const h of HEIGHTS) {
      const vp: Viewport = { label: `${w}×${h}`, w, h }
      for (const [pageName, size] of [
        ['抽牌', drawBoardSize(vp)],
        ['翻牌', revealBoardSize(vp)],
      ] as const) {
        for (const spread of spreads) {
          const layout = computeSpreadLayout(spread, size.w, size.h)
          const r = inspectLayout(layout, size)
          if (r.cardCollisions.length) {
            overlap += 1
            if (samples.length < 3) samples.push(`${w}×${h} ${pageName}/${spread.name} 相交`)
          }
          if (r.labelOverCard.length) labelHit += 1
          /* 越界 = 牌被容器裁掉；board 超出可用区域也计入 */
          if (r.outOfBounds.length) {
            clipping += 1
            if (samples.length < 3) samples.push(`${w}×${h} ${pageName}/${spread.name} ${r.outOfBounds[0]}`)
          }
          /* 横向溢出：任何 slot 的右边界超过牌桌宽度 */
          const maxRight = Math.max(...layout.slots.map((sl) => sl.bounds.x + sl.bounds.w))
          if (maxRight > size.w + 0.01) {
            overflow += 1
            if (samples.length < 3) samples.push(`${w}×${h} ${pageName}/${spread.name} 横向溢出`)
          }
        }
      }
    }
  }

  const steps = Math.floor((MAX_W - MIN_W) / STEP) + 1
  const total = steps * HEIGHTS.length * 2 * spreads.length
  check(`L-09a 无横向 overflow`, overflow === 0, `${total} 个采样点`)
  check(`L-09b 无 card clipping / board 溢出可用区域`, clipping === 0, samples.slice(0, 2).join(' | '))
  check(`L-09c 无 card 相交`, overlap === 0, samples.slice(0, 2).join(' | '))
  check(`L-09d 无 label 压卡`, labelHit === 0)

  /* ── 内容列宽度必须连续 ──
     这条直接守「不许用断点做宽度阶跃」。相邻 16px 之间内容列的变化率
     若超过 STEP 的 2 倍，就说明中间有一次跳变。 */
  const widthAt = (w: number) => shellMaxWidth(w)
  let maxJump = 0
  let jumpAt = 0
  for (let w = MIN_W; w < MAX_W; w += 1) {
    const d = Math.abs(widthAt(w + 1) - widthAt(w))
    if (d > maxJump) {
      maxJump = d
      jumpAt = w
    }
  }
  check(
    'L-09e 内容列宽度对视口宽度连续（相邻 1px 变化 ≤ 2px）',
    maxJump <= 2,
    maxJump <= 2
      ? `最大逐像素变化 ${maxJump.toFixed(2)}px`
      : `${jumpAt}→${jumpAt + 1} 处跳变 ${maxJump.toFixed(0)}px`,
  )

  /* ── 断点两侧必须平滑 ──
     767/768 与 1023/1024 是旧实现出事的两个位置，单独钉死。 */
  for (const bp of [768, 1024]) {
    const before = widthAt(bp - 1)
    const after = widthAt(bp)
    const pct = ((after - before) / before) * 100
    check(
      /* 旧版实测值：767→768 是 420→720（+71.4%），1023→1024 是 720→1024（+42.2%）。
         都是 `max-w-[420px] md:max-w-[720px] lg:max-w-[1120px]` 直接跳变造成的。 */
      `L-09f ${bp - 1}→${bp} 内容列无阶跃（旧版 767→768 为 +71.4%，1023→1024 为 +42.2%）`,
      Math.abs(pct) < 1,
      `${before.toFixed(0)}px → ${after.toFixed(0)}px (${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%)`,
    )
  }

  /* ── 宽屏必须真的把空间用起来 ── */
  const at1920 = widthAt(1920)
  check(
    'L-09g 1920px 上内容列 ≥ 1400px（不再是居中的手机列）',
    at1920 >= 1400,
    `${at1920.toFixed(0)}px`,
  )
}

/* ══════════════════════════════════════════════════════════════ */

console.log(`${B}牌阵布局自检${X}`)
checkSpreadDefinitions()
checkGeometry()
checkCtaClearance()
checkMinViewport()

/* ══════════════════════════════════════════════════════════════
 * Reading 页牌阵行的横向预算（E3）
 *
 * 【为什么要算，而不是在浏览器里试】
 * Reading 页顶部那一行牌的宽度与间距是 CSS 表达式
 * （`min(24vw, var(--card-w-md))` 之类），最终值取决于视口。
 * 第一版用的是 26vw / 5vw，在桌面上看起来很好，
 * 而 375px 上五张牌算出来 380px —— 比容器还宽 35px，横向溢出。
 * 那种 bug 在 1440 的屏幕上永远不会被看到。
 *
 * 这一组把那套算术固定下来：任意目标视口，
 * 「n 张牌 + (n−1) 个间距」必须装进可用内容宽度里。
 * ════════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════════
 * 品牌字号区间（E5）
 *
 * 要求是「桌面 70–96px，手机 44–60px」。这类要求最容易失效的方式不是
 * 有人故意改小，而是有人把 clamp 的中间项从 `vw + rem` 换成纯 `vw` ——
 * 两端 clamp 仍然对，中段却会掉下去（1024 宽时纯 6.4vw 只有 65px）。
 * 所以这里不看两端，**按真实视口逐档算**。
 * ════════════════════════════════════════════════════════════ */
function checkBrandScale(): void {
  section('品牌字号区间')

  const REM = 16
  const css = readFileSync(resolve(REPO_ROOT, 'src/styles/theme.css'), 'utf8')

  /** 解析 `clamp(<a>rem, <b>vw + <c>rem, <d>rem)` */
  function parseClamp(name: string) {
    const m = new RegExp(`--${name}:\\s*clamp\\(([\\d.]+)rem,\\s*([\\d.]+)vw \\+ ([\\d.]+)rem,\\s*([\\d.]+)rem\\)`).exec(css)
    if (!m) return null
    const [lo, vw, add, hi] = m.slice(1).map(Number) as [number, number, number, number]
    return (w: number) => Math.min(Math.max((vw / 100) * w + add * REM, lo * REM), hi * REM)
  }

  for (const [name, mobile, desktop] of [
    ['text-brand-cover', [44, 60], [70, 96]],
    ['text-brand', [44, 60], [70, 96]],
  ] as [string, [number, number], [number, number]][]) {
    const f = parseClamp(name)
    check(`${name} 是 vw+rem 混合式 clamp（纯 vw 会在中段掉出区间）`, f !== null)
    if (!f) continue
    for (const w of [375, 390, 430]) {
      const px = f(w)
      check(
        `${name} @ ${w}px 落在手机区间 ${mobile[0]}–${mobile[1]}px`,
        px >= mobile[0] && px <= mobile[1],
        `${px.toFixed(1)}px`,
      )
    }
    for (const w of [1024, 1280, 1440]) {
      const px = f(w)
      check(
        `${name} @ ${w}px 落在桌面区间 ${desktop[0]}–${desktop[1]}px`,
        px >= desktop[0] && px <= desktop[1],
        `${px.toFixed(1)}px`,
      )
    }
  }
}

function checkReadingCardRow(): void {
  section('Reading 牌阵行 · 横向预算')

  const REM = 16
  const vw = (pct: number, w: number) => (pct / 100) * w
  const clamp = (lo: number, mid: number, hi: number) => Math.min(Math.max(mid, lo), hi)

  /* 与 theme.css 的 token 逐字对应。改了那边这里必须跟着改 —— 
     不同步时下面的断言会先红，而不是等用户在 375 屏上看到溢出。 */
  const cardWSm = (w: number) => clamp(4 * REM, vw(3.14, w) + 3.24 * REM, 7 * REM)
  const cardWMd = (w: number) => clamp(7 * REM, vw(3.14, w) + 6.24 * REM, 10 * REM)
  const cardWLg = (w: number) => clamp(11 * REM, vw(4.18, w) + 9.98 * REM, 15 * REM)

  /* ReadingPage 里那两个表达式 */
  const widthFor = (n: number, w: number) =>
    n <= 1 ? Math.min(vw(44, w), cardWLg(w))
    : n <= 3 ? Math.min(vw(24, w), cardWMd(w))
    : Math.min(vw(14, w), cardWSm(w))
  const gapFor = (n: number, w: number) =>
    n <= 3 ? Math.min(vw(4, w), 4 * REM) : Math.min(vw(2, w), 1.75 * REM)

  /* 容器：AppShell 的 column 宽度减去 px-4 的左右内边距 */
  const availFor = (w: number) => Math.min(vw(92, w), 40 * REM) - 32

  /* 375 / 390 / 430 是本轮要求覆盖的三档；1440 代表桌面 */
  for (const w of [375, 390, 430, 1440]) {
    const avail = availFor(w)
    for (const n of [1, 3, 5]) {
      const total = n * widthFor(n, w) + (n - 1) * gapFor(n, w)
      check(
        `${w}px · ${n} 张牌不横向溢出`,
        total <= avail,
        `${total.toFixed(0)} / ${avail.toFixed(0)}px`,
      )
    }
  }

  /* 桌面上 3 张牌的间距要落在「留白是设计元素」的那一档。
     太挤读起来是列表，太散读起来是三件不相干的东西。 */
  const deskGap = gapFor(3, 1440)
  check(
    '桌面 3 张牌间距落在 48–72px',
    deskGap >= 48 && deskGap <= 72,
    `${deskGap.toFixed(0)}px`,
  )

  /* 375 上牌不能小到看不清画面。53px 宽的牌在 dpr3 上是 159 设备像素，
     thumb 是 240px —— 仍然不糊，但再小就该换成横向 swipe 而不是继续压缩。 */
  const minCard = widthFor(5, 375)
  check(
    '375px 上五张牌阵的单张宽度不低于 48px',
    minCard >= 48,
    `${minCard.toFixed(0)}px`,
  )
}

checkNoRevealShift()
checkDeterminism()
checkNoHorizontalOverflow()
checkContinuousSweep()
checkReadingCardRow()
checkBrandScale()

console.log(`\n${'─'.repeat(64)}`)
if (fail === 0) {
  console.log(`${G}全部通过${X}  ${pass} 项断言，0 失败`)
  console.log(`${D}牌阵不会重叠 —— 这不再是调出来的，是算出来的。${X}`)
} else {
  console.log(`${R}${fail} 项失败${X}  ${pass} 项通过`)
}
console.log('─'.repeat(64))
process.exit(fail === 0 ? 0 : 1)
