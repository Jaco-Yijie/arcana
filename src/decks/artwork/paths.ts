/**
 * Layer 2 · 资产定位、修订与 CDN 切换
 *
 * 【所有资产 URL 的唯一出口】
 * 这不是洁癖。Phase 3 是 5 × 78 = 390 张，必须走 CDN 或对象存储；
 * 如果路径散落在 30 个组件里，那次迁移会变成一场重构。
 *
 * 切到 CDN 只需要一个环境变量：
 *   VITE_DECK_ASSET_BASE_URL=https://cdn.example.com/arcana/decks
 *
 * 【目录形状 —— 与磁盘、与 README、与 deck:check 完全一致】
 *   <base>/<deckId>/deck/cover.webp
 *   <base>/<deckId>/deck/back.webp
 *   <base>/<deckId>/cards/<cardId>.webp?r=<rev>     full  1080×1800
 *   <base>/<deckId>/thumbs/<cardId>.webp?r=<rev>    thumb  240×400
 *
 * 【rev 为什么是 query 而不是路径段】
 * 第一版把它写成路径段 `…/<deckId>/r1/cards/…`，结果是一个「交付即坏」的陷阱：
 * 磁盘上、README 里、deck:check 的双向一致性检查里都**没有** r1 这一层，
 * 也没有任何 vite 插件或 server 重写去弥合。素材按规范放进去之后，
 * 浏览器请求 `/assets/decks/ethereal/r1/cards/major-00.webp` 会命中 SPA 兜底，
 * 拿到 200 + index.html（连 404 都不是），每一张牌都显示「加载失败」——
 * 而 deck:check 与 build 双绿，因为它们查的是另一个形状的路径。
 *
 * query 参数没有这个问题：磁盘布局保持扁平（美术友好、断言可查），
 * 静态服务器和 vite 都不需要任何重写，而 URL 仍然随 rev 变化，
 * `Cache-Control: immutable` 照样会因为 URL 不同而失效。
 *
 * 【为什么必须有 rev】
 * 静态资产按内容不变的假设发 `immutable` 长缓存（server/index.ts），
 * 而牌面文件名按设计恒定（= cardId，永不改）。
 * 两条各自正确的设计撞在一起 = **牌面在架构上不可更新**：
 * 返修一版画，已访问过的用户一年都看不到，而且没有任何逃生口。
 * 390 张手绘素材必然返修，这不是「如果」。
 * rev 必须在第一张真图入库前就位 —— 事后加要重排全部文件。
 *
 * 【为什么不按 major/ minor/ 分子目录】
 * 那条边界是 Layer 1 的语义（TarotCard.arcana）。路径一旦依赖它，
 * 本模块就必须回答「这张是大阿卡纳吗」，只有两条路：
 *   (a) import 牌义层 —— 把整个架构最想避免的耦合拉回来
 *   (b) 解析 cardId.startsWith('major-') —— 把 Layer 1 的分类规则
 *       复制一份到 Layer 2，两份迟早不同步
 * 而且它制造双真相源：major-00.webp 物理上可以被放进 minor/。
 * 78 张扁平放一个目录，`ls` 的字典序天然分成 5 组，够用了。
 */

import type { AssetVariant } from '../types'
import type { DeckId } from '../ids'

/** 未配置 CDN 时的本地资产根。走 public/，克隆下来直接能跑。 */
export const LOCAL_ASSET_BASE = '/assets/decks'

/**
 * 把 `VITE_DECK_ASSET_BASE_URL` 的原始值归一成资产根。
 *
 * 【为什么单独提出来】
 * 这条规则决定了 390 张牌面在生产环境的每一个 URL —— 一个多余的斜杠就是 780 个 404。
 * 但 `assetBaseUrl()` 直接读 `import.meta.env`，在 Node 里根本没有这个对象，
 * 于是它**在测试里只有「未配置」这一条分支可走**：远端根、末尾斜杠、空白串
 * 这三种真实会出事的输入，一条都测不到。
 *
 * 把纯逻辑摘出来之后，deployment:check 可以拿任意输入直接喂给**产品代码本身**，
 * 而不是喂给一份抄写在测试里的规则副本（两份迟早不同步，那正是本项目一贯避免的）。
 *
 * 归一规则只有两条，但两条都必须成立：
 *   1. 空、纯空白、未配置 → 回落本地根（保证不配 CDN 也能跑）
 *   2. 去掉**所有**末尾斜杠 → 拼接时不可能产生 `//`
 */
export function normalizeAssetBase(raw: string | undefined | null): string {
  const trimmed = typeof raw === 'string' ? raw.trim() : ''
  const base = trimmed.length > 0 ? trimmed : LOCAL_ASSET_BASE
  return base.replace(/\/+$/, '')
}

/** 资产根。末尾不带斜杠。 */
export function assetBaseUrl(): string {
  const env = (import.meta as { env?: Record<string, string | undefined> }).env
  return normalizeAssetBase(env?.VITE_DECK_ASSET_BASE_URL)
}

/**
 * canonical cardId → 文件名。
 *
 * 【命名硬规则】
 * 1. 文件名**必须**等于 cardId：`major-00.webp` … `pentacles-14.webp`。
 *    不用牌名、不用序号、不用中文 —— 牌名可能改文案，cardId 永不改。
 * 2. 小阿卡纳两位补零：`wands-01`，不是 `wands-1`。
 * 3. **不存在 `-reversed` 资产**。逆位与正位共用同一个文件。
 *    允许独立逆位资产必然产生「12 张有专门逆位图、66 张没有」的半状态，
 *    和「只画了 8 张」是同一类产品事故，只是发生在更敏感的轴上。
 *    这一条**没有变**，变的只是逆位怎么呈现 —— 见规则 4。
 *
 * 4. 原画**可以**烘焙牌名与编号；作为代价，逆位不再靠 rotate(180deg) 呈现。
 *
 *    【这条规则被改过，原文与改的理由都留在这里】
 *    原文是「原画里不烘焙任何文字与数字，牌名与编号由代码绘制」，
 *    给出的两个理由是：(a) 180° 旋转会出现倒字；(b) 牌组能自带文字就能自带改名。
 *
 *    Phase C2 的 390 张外部生产按另一套要求执行 —— 标题与编号烘焙进了每张图，
 *    并且它们是构图的一部分（顶部罗马数字压在装饰边框上、底部题字带有自己的花边），
 *    裁掉会破坏画面。C3 导入时这个冲突被记录在
 *    `Arcana_Full_390/logs/path-contract-note.txt` 里，必须二选一。
 *
 *    选择保留烘焙文字，因此理由 (a) 必须被正面解决而不是绕开：
 *    **逆位改为不旋转图像**，由 TarotCardFace 用独立的视觉标记表达朝向。
 *    数据层的 orientation 完全没有变 —— 抽牌、语义、Reading payload 一律不动，
 *    改的只是「逆位长什么样」这一件事。
 *
 *    理由 (b) 依然成立，所以它换了一种方式守住：牌名的**唯一真相源仍是
 *    Layer 1 的 card.nameZh**，由代码绘制在牌面底部；原画里那行英文题字
 *    是画的一部分，不参与任何逻辑，也不被任何代码读取。
 *    牌组仍然无法改一张牌叫什么。
 *
 * 5. 烘焙了文字的牌组必须在 `production.generated.ts` 的
 *    `DECKS_WITH_BAKED_TEXT` 里登记，否则代码绘制的编号会与画里的编号重叠。
 */
export function cardArtworkFileName(cardId: string): string {
  return `${cardId}.webp`
}

/** 某副牌的资产根（URL 侧）。与磁盘目录逐段对应 */
export function deckAssetDir(deckId: DeckId): string {
  return `${assetBaseUrl()}/${deckId}`
}

/** 修订号后缀。rev=1 也带上 —— 让「有没有 rev」不成为一个需要判断的分支 */
function revQuery(rev: number): string {
  return `?r=${rev}`
}

/** 牌面 URL。variant 决定取 full 还是 thumb */
export function cardArtworkUrl(
  deckId: DeckId,
  cardId: string,
  rev: number,
  variant: AssetVariant = 'full',
): string {
  const dir = variant === 'thumb' ? 'thumbs' : 'cards'
  return `${deckAssetDir(deckId)}/${dir}/${cardArtworkFileName(cardId)}${revQuery(rev)}`
}

/**
 * 卡背。**签名里没有 cardId** —— 78 张卡背结构上不可能因牌而异。
 *
 * variant 与牌面同理：Deck Library 里卡背只有 64px 宽，
 * 没有理由下载 1080 宽的原图。
 */
export function cardBackUrl(deckId: DeckId, rev: number, variant: AssetVariant = 'full'): string {
  const file = variant === 'thumb' ? 'back-thumb.webp' : 'back.webp'
  return `${deckAssetDir(deckId)}/deck/${file}${revQuery(rev)}`
}

/** 牌组封面。它不是任何一张牌，物理上也不在 cards/ 里 */
export function deckCoverUrl(deckId: DeckId, rev: number, variant: AssetVariant = 'full'): string {
  const file = variant === 'thumb' ? 'cover-thumb.webp' : 'cover.webp'
  return `${deckAssetDir(deckId)}/deck/${file}${revQuery(rev)}`
}

/**
 * 把一个运行期 URL 还原成磁盘相对路径。
 *
 * 存在的唯一理由：让 deck:check 能断言
 * **「运行期真的会去请求的那个位置」与「磁盘上真的有文件的那个位置」是同一处**。
 * 上一版正是因为没有这条对照，才让路径契约断裂了却全绿。
 */
export function urlToRepoPath(url: string): string {
  const base = assetBaseUrl()
  const withoutQuery = url.split('?')[0] ?? url
  const rel = withoutQuery.startsWith(base) ? withoutQuery.slice(base.length) : withoutQuery
  return `public/assets/decks${rel}`
}

/* ── 仓库内相对路径：用于「缺什么素材、放到哪」的提示，直接显示给人看 ──
   注意它们刻意不含 rev：给人看的是「该放哪个目录」，
   rev 是发布机制，不该出现在美术交付指引里。 */

export function cardArtworkRepoPath(deckId: DeckId, cardId: string): string {
  return `public/assets/decks/${deckId}/cards/${cardArtworkFileName(cardId)}`
}

export function cardThumbRepoPath(deckId: DeckId, cardId: string): string {
  return `public/assets/decks/${deckId}/thumbs/${cardArtworkFileName(cardId)}`
}

export function cardBackRepoPath(deckId: DeckId, variant: AssetVariant = 'full'): string {
  return `public/assets/decks/${deckId}/deck/${variant === 'thumb' ? 'back-thumb.webp' : 'back.webp'}`
}

export function deckCoverRepoPath(deckId: DeckId, variant: AssetVariant = 'full'): string {
  return `public/assets/decks/${deckId}/deck/${variant === 'thumb' ? 'cover-thumb.webp' : 'cover.webp'}`
}

/**
 * 缩略图规格。**生成器与 resolver 共用这一份** ——
 * 分成两处写迟早会漂移（生成 240 宽、resolver 按 320 宽算 srcset 之类）。
 */
export const THUMB_SPEC = {
  /** 与 --card-ratio 一致的 1:1.667。全站最大缩略展示约 108 CSS px，240 有 2× 余量 */
  card: { width: 240, height: 400 },
  /** 封面比牌略大：Library 展开态会到 164 CSS px */
  cover: { width: 320, height: 534 },
  back: { width: 240, height: 400 },
  /** WebP 质量。72 在这个尺寸下肉眼与 82 无差，体积小三成 */
  quality: 72,
} as const
