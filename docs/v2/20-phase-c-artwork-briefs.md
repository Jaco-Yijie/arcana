# PHASE C · 真实内容纵切片：5 张牌 × 4 套牌组

> 本文承接 [`19-deck-visual-identity.md`](./19-deck-visual-identity.md)，把其中的方向落成
> **20 份可直接交给出图系统的 brief**，并给出技术规格、生产清单与人工验收标准。
>
> **本轮不生成任何图片。** 下一轮只做 `major-00 × 4`，验收通过后再做剩余 16 张。

---

## 0. 铁律（每一份 brief 都受它约束）

| # | 规则 | 为什么 |
|---|---|---|
| 1 | 同一 cardId 的**牌义、正逆位、keywords、symbols 在四套之间完全一致** | 换牌组只换画。这是产品的立身之本，由 `deck:check` 的语义不变性断言钉死 |
| 2 | 画面里**不烘焙任何文字与数字** | 牌名与编号由代码绘制。烘焙进去，180° 旋转就出现倒字 |
| 3 | **不提供逆位版本**，构图必须**可 180° 阅读** | 逆位 = 同一张图 `rotate(180deg)`。不要强重力构图，主体尽量居中，四角尽量对称 |
| 4 | **不复刻 Rider–Waite–Smith 构图** | 参考原型可以，抄构图不行。目标是原创 deck identity |
| 5 | 边缘 6% 安全区；底部 22% 会被牌名渐变压住 | 卡片有圆角、内描边与牌名遮罩 |
| 6 | 四套**同步交付**，不接受先画完一套 | 半成品状态会制造「某副牌明显更高级」的时期 |

---

## 1. 五张牌的符号骨架（跨牌组必须存活）

symbolic **function** 必须保留，具体**物件**可以按牌组世界观替换。
换句话说：愚者不一定要有一条白狗，但必须有「一个不阻止你、只提醒你看脚下的同行者」。

| cardId | 核心原型 | 必须存活的 3–5 个符号功能 |
|---|---|---|
| `major-00` 愚者 | 进入未知 / 起点 / 门槛 | ① 门槛（脚下的临界）② 轻装（可移动性）③ 未被踩出的路 ④ 同行者（本能的提醒）⑤ 前方的空 |
| `major-01` 魔术师 | 能动性 / 把想法接到现实 | ① 四种工具齐备 ② 一个明确的举起/指向动作 ③ 工作台（有边界的落点）④ 上下连接（意图贯通）|
| `major-02` 女祭司 | 直觉 / 未公开的信息 / 观察 | ① 帷幕（知与未知的交界）② 一对界柱 ③ 只露一半的载体（卷轴/书/石板）④ 静水（映照）⑤ 新月（尚未成形）|
| `major-06` 恋人 | 取舍 / 价值观对齐 | ① 两个同等分量的主体 ② 分岔（选一条即放下另一条）③ 更高视角的注视 ④ 远处的目标（判断依据）|
| `major-13` 死神 | 结束 → 转化 → 让位 | ① 缓慢而不可逆的行进 ② 一面旗/标记（变化本身，非灾祸）③ 被留下的那一样东西 ④ 地平线上的下一段 |

> 注意 `major-13`：**严禁任何骷髅、墓碑、镰刀砍人、血、恐怖元素**。
> 这张牌在本产品里讲的是「搬家」，不是死亡。

---

## 2. 四套牌组的视觉语言（brief 的共同底座）

| | `ethereal` 空灵 | `elysian` 极乐之影 | `opaline` 蛋白潮汐 | `wonderland` 仙境之影 |
|---|---|---|---|---|
| 一句话 | 雾还没散，光已经在了 | 树荫底下，光是暖的 | 潮水退下去之后留的颜色 | 再往里走一点就不一样了 |
| 媒介感 | 湿水彩、边缘全部化开 | 蛋彩 + 金箔，新艺术描边 | 半透明水彩叠色 + 珠光 | 童书铜版画 + 淡彩 |
| 主色 | 灰蓝 / 珍珠白 / 极淡暖光 | 深橄榄绿 / 近黑 / 旧金 | 珠白 / 海蓝 / 水绿 / 薰衣草 | 深紫 / 墨绿 / 绿金 |
| 线条 | **无硬线**，全靠明度分界 | 闭合的金色装饰线，严格对称 | 银发丝线，随水流走向 | 荆棘状不规则线，粗细跳变 |
| 光 | 漫射，无明确来源 | 高处斜射，阴影很长 | 水面反射的散光 | 来源不明的绿金，方向可疑 |
| 空间 | 留白 ≥ 55%，物体像浮着 | 有围墙的园子，纵深压缩 | 横向开阔，水天相接 | 透视被拧过，近大远也大 |
| 构图纪律 | 中心留空 | **严格左右镜像** | 非对称，重心偏一侧 | **每张至少一处透视错误** |
| 卡框 | 无框，靠留白收边 | 闭合金线框 + 四角对称纹 | 细银线 + 波形内衬 | 荆棘框，四角不等长 |
| 一眼识别锚点 | 浅、无线、雾 | 深绿 + 闭合金框 | 同一带上青→品红渐变 | 透视错了 |

**极乐之影 vs 空灵的机械判据**：极乐每张必须严格左右对称；空灵每张不得出现一根硬边线。
**仙境 vs 极乐的机械判据**：仙境每张必须至少有一处明显的透视/尺度错误；极乐不得有。

---

## 3. 20 份 Artwork Brief

字段固定为：Core Archetype / Scene / Main Subject / Pose / Environment / Primary Symbols /
Lighting / Palette / Composition / Border / Number Treatment / Must Preserve / Must Avoid /
Image Generation Prompt / Negative Constraints。

`Number Treatment` 一律为：**画面内不画任何数字或文字**，只说明「代码绘制的编号叠在哪个区域，那里需要留出低对比的净空」。

---

### 3.1 `major-00` The Fool × 4

---

#### `ethereal` / `major-00`

- **Core Archetype**：站在门槛上，前方是尚未成形的空间
- **Scene**：云层的边缘。地面在画面下三分之一处溶解成雾，没有明确的悬崖线
- **Main Subject**：一个中性、几乎半透明的人形，背对偏侧四分之三角度，只到膝盖以上可辨
- **Pose**：一只脚已经离地，重心前倾但没有跌落感；一只手松松垂着，掌心向外
- **Environment**：上方是开阔的淡色天空，下方是化开的云。**没有任何硬边**
- **Primary Symbols**：脚下溶解的地面（门槛）· 极小的布包（轻装）· 一道未被踩出的浅色光带（路）· 一只停在空中的白色小鸟（同行者，替代传统的犬）· 画面上半的大片空（未知）
- **Lighting**：漫射，无明确光源；人形边缘比中心亮
- **Palette**：灰蓝 `#B9C6D4` · 珍珠白 · 极淡的暖金只用于那道光带
- **Composition**：中轴偏左 1/8，人形占画高 45%，上方留白 40%
- **Border**：无框
- **Number Treatment**：顶部中央留 12% 净空（低对比雾区）
- **Must Preserve**：门槛感 · 轻装 · 同行者 · 大面积未知
- **Must Avoid**：清晰的悬崖线 · 任何黑色 · 硬描边 · 明确的面部五官
- **Image Generation Prompt**：
  > Ethereal wet-watercolor tarot illustration, vertical 3:5. A translucent androgynous figure seen from behind at three-quarter angle, upper body only, one foot lifted mid-step, one hand hanging open. The ground beneath dissolves into pale mist with no hard edge. A small cloth bundle. A faint warm light-band leads forward across empty space. A single white bird hovers nearby. Upper 40% is open pale sky. Diffuse light with no source, figure edges brighter than centre. Palette: grey-blue, pearl white, one faint warm gold accent. No outlines anywhere, all boundaries formed by value alone. Airy, quiet, spacious, breathing room. Centered composition readable when rotated 180 degrees.
- **Negative Constraints**：`no text, no numbers, no lettering, no cliff edge, no black, no ink outlines, no facial features, no heavy contrast, no gothic, no dense ornament, no frame, no logo, no watermark, no signature`

---

#### `elysian` / `major-00`

- **Core Archetype**：同上
- **Scene**：一片古老园林的出口 —— 两根爬满常春藤的石柱之间，外面是暗下去的森林
- **Main Subject**：一个身着深绿长袍、轮廓清晰的人物，正面站立于两柱正中
- **Pose**：双脚已跨过石阶的边界，双手各持一物（左手一枝橄榄，右手空）
- **Environment**：柱内是有围墙的园子，柱外是压暗的林地。纵深被压缩，像舞台布景
- **Primary Symbols**：石阶的边界（门槛）· 一只系在腰间的小皮囊（轻装）· 柱外一条几乎看不见的小径（路）· 一只停在左柱顶端的乌鸫（同行者）· 柱外的暗（未知）
- **Lighting**：从画面右上斜射进来的暖光，落在人物左肩与石阶上；阴影很长
- **Palette**：深橄榄绿 · 近黑 `#0E1310` · 旧金 `#B8944F`
- **Composition**：**严格左右镜像**（两柱、两侧藤蔓、四角纹样等长），人物居正中
- **Border**：闭合金线框，四角对称新艺术纹样
- **Number Treatment**：顶部金框内预留一块 10% 的净底
- **Must Preserve**：门槛（石阶）· 轻装 · 同行者 · 柱外的未知
- **Must Avoid**：不对称构图 · 明亮高调 · 卡通感 · 抄袭 Ethereal Visions 的具体纹样
- **Image Generation Prompt**：
  > Art-Nouveau-influenced tarot illustration, vertical 3:5, egg-tempera and gold-leaf feel. A robed figure in deep olive stands exactly centred between two ivy-covered stone columns, having just stepped over a stone threshold. Left hand holds an olive sprig, right hand open and empty. A small leather pouch at the belt. Beyond the columns, a darkened forest with a barely visible path. A blackbird perches on the left column capital. Warm light rakes in from upper right, casting long shadows. Palette: deep olive green, near-black, antique gold. Strict bilateral symmetry. Closed gold decorative border with symmetrical corner motifs. Original ornament design, classical and ritual, old-world mystery. Readable when rotated 180 degrees.
- **Negative Constraints**：`no text, no numbers, no lettering, no asymmetry, no bright pastel, no cartoon, no skull, no modern clothing, no logo, no watermark, no signature`

---

#### `opaline` / `major-00`

- **Core Archetype**：同上
- **Scene**：退潮后的海岸线，湿沙与浅水的交界
- **Main Subject**：一个身披半透明浅色薄纱的人物，侧身面向海面
- **Pose**：一只脚踩进浅水，水面泛起一圈涟漪；双臂自然张开，掌心朝上
- **Environment**：左侧是湿沙，右侧是浅水铺开到地平线；天空低而开阔
- **Primary Symbols**：潮线（门槛）· 一只挂在腕上的小贝壳囊（轻装）· 湿沙上一行还没被浪抹去的脚印（路）· 一只在浅水中同行的小海鸟（同行者）· 远处水天相接的空（未知）
- **Lighting**：水面反射的散光，从下往上打亮人物下颌与手臂
- **Palette**：珠白 · 海蓝 `#7FA8BF` · 水绿 · 薰衣草。**同一条湿沙带上颜色从青滑到品红**
- **Composition**：非对称，人物在右三分之一；潮线横贯画面偏下
- **Border**：细银线 + 波形内衬
- **Number Treatment**：底部左侧留一块无涟漪的平静水面
- **Must Preserve**：门槛（潮线）· 轻装 · 同行者 · 远处的空
- **Must Avoid**：普通的「蓝色塔罗」（必须有虹彩换位）· 对称构图 · 深色阴影
- **Image Generation Prompt**：
  > Luminous iridescent tarot illustration, vertical 3:5, translucent layered watercolour with mother-of-pearl sheen. A figure draped in sheer pale fabric stands in profile at the water's edge after low tide, one foot in shallow water creating a single ripple ring, both arms open with palms up. Wet sand on the left, shallow water extending to a low horizon on the right. A small shell pouch at the wrist. A line of footprints in the wet sand, not yet erased. A small shorebird wading alongside. Light reflects upward from the water, illuminating the underside of the chin and arms. Palette: pearl white, sea blue, aqua, lavender, with a visible colour shift from cyan to magenta across the wet sand. Asymmetric composition, subject at right third. Fine silver line border with wave inlay. Readable when rotated 180 degrees.
- **Negative Constraints**：`no text, no numbers, no lettering, no flat blue, no dark shadows, no symmetry, no heavy outline, no glitter, no rainbow gradient banding, no logo, no watermark, no signature`

---

#### `wonderland` / `major-00`

- **Core Archetype**：同上
- **Scene**：一条从画面底部升起、在半空断掉又在别处继续的小径
- **Main Subject**：一个比例略微失真的人物（腿偏长、头偏小），戴一顶过大的帽子
- **Pose**：正要迈上那条断掉的路，身体前倾的角度比重力允许的更多一点
- **Environment**：超大尺寸的植物（一朵比人高的花、几片巨大叶子）· 远处一扇歪斜的门
- **Primary Symbols**：断掉的路面（门槛）· 一只系在杖头的小布袋（轻装）· 那条**不可能的路**（路）· 一只倒挂在花茎上的猫头鹰（同行者）· 门后不可见的部分（未知）
- **Lighting**：绿金色，从画面右下往上打 —— **光源位置与阴影方向不一致**（这是刻意的透视错误）
- **Palette**：深紫 `#3A2246` · 墨绿 · 绿金 `#C9B26A`
- **Composition**：中轴略偏右；**至少一处明显透视错误**（远处的门比近处的花还大）
- **Border**：荆棘框，四角不等长
- **Number Treatment**：顶部荆棘间留一块深色净空
- **Must Preserve**：门槛（断路）· 轻装 · 同行者 · 门后的未知
- **Must Avoid**：儿童卡通 · 明确的童话 IP 角色（无兔子、无扑克牌、无茶会）· 恐怖血腥 · 正确的透视
- **Image Generation Prompt**：
  > Storybook-surreal tarot illustration, vertical 3:5, engraved children's-book linework with muted colour wash. A slightly distorted figure with long legs and a small head, wearing an oversized hat, about to step onto a narrow path that breaks off in mid-air and resumes elsewhere. Oversized flora: one flower taller than the figure, several giant leaves. A crooked door in the distance rendered LARGER than the nearer flower, an intentional perspective error. A small cloth bag tied to a walking staff. An owl hanging upside-down from a flower stem. Green-gold light rising from lower right while shadows fall inconsistently. Palette: deep purple, ink green, green-gold. Thorn border with uneven corners. Whimsical, dreamlike, faintly unsettling but never horrific. Readable when rotated 180 degrees.
- **Negative Constraints**：`no text, no numbers, no lettering, no rabbit, no playing cards, no tea party, no Alice iconography, no gore, no horror, no correct linear perspective, no children's cartoon cuteness, no logo, no watermark, no signature`

---

### 3.2 `major-01` The Magician × 4

四套共同骨架：**工具齐备 + 一个明确的举起/指向动作 + 有边界的工作台 + 上下连接**。

| Deck | Scene / Subject | Pose | Primary Symbols | Composition / Border |
|---|---|---|---|---|
| `ethereal` | 雾中一张几乎看不见边缘的浅色台面，一个半透明人形立于其后 | 一手上举没入雾中，一手掌心向下指向台面 —— 上下之间由一道垂直光带连通 | 四件几乎融进雾里的器物（杯/刃/枝/石）· 垂直光带（上下连接）· 台面（边界）· 手腕处一圈极淡的光环（无限符号的转写） | 严格中轴，人形占 50%，上下各留 25% 空。无框 |
| `elysian` | 石砌工作台，台面铺墨绿绒布，背后是闭合的常春藤拱 | 右手高举一柄细长金杖直抵拱顶，左手平摊指向台面正中 | 四件金饰器物**左右各二对称摆放** · 拱顶到台面的金线（上下连接）· 台面（边界）· 头顶一枚横置的金色 ∞ 浮雕 | 严格镜像；闭合金框 + 对称四角纹 |
| `opaline` | 潮池边一块被水磨平的礁石当台面，海水漫到脚边 | 一手举起一枚发光的贝壳，一手指向潮池水面 —— 水面倒影与举起的手形成上下呼应 | 四件海物（贝/珊瑚枝/海玻璃/骨白小刀）· 举起物与其水中倒影（上下连接）· 礁石台面（边界）· 潮池表面的虹彩环 | 非对称，礁石在左下；细银线 + 波形内衬 |
| `wonderland` | 一张三条腿长度不一的木桌，桌面倾斜但器物没有滑落 | 一手举起一把悬空的钥匙，一手指向桌面上一个不存在的洞 | 四件不成套的怪器物（茶匙/断枝/发条眼/玻璃瓶）· 举起的钥匙与桌面的洞（上下连接，但**不对位**）· 倾斜桌面（边界）· 桌下缠绕的荆棘 | 中轴偏左；**桌面倾斜而器物不滑落**＝透视错误；荆棘框 |

**四套共同 Must Avoid**：不得让魔术师看起来像在「探索新方向」（那是愚者）· 不得出现文字咒语 · 不得舞台魔术道具（礼帽、扑克、兔子）

---

### 3.3 `major-02` The High Priestess × 4

四套共同骨架：**帷幕 + 一对界柱 + 只露一半的载体 + 静水 + 新月**。
**共同 Must Avoid**：不得画成「闭眼冥想什么都不做」——她是在**观察**，眼睛应睁着且视线有落点。

| Deck | Scene / Subject | Pose | Primary Symbols | Composition / Border |
|---|---|---|---|---|
| `ethereal` | 两道由雾浓度差形成的「柱」，中间垂着一层更薄的雾 | 端坐，目光落在身前的水面上，不看观众 | 雾帷幕 · 两道雾柱 · 膝上一卷只展开三分之一的浅色布卷 · 脚前一汪静水（映出上方的空）· 极细的新月 | 严格中轴；上方留白 45%。无框 |
| `elysian` | 两根黑石柱之间垂一幅深绿绣金帷幔 | 端坐于石阶上，一手压在半开的书页上 | 绣金帷幔 · 两根石柱（左黑右深绿）· 半开的皮面书 · 石阶下一方矩形静水池 · 帷幔顶端的金色新月浮雕 | 严格镜像；闭合金框 |
| `opaline` | 两道立起的水幕之间，一层更薄的水膜 | 半跪在浅水中，指尖点在水面 —— 涟漪尚未扩散 | 水膜帷幕 · 两道水柱 · 一枚半开的贝（内壁有文字状纹路但**不是文字**）· 脚下静止的潮池 · 水面上的新月倒影（**天上那枚不入画**） | 非对称，人物在左三分之一；银线波形框 |
| `wonderland` | 两株对生的巨型植物之间垂下一片过大的叶幕 | 侧坐在一只倒扣的巨大茶杯上（不出现茶会元素，只是尺度错误的容器） | 叶幕 · 两株巨型植物 · 手中一枚只开了一条缝的木盒 · 脚下一滩**垂直挂在墙上却不流下来的水**（透视错误）· 叶隙间的绿金新月 | 中轴偏右；荆棘框 |

---

### 3.4 `major-06` The Lovers × 4

见 [`19-deck-visual-identity.md` 附录 A](./19-deck-visual-identity.md) 已写就的八套 brief，
本文件取其中 `ethereal` / `elysian` / `opaline` / `wonderland` 四套，**不重复抄录**。

四套的「抉择」表达手段各不相同 —— 这正是选它替换星星的理由：

| Deck | 抉择怎么表达 |
|---|---|
| `ethereal` | 两个人形之间的**空**，而那个空是画面最亮处 |
| `elysian` | 拱下的**分岔石径**，分岔点被斜光照亮，两条路都在暗处 |
| `opaline` | 一道潮线把画面分成两半，**左右湿沙反射出不同色相** |
| `wonderland` | 两扇歪斜的门，中间悬着一把**不指向任何一扇门的钥匙** |

---

### 3.5 `major-13` Death × 4

四套共同骨架：**缓慢不可逆的行进 + 一面标记 + 被留下的一样东西 + 地平线上的下一段**。
**共同 Must Avoid（最严）**：`no skull, no skeleton, no scythe, no grave, no blood, no corpse, no horror`。
这张牌在本产品里讲的是**搬家**。

| Deck | Scene / Subject | Primary Symbols | 识别点 |
|---|---|---|---|
| `ethereal` | 一个正在从画面右侧走出边界的半透明背影，身后的雾比身前浓 | 行进（脚印在雾里逐渐消失）· 手中一面无纹的浅色旗 · 地上留下的一只鞋 · 远处雾里透出的一道亮线（下一段） | 雾的浓度差就是「已经过去 / 还没到」 |
| `elysian` | 一列缓慢穿过园门的深色行伍剪影（不画脸），门内是已经凋落的花圃 | 行进 · 一面绣白玫瑰的深色旗 · 门槛上留下的一只金环 · 门外远处两座塔的轮廓 | 严格对称的门 + 闭合金框 |
| `opaline` | 退到最远处的潮水，露出的湿沙上有一道正在被抹去的痕迹 | 行进（潮痕）· 一片立在沙上的白色贝壳（旗的转写）· 沙里半埋的一只小锚 · 地平线上正在亮起来的天 | 潮水本身就是不可逆 |
| `wonderland` | 一扇正在缓慢关上的门，门缝里透出的光比门外还亮 | 行进（门的角度）· 门上挂的一枚风干花环 · 门口留下的一把伞 · 门缝里那束**方向不对**的光 | 门缝光比外面亮＝透视/物理错误 |

---

## 4. C12 跨牌组相似度自检（`major-00` 为例）

| 维度 | ethereal | elysian | opaline | wonderland |
|---|---|---|---|---|
| 角色设计 | 半透明、无五官、只到膝上 | 深绿长袍、轮廓清晰、正面全身 | 薄纱、侧身、赤足 | 比例失真、过大帽子 |
| 姿态 | 抬脚前倾，手垂 | 已跨过石阶，双手持物 | 踩进浅水，双臂张开 | 前倾角度超出重力允许 |
| 环境 | 云层边缘 | 园林出口 / 石柱 | 退潮海岸 | 断掉的空中小径 |
| 构图 | 中轴偏左，留白 40% | 严格镜像 | 非对称，右三分之一 | 偏右 + 透视错误 |
| 门槛的实现 | 溶解的地面 | 石阶 | 潮线 | 断掉的路面 |
| 同行者 | 悬停白鸟 | 柱顶乌鸫 | 涉水海鸟 | 倒挂猫头鹰 |
| 卡框 | 无 | 闭合金线 + 对称四角 | 细银线 + 波形 | 荆棘、四角不等 |
| 光 | 漫射无源 | 右上斜射，长影 | 水面自下反射 | 绿金、方向自相矛盾 |
| 主色 | 灰蓝 / 珠白 | 深橄榄 / 近黑 / 旧金 | 珠白 / 海蓝 / 薰衣草 | 深紫 / 墨绿 / 绿金 |

**判定 PASS**：8 个维度全部不同，不存在「同一个人 + 同一姿势 + 换背景色」。

## 5. C13 同套牌组内跨牌自检（`elysian` 为例）

| | Fool | Magician | High Priestess | Lovers | Death |
|---|---|---|---|---|---|
| 剪影 | 单人立姿，纵向 | 单人 + 横向台面，T 形 | 端坐，三角形 | 双人 + 拱，M 形 | 横向行伍，带状 |
| 焦点 | 石阶边界（下三分之一） | 举起的金杖顶端（上） | 半开的书（中） | 分岔点（中下） | 门槛上的金环（下） |
| 符号语言 | 边界与出发 | 工具与连接 | 遮蔽与半露 | 分岔与对称 | 行进与遗留 |
| 纵深 | 柱内 → 柱外两层 | 单层，贴近观者 | 两柱夹一层帷幔 | 拱下延伸 | 穿门而过的深纵深 |

统一的是媒介、色板、严格对称与金框；不同的是剪影、焦点高度、纵深层数。

---

## 6. C14 技术规格（正式生产用）

| 项 | 值 |
|---|---|
| 长宽比 | **严格 3 : 5（1 : 1.6667）**，与 `--card-ratio` 一致 |
| full 分辨率 | **1080 × 1800** |
| 格式 | WebP，质量 78，sRGB 并嵌入 profile |
| Alpha | **不带 alpha**（不透明）。卡面圆角与描边由 `CardFrame` 渲染，图里不要做圆角或透明边 |
| 单张体积 | 牌面 ≤ 220KB · 卡背 ≤ 180KB · 封面 ≤ 260KB（封面 1200 × 2000） |
| 文件名 | **canonical cardId 原样**：`major-00.webp` `major-01.webp` `major-02.webp` `major-06.webp` `major-13.webp`。不改 id、不加前缀、不用牌名 |
| 目录 | `public/assets/decks/<deckId>/cards/` · 封面卡背在 `deck/` |
| 缩略图 | **不需要美术提供**。`npm run thumbs` 自动派生到 `thumbs/`（240 × 400，WebP q72，`fit:cover` 居中，确定性输出） |
| 交付后 | ① `npm run thumbs` ② 在 `manifests.ts` 登记 `{ w:1080, h:1800, thumb:true }` ③ `npm run deck:check` |
| 源文件 | PSD/TIFF 另存他处，**不进本目录** |

---

## 7. C15 生产清单（Production Manifest）

状态取值：`brief` → `generated` → `review` → `approved` → `integrated`

| deck | major-00 | major-01 | major-02 | major-06 | major-13 |
|---|---|---|---|---|---|
| `ethereal` | **brief** | brief | brief | brief | brief |
| `elysian` | **brief** | brief | brief | brief | brief |
| `opaline` | **brief** | brief | brief | brief | brief |
| `wonderland` | **brief** | brief | brief | brief | brief |

**20 / 20 = brief。0 张 generated。**

下一轮范围：加粗的 `major-00 × 4`。**Fool 四套验收通过后**，再放行剩余 16 张。
先做 Fool 的理由：它是四套里「门槛」这个抽象概念实现手段差异最大的一张，
如果连它都分不开，其余四张更分不开。

> 当前 `ethereal` 目录下有 5 张 `DEV FIXTURE` 测试图（见该目录 `DEV-FIXTURES.md`），
> 它们**不在本清单内**，正式素材到位时直接覆盖并删除 `devFixture` 标记。

---

## 8. C16 人工验收标准（1–5 分）

| 维度 | 5 分 | 3 分 | 1 分 |
|---|---|---|---|
| **A. 原型准确度** | 去掉牌名也能一眼认出是这张牌 | 需要想一下 | 认错成别的牌 |
| **B. 牌组归属** | 混进该牌组其余四张里毫无违和 | 大致像 | 像另一套牌 |
| **C. 跨牌组差异** | 与其余三套在 ≥6 个维度不同 | 4–5 个 | 只有配色不同 |
| **D. 构图质量** | 作为一张牌成立，焦点明确 | 可用 | 主体不清 / 出血 |
| **E. 符号整合** | 符号长在画面里 | 略显摆放 | 堆砌 |
| **F. 缩略图可读性** | 240px 下主体仍清楚 | 勉强 | 糊成一团 |
| **G. 产品一致性** | 放进 Library 像同一套牌 | 略跳 | 明显不搭 |

**通过线**：每项 ≥ 3，且 A / C / F 三项 ≥ 4。
任一项 = 1 → 直接打回，不进入 `approved`。

**两条只能靠人眼、自动化覆盖不到的检查**（必做）：
1. **把图旋转 180° 看一遍** —— 逆位就是这么显示的
2. **四套同一张牌并排放，遮住牌组名** —— 分不出来就是失败，这是整个多牌组存在的理由
