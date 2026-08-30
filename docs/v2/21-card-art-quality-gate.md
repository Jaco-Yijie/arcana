# Card Art Quality Gate（Phase C1A）

> 每一张进入 Arcana 的原画都必须过这道关。
> Benchmark 与最终 Artwork 用**同一份标准** —— benchmark 过不了，Style Bible 就得改，
> 而不是把标准放松。

机器可查的部分已经写进 `npm run artwork:check`；标 **人工** 的部分需要肉眼验收。

---

## A 组 · 单张原画

| # | 标准 | 判定 | 检查方式 |
|---|---|---|---|
| **A-01** | **Subject** — 存在清晰的视觉主体（人 / 动物 / 具体物），不是几何符号 | 遮住其余部分，仍能指出"这张画的是什么" | 人工 + Brief 的 `visual.heroSubject` 非空（自动） |
| **A-02** | **Narrative** — 是一幅**场景**，不是 UI Symbol | 能用一句话说出"谁正在做什么" | 人工 + Brief 的 `narrativeMoment` / 前中远景三层齐全（自动） |
| **A-03** | **Semantic Match** — 体现该牌的核心牌义 | 对照 `semanticCore` 与 `symbolism`，逐条能在画面里指出来 | 人工 + `mustInclude` 全部出现 |
| **A-04** | **Deck Identity** — 遮住牌名仍能判断属于哪套 | 见下方 B 组 | 人工 |
| **A-05** | **Thumbnail** — 缩到 **60px 宽**仍认得出主体 | 按 Brief 的 `thumbnailAnchor` 检查 | 人工（缩图并排看） |
| **A-06** | **Composition** — 不与同套牌其它牌高度重复 | 构图骨架（主轴 / 质感 / 有无地面）不与同套已完成的牌雷同 | 人工 + 参考 `MOTIF_SIGNATURE` 的四轴思路 |
| **A-07** | **Physicality** — 有明确的艺术媒介与实体牌质感 | 能说出"这是水彩 / 铜版 / 炭笔"，纸纹或颗粒可见 | 人工 |
| **A-08** | **Typography** — 牌名与编号符合该套 Style Bible | 对照 `bible.typography` 与 `bible.frame` | 人工 |
| **A-09** | **Tarot Symbolism** — 未因追求艺术感而抹掉核心象征 | `symbolism` 的每一条都能在画面里找到对应（可换物件，不可缺功能） | 人工 |
| **A-10** | **AI Artifacts** — 无多余手指、错误手部、乱码文字、重复器官、断裂牌框、异常人脸 | 放大到 100% 逐处检查；**手部是重灾区** | 人工 |

### A-10 补充：画面内不得烘焙任何文字

牌名与编号由代码绘制（`TarotCardFace`）。原画里出现任何字母、汉字、罗马数字一律退回 ——
逆位是同一张图 `rotate(180deg)`，烘焙进去的字会倒过来。

---

## B 组 · Deck Differentiation Gate

把五张 **The Fool** 并排、遮住牌名。

**必须能明确说出哪张是月光 / 古典 / 森语 / 星图 / 幽影。**

需要靠牌名才能区分 → **Benchmark Failed**，回去改 Style Bible，不是改 Prompt。

自动化投影（`artwork:check` 已覆盖）：

- 五套的 `medium.primary` / `surfaceTexture` / `edgeCharacter` / `lighting.source` / `luminanceProfile` / `perspective` / `cardBack.composition` / `frame.structure` 两两不同
- 任意两套的主色重合 ≤ 1 个
- 五张 The Fool 的 `thumbnailAnchor` 两两不同

---

## C 组 · 原创性

| # | 标准 |
|---|---|
| **C-01** | 不得描摹任何现有塔罗牌的具体构图、人物或边框 |
| **C-02** | 不得将网络图片直接作为正式 Asset 打包进 Arcana |
| **C-03** | 视觉研究只能用于提炼 medium / 构图原则 / 色彩逻辑 / 材质 / 线条性格 / 叙事方式 |
| **C-04** | 最终必须是 **Arcana Original Artwork System** |

---

## D 组 · 小阿卡纳专项

RWS 最重要的贡献是**小阿卡纳也画成完整叙事场景**。

| # | 标准 |
|---|---|
| **D-01** | 小阿卡纳不得退化成"一个符号 + 背景" |
| **D-02** | 必须有前景 / 中景 / 远景三层 |
| **D-03** | 必须有人物、动物或手参与，且有明确动作 |
| **D-04** | 大阿卡纳与小阿卡纳的完成度必须一致 —— 不接受"22 张很漂亮，56 张凑数" |

`artwork:check` 对 `wands-01` 的五份 Brief 已断言 D-02 与 D-03。

---

## 验收流程

```
Brief（已就绪）
  ↓
出图
  ↓
A 组逐条 → 任一不过 → 退回重画
  ↓
B 组并排 → 不过 → 改 Style Bible，整批重来
  ↓
status: benchmark        ← 试产，不进正式牌组
  ↓
人工批准
  ↓
status: approved         ← 开始对用户可见
  ↓
定稿
  ↓
status: final            ← 返修需升 rev
```

**status 是 `benchmark` 的原画永远不会被渲染成正式牌面** —— 由 `isDeliveredStatus()`
在 resolver 里把关，`ART-01b` 断言这一点。
