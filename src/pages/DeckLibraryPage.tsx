/**
 * Deck Library —— 数字牌柜（Digital Tarot Cabinet）。
 *
 * 【它不是一个列表页】
 * 这一页要回答的问题是「我想看看这一副牌」，不是「这里有几个选项」。
 * 所以主体是**封面**和**摊开的牌**，不是文字行。
 * 页面本身极度克制（发丝边、无渐变、无光效），
 * 强烈的视觉全部让给每一套 Deck 自己 —— 每行都套用自己那套氛围变量。
 *
 * 【这一页是全站最容易把产品做坏的地方】
 * 其他所有选择都是关于用户自己的（问什么、从哪切、拿哪张）。
 * 只有这一页是在**我们的东西之间**做选择，而人面对一组并列的同类物品时
 * 默认会排序 —— 在塔罗语境里「更好」只会被译成「更灵」。
 * 所以永远不做：稀有度 / 解锁 / 推荐指数 / 最受欢迎 / 能量标签 / 价格 / 编号 / 选中光爆。
 * deck:check 的 F 组按字段名与文案双重拦截，让它们在结构上无法被表达。
 *
 * 【布局历史】
 * 旧版是 420px 单列 + 5 张平铺缩略图。它有两个硬伤：
 *   1. CardFrame 的宽度走 inline style，外部传 className="w-8" 被静默忽略，
 *      5 张预览牌每张都是 64px 而非 32px，整行溢出容器 62px（牌挂在框外）
 *   2. 1440 屏上内容列只占 26%，两侧全是空背景
 * 现在：显式 width prop + 880px 画廊宽 + 负 margin 叠压的扇形。
 * 叠压不只是为了省空间 —— 五张牌叠在一起才像「一副牌」，平铺只像五个缩略图。
 */

import { useState } from 'react'
import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/atoms/Button'
import { CardFrame } from '@/components/card/CardFrame'
import { DeckCardBack } from '@/components/card/DeckCardBack'
import { DeckCover } from '@/components/deck/DeckCover'
import { TarotCardFace } from '@/components/card/TarotCardFace'
import { decks, getDeck } from '@/decks/registry'
import type { DeckDefinition } from '@/decks/types'
import { getAtmosphere } from '@/atmosphere/registry'
import { PREVIEW_CARD_IDS } from '@/decks/artwork/manifests'
import { deckProgress, isDeckPlayable } from '@/decks/artwork/resolver'
import { getCard } from '@/data/deck'
import { useDeck } from '@/hooks/useDeck'

/**
 * 画风示例的扇形。
 *
 * 【为什么叠压而不是平铺】
 * 5 张 88px 平铺需要 470px；叠压 34% 之后只占约 330px，
 * 在 880px 画廊里和封面并排还有余量。
 * 但真正的理由不是省空间：**牌是叠着的才像一副牌**。
 * 五张等距排开的缩略图读起来是「素材列表」，叠压才读起来是「摊开的牌」。
 */
function PreviewFan({ deckId }: { deckId: DeckDefinition['deckId'] }) {
  return (
    <div className="flex items-end">
      {PREVIEW_CARD_IDS.map((id, i) => (
        <div
          key={id}
          className="shrink-0 transition-transform duration-[var(--duration-base)] ease-[var(--ease-drift)]"
          style={{
            /* 第一张不缩进；其余每张压住前一张 22%。
               22% 是有依据的：叠得越多越像一副牌，但每张露出的那条竖带
               必须还能看清牌面主体（现在是「素材未提供 + cardId」）。
               34% 时露出 58px，标签直接被下一张压掉，读起来像坏了。 */
            marginLeft: i === 0 ? 0 : 'calc(var(--fan-card-w) * -0.22)',
            /* 后面的牌压在前面的牌上 —— 与实体牌堆的叠放顺序一致 */
            zIndex: i,
            /* 极轻微的高度错落，避免五张牌顶边完全成一条直线 */
            transform: `translateY(${(i % 2) * 3}px)`,
          }}
        >
          <CardFrame width="var(--fan-card-w)" size="sm" state="resting" deckId={deckId}>
            <TarotCardFace
              card={getCard(id)}
              orientation="upright"
              deckId={deckId}
              size="sm"
              showName={false}
            />
          </CardFrame>
        </div>
      ))}
    </div>
  )
}

function DeckRow({
  deck,
  active,
  expanded,
  showProgress,
  onSelect,
  onToggleExpand,
}: {
  deck: DeckDefinition
  active: boolean
  expanded: boolean
  showProgress: boolean
  onSelect: () => void
  onToggleExpand: () => void
}) {
  const progress = deckProgress(deck.deckId)
  const playable = isDeckPlayable(deck.deckId)
  /* 把这一套的氛围变量作用在它自己的子树上。
     否则未选中的牌组会用**当前**主题的颜色画预览，
     等于让用户照着空灵的配色去挑经典 —— 那这个页面就没意义了。 */
  const scope = getAtmosphere(deck.atmosphereId).themeVars as unknown as CSSProperties

  return (
    <div
      style={scope}
      className={[
        'overflow-hidden rounded-[var(--deck-radius)] border transition-colors duration-[var(--duration-base)]',
        active ? 'border-silver/45 bg-surface-1/40' : 'border-line-hairline bg-bg-void/30',
      ].join(' ')}
    >
      {/* 选中区与展开区是**分离**的两个可点区域。
          如果「展开才能选」，展开就成了必要步骤，用户会觉得必须读完才敢选，
          这一页就变重了 —— 而它本该是一次轻的偏好选择。 */}
      <motion.button
        type="button"
        role="radio"
        aria-checked={active}
        onClick={onSelect}
        animate={{ scale: active ? 1 : 0.995 }}
        transition={{ duration: 0.2, ease: [0.22, 0.61, 0.36, 1] }}
        className="flex w-full flex-col gap-5 p-[var(--deck-pad)] text-left sm:flex-row sm:items-start sm:gap-7"
      >
        {/* 封面 —— 第一视觉入口。它不是任何一张牌，可以画得比单张牌更放得开 */}
        <span className="flex shrink-0 items-start gap-4">
          <span
            className="block shrink-0 overflow-hidden rounded-sm border border-line-soft"
            style={{ width: 'var(--cover-w)', aspectRatio: 'var(--card-ratio)' }}
          >
            <DeckCover deckId={deck.deckId} showPath={false} />
          </span>

          {/* 手机端把名称贴在封面右侧，避免竖向堆太高 */}
          <span className="flex min-w-0 flex-col gap-1.5 sm:hidden">
            <DeckHeading deck={deck} active={active} />
          </span>
        </span>

        <span className="flex min-w-0 flex-1 flex-col gap-4">
          <span className="hidden min-w-0 flex-col gap-1.5 sm:flex">
            <DeckHeading deck={deck} active={active} />
          </span>

          {/* 画风示例：8 套用**完全相同**的 5 张牌。
              如果空灵展示星星、经典展示死神，用户看到的差异里就混进了
              牌本身的差异 —— 那正是「牌组有性格 → 牌组影响结果」的起点。
              正确的心智模型是：同一个模特，拍八组照片。 */}
          <PreviewFan deckId={deck.deckId} />
        </span>
      </motion.button>

      {/* Meta 与展开入口合并成一条。
          它们原本是两行（meta 在卡内、展开在独立的 44px 横条），
          白白多占 44px 高度，而右侧还空着 300px。合并之后行高降下来，
          一屏能看到的牌组从 1.5 套变成 2 套以上 —— 画廊要能扫视才成立。 */}
      <div className="flex h-11 w-full items-center justify-between gap-4 border-t border-line-hairline px-[var(--deck-pad)]">
        {/* 【正式页不显示进度】
            这一行原本是 `78 / 78 · 可用`。在「有些牌组还没画完」的年代它有意义 ——
            用户需要知道哪副能用。现在正式页只陈列能用的，这行就退化成
            每一行都一样的噪声，而且把交付进度这种工程信息摆给了用户看。
            dev route（showAll）保留它，那里确实需要一眼看出谁差多少。 */}
        {showProgress ? (
          <span className="flex items-center gap-2 text-[11px] tracking-wide-caps text-text-faint">
            <span>
              {progress.done} / {progress.total}
            </span>
            <span aria-hidden="true">·</span>
            <span>{playable ? '可用' : '素材备齐后开放'}</span>
          </span>
        ) : (
          <span aria-hidden="true" />
        )}

        <button
          type="button"
          onClick={onToggleExpand}
          aria-expanded={expanded}
          className="-mr-2 flex h-11 items-center px-2 text-caption text-text-faint transition-colors duration-[var(--duration-quick)] hover:text-text-low"
        >
          {expanded ? '收起' : '看看这套'}
        </button>
      </div>

      {/* 展开态：完整定位说明 + 放大的卡背。
          封面已经在折叠态了，展开就该给「这副牌拿在手里是什么感觉」——
          卡背才是抽牌全程会看 78 次的那一面。 */}
      {expanded && (
        <div className="flex flex-col items-start gap-5 border-t border-line-hairline px-[var(--deck-pad)] pt-5 pb-6 sm:flex-row sm:gap-7">
          <CardFrame size="md" state="resting" deckId={deck.deckId} className="shrink-0">
            <DeckCardBack deckId={deck.deckId} />
          </CardFrame>
          <p className="max-w-[46ch] text-caption leading-relaxed text-text-low">
            {deck.description}
          </p>
        </div>
      )}
    </div>
  )
}

function DeckHeading({ deck, active }: { deck: DeckDefinition; active: boolean }) {
  return (
    <>
      <span className="flex items-baseline gap-2.5">
        <span
          className="text-[22px] leading-tight text-text-hi sm:text-[26px]"
          /* 牌组名是写死的十个词，在 Display 子集字体的 223 字之内。
             它是这一页的主角文字，值得用艺术字档。 */
          style={{ fontFamily: 'var(--font-display)', fontWeight: 300, letterSpacing: '0.06em' }}
        >
          {deck.name}
        </span>
        {active && (
          <span className="shrink-0 text-[11px] tracking-wide-caps text-silver-dim">使用中</span>
        )}
      </span>
      <span className="text-caption leading-relaxed text-text-low">{deck.tagline}</span>
    </>
  )
}

export default function DeckLibraryPage({ showAll = false }: { showAll?: boolean } = {}) {
  const navigate = useNavigate()
  const { deckId, setDeckId } = useDeck()
  const current = getDeck(deckId)
  const playable = isDeckPlayable(deckId)
  /* 同时只展开一套 —— 多套同时展开会让页面变成一堵字墙，
     而这一页的主体本来就是封面和牌，不是文案。 */
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const toggle = (id: string) => setExpandedId((prev) => (prev === id ? null : id))

  /* ── 正式页只陈列**能用**的牌组 ──
     【为什么是过滤而不是删数据】
     未开工的牌组仍然登记在 registry 里，它们是后续产能，
     `/dev/decks` 仍然能看到全部十套。删掉数据会让下一批开工时无处落脚。

     【为什么按 isDeckPlayable 而不是写死五个 id】
     写死的话，那五套画完的那天需要有人记得回来改这一行 ——
     而「记得」正是这次出问题的原因：C3 交付 390 张之后，
     这一页仍然把 0/78 的空壳摆在主位，标题写着「现行牌组」，
     文案说「上面五套的插画还在制作中」，而事实已经完全反过来了。
     改成数据驱动之后，牌组能不能抽由资产决定，这一页自动跟上。 */
  const shelf = showAll ? decks : decks.filter((d) => isDeckPlayable(d.deckId))

  /* key 刻意**不**放进这个对象：藏在 spread 里的 key 静态检查看不到，
     React 19 也不再推荐这种写法。调用处显式写 key。 */
  const rowProps = (deck: DeckDefinition) => ({
    deck,
    active: deck.deckId === deckId,
    expanded: expandedId === deck.deckId,
    showProgress: showAll,
    onSelect: () => setDeckId(deck.deckId),
    onToggleExpand: () => toggle(deck.deckId),
  })

  return (
    <AppShell
      back="/"
      title="选择牌组"
      width="gallery"
      footer={
        <div className="flex flex-col gap-2">
          <Button
            size="lg"
            variant="primary"
            block
            disabled={!playable}
            onClick={() => navigate('/question?mode=question')}
          >
            就用这副
          </Button>
          {!playable && (
            <p className="text-center text-caption text-text-faint">
              「{current.name}」的 78 张牌面还没画完，暂时不能用来抽牌。
            </p>
          )}
        </div>
      }
    >
      {/* 布局 token 集中在这里，三档断点只改这几个值，
          组件内部一律读 var()，不散落硬编码尺寸 */}
      <div
        /* 尺寸只在这一行定义，组件内部一律读 var()，不散落硬编码。
           cover 与 fan 的比例是配平过的：封面高度（宽 × 1.667）必须
           接近右栏内容高度（名称 + tagline + 扇形），否则行里会出现
           一块由封面单独撑出来的空白 —— 那正是第一版 440px 行高的来源。
           lg: 封面 164→273 高，扇形 108→180 高，右栏合计约 248，差 25px，可接受。 */
        className="flex flex-col gap-[var(--deck-gap)] pt-2 [--cover-w:112px] [--deck-gap:16px] [--deck-pad:20px] [--deck-radius:16px] [--fan-card-w:62px] sm:[--cover-w:140px] sm:[--deck-gap:20px] sm:[--deck-pad:24px] sm:[--fan-card-w:88px] lg:[--cover-w:164px] lg:[--deck-gap:24px] lg:[--deck-pad:28px] lg:[--fan-card-w:108px]"
      >
        <p className="text-note text-text-mid">选一个你想待着的氛围。</p>

        <div role="radiogroup" aria-label="牌组" className="flex flex-col gap-[var(--deck-gap)]">
          {shelf.map((deck) => (
            <DeckRow key={deck.deckId} {...rowProps(deck)} />
          ))}
        </div>

        {/* 全站唯一一处直说。放页脚 = 事实备注，不是免责声明。
            正向陈述（「完全一样」）而不是否定式（「不会改变」）——
            连续否认三件事，等于主动提示用户这里可能有猫腻。 */}
        <p className="pt-2 text-caption leading-relaxed text-text-faint">
          所有牌组的牌义、牌序、正逆位完全一样 —— 变的只有画和光。
        </p>
      </div>
    </AppShell>
  )
}
