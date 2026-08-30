/**
 * Phase C1A · 五套牌的 Art Bible
 *
 * ══════════════════════════════════════════════════════════════
 * 【canonical five】
 * 月光 / 古典 / 森语 / 星图 / 幽影 —— 对应代码里的 `legacy-*` 五个 deckId。
 *
 * deckId 字符串保持 `legacy-` 前缀不变：它们是已持久化在用户 session 与日记里的
 * 标识符，改名等于一次静默的数据损坏。前缀是历史包袱，不是身份判断 ——
 * 从 Phase C1A 起，这五套就是**正式的五套插画牌组**。
 *
 * 【验收标准，写在最前面】
 * 把五张 The Fool 并排、遮住牌名，必须能一眼说出哪张是哪套。
 * 做不到就回来改 Bible，而不是去调 Prompt。
 *
 * 【五套的机械判据】
 * 每一套在下面四条轴上都与其余四套不同，artwork:check 逐条断言：
 *   medium.primary      水彩 / 铜版墨线 / 植物学水彩 / 深色广告颜料 / 炭笔
 *   lineLanguage.edge   化开 / 刻印 / 有机 / 发丝 / 硬切
 *   lighting.source     漫射月光 / 室内单灯 / 叶隙碎光 / 自发光天体 / 来源不明
 *   palette.luminance   最亮 / 暖中调 / 中绿调 / 深而饱和 / 最暗
 * ══════════════════════════════════════════════════════════ */

import type { DeckArtBible } from './types'
import type { DeckId } from '../ids'

/* ── 01 月光 ──────────────────────────────────────────────── */

const moonlight: DeckArtBible = {
  deckId: 'legacy-moonlight',
  identity: {
    name: '月光',
    visualThesis:
      '一本在月光与薄雾里翻开的梦境插画集 —— 新艺术运动的流动曲线，画在会吸水的纸上，边缘全都化开了。',
    coreMood: ['安静', '通透', '悬浮', '柔和'],
    emotionalKeywords: ['像刚醒来还记得的那个梦', '不催促', '可以久看', '看久了会松下来'],
  },
  medium: {
    primary: '透明水彩（湿画法为主）',
    secondary: ['薄水粉提亮', '极细银色墨线', '半透明颜料叠层'],
    surfaceTexture: '细纹水彩纸，纸纹只在放大时可见；颜料在边缘有自然的水痕',
    printCharacter: '轻微的胶印网点，银线处有极淡的凸起感；整体像高级画册而非卡牌印刷',
  },
  palette: {
    dominant: ['月白象牙', '雾蓝', '淡薰衣草', '柔银', '冷灰'],
    accent: ['去饱和的玫瑰', '极淡的暖金（面积 < 5%）'],
    forbidden: ['纯黑', '高饱和紫', '霓虹', '金黑对比的玄学配色', '任何纯 RGB 原色'],
    luminanceProfile: '五套里最亮。整体落在中高调，几乎没有真正的暗部；阴影用色相偏移而不是压暗',
  },
  lineLanguage: {
    weight: '极细，且宽度会随笔势自然变化',
    behavior: '新艺术式的连续长曲线；一根线可以横跨大半张牌；避免直角与机械几何',
    edgeCharacter: '化开 —— 轮廓线允许在雾里断掉、消失、再出现，不闭合是常态',
  },
  composition: {
    subjectScale: '主体占画面高度约 55–70%，四周留出可呼吸的空',
    depth: '三层：近处的织物或花、中景的人物、远处化在雾里的水面或月',
    symmetry: '非对称，重心略偏；但整体保持平衡',
    negativeSpace: '留白 ≥ 40%，且留白本身要有雾的层次，不能是空白纸',
    perspective: '弱透视，接近平视；空间靠明度层叠而不是线性透视',
  },
  lighting: {
    source: '漫射月光，没有可指出的光源位置',
    direction: '无明确方向，略微偏上',
    contrast: '低。最亮与最暗之间跨度小',
    behavior: '光穿过雾，边缘发生晕散；不产生硬阴影',
  },
  subjectLanguage: {
    humans: '修长优雅，比例略微拉长；面部刻画克制，五官柔化但不省略；衣物是会流动的薄织物',
    animals: '安静的、不与人对视的动物：鹿、白鸟、猫；毛发边缘融进雾里',
    architecture: '很少出现；若有则是拱、栏杆、水边台阶这类轻结构，绝不出现厚重墙体',
    nature: '水、云、月、雾、开着的花、垂下的枝条；一切都在缓慢移动',
    objects: '灯、杯、镜、丝带；器物边缘同样化开，不做硬质高光',
  },
  frame: {
    structure: '极细的单线银白边框，四角略带新艺术的植物内收弧',
    ornament: '极少 —— 只在上下两端各有一小段藤蔓，其余留空',
    titlePlacement: '底部居中，与画面下缘的雾自然衔接，不加背板',
    numberPlacement: '顶部居中，罗马数字，参与构图（可被雾部分遮住）',
  },
  typography: {
    personality: '人文衬线，笔画细，字距舒展；像画册的图注而不是 App 标签',
    caseStyle: '中文常规，英文小型大写',
    numberingStyle: '罗马数字，细笔画',
  },
  cardBack: {
    composition: '中心一轮下弦月，外围三圈极淡的同心晕；四折对称的细星点',
    symmetry: '四折对称',
    motifs: ['下弦月', '同心晕', '细星点', '流动的藤蔓弧线'],
  },
  forbidden: [
    '3D 渲染',
    '硬边矢量',
    '赛博朋克 / 数字霓虹',
    '粗黑描边',
    '任何写实照片质感',
    '骷髅、血、恐怖元素',
    /* Phase C1B-1 追加：这几条是"AI 出图默认长相"，不写死就会自己冒出来 */
    '硬边几何传送门 / 发光圆环',
    '通用 AI 奇幻角色海报（正面站姿 + 对称构图 + 大面积特效）',
    '科幻 / 太空题材',
  ],
}

/* ── 02 古典 ──────────────────────────────────────────────── */

const classical: DeckArtBible = {
  deckId: 'legacy-classic',
  identity: {
    name: '古典',
    visualThesis:
      '一副被翻了很多年的古籍插画牌 —— 手绘墨线、有限水彩、象牙纸，纸面带着旧书的黄。它的价值感来自"实体"，不来自"神秘"。',
    coreMood: ['沉稳', '可靠', '有年头', '手工'],
    emotionalKeywords: ['像从抽屉深处拿出来的', '想拿在手里翻', '值得收藏', '不炫技'],
  },
  medium: {
    primary: '手绘墨线 + 有限水彩淡彩',
    secondary: ['水粉点缀（面积极小）', '铜版画式排线阴影'],
    surfaceTexture: '暖象牙纸，纤维可见；墨线在纸上有轻微的吸收不匀',
    printCharacter: '老式印刷颗粒；套色略有偏移（0.3mm 以内），这是它"是印出来的"的证据',
  },
  palette: {
    /* 【不与森语共用绿与赭】古典的身份是墨 + 象牙 + 焦糖色的旧纸，
       绿色本来就不属于它；赭石让给森语，这里用墨棕承担深色。 */
    dominant: ['象牙', '焦橙', '墨棕', '灰蓝', '暗驼'],
    accent: ['棕黑墨色', '小面积暗酒红'],
    forbidden: ['纯 RGB 原色', '荧光', '紫色魔法辉光', '冷调蓝紫', '任何发光效果'],
    luminanceProfile: '暖中调。纸是亮的，墨是深的，中间调由水彩承担；整体对比中等偏高',
  },
  lineLanguage: {
    weight: '中等，允许轻微的线宽变化 —— 那是手的痕迹，不是缺陷',
    behavior: '闭合轮廓 + 排线（hatching）做体积；排线方向跟随形体',
    edgeCharacter: '刻印 —— 线是压进纸里的，边缘清楚但不锐利；允许极轻微的抖动',
  },
  composition: {
    subjectScale: '主体占画面高度约 60–75%，构图饱满',
    depth: '完整的前中远景。RWS 的叙事原则在这里最强：每张牌都是一个场景',
    symmetry: '轴对称与非对称并用，按牌义决定',
    negativeSpace: '留白 20–30%，主要在天空与地面',
    perspective: '传统单点或两点透视，规矩、可信',
  },
  lighting: {
    source: '室内单一暖光源（一盏灯 / 一扇窗）',
    direction: '左上斜射，45° 左右',
    contrast: '中高。有明确的受光面与背光面',
    behavior: '阴影用排线表现，不是灰色平涂；高光是留白，不是加白',
  },
  subjectLanguage: {
    humans: '传统插画比例，五官清晰可辨；服饰有具体的时代与材质（羊毛、亚麻、皮革）；手部要画对',
    animals: '写实但不照片化的动物：犬、马、鸟、蛇；有解剖依据',
    architecture: '石砌、木构、拱门、台阶、柱；有重量，有砌缝',
    nature: '有植物学依据的树与花；山、云、水都有明确的形',
    objects: '器物是可以拿起来的：杯有厚度、剑有刃、钱币有边缘磨损',
  },
  frame: {
    structure: '细装帧线双框，外框略粗、内框发丝；四角有小型植物装饰',
    ornament: '克制的植物纹样，只在四角与上下中点',
    titlePlacement: '底部矩形留白区内，居中，有细线分隔',
    numberPlacement: '顶部居中，罗马数字，压在框线之内',
  },
  typography: {
    personality: '古典书籍衬线，笔画有对比，端庄；像扉页而不是标签',
    caseStyle: '中文常规，英文全大写',
    numberingStyle: '罗马数字，与牌名同一字族',
  },
  cardBack: {
    composition: '象牙底，中心一个对称的暗金几何徽记，外围双线边框',
    symmetry: '二折 + 四折复合对称',
    motifs: ['暗金几何徽记', '双线边框', '四角植物纹', '细密排线底纹'],
  },
  forbidden: [
    '3D 渲染',
    'UI 图标风格',
    'SVG 般完美的线条',
    '现代照片质感',
    '发光 / 辉光效果',
    '把小阿卡纳画成"一个符号 + 背景"',
    /* Phase C1B-1 追加：复古最容易翻的两种车 */
    '做旧过度：脏斑、霉点、大面积污渍',
    '伪造的撕纸边 / 烧焦边 / 折痕贴图',
    '现代照片套复古滤镜的观感',
  ],
}

/* ── 03 森语 ──────────────────────────────────────────────── */

const forest: DeckArtBible = {
  deckId: 'legacy-forest',
  identity: {
    name: '森语',
    visualThesis:
      '植物学插画的精确 × 森林民间故事的温度。最重要的一条：**植物不是装饰，它本身就在讲牌义。**',
    coreMood: ['潮湿', '缓慢', '有生命', '循环'],
    emotionalKeywords: ['像蹲下来看地面', '闻得到土', '时间是慢的', '死亡不吓人'],
  },
  medium: {
    primary: '植物学水彩（干湿并用）',
    secondary: ['水粉提亮', '彩色铅笔细节', '极细墨线勾形'],
    surfaceTexture: '中粗纹水彩纸；颜料在纹理里沉淀出颗粒',
    printCharacter: '接近博物图鉴的印刷：颜色准确、细节清晰、无网点感',
  },
  palette: {
    /* 赭石归森语；古典那侧已让出。五套主色现在两两不重合。 */
    dominant: ['苔绿', '鼠尾草绿', '蕨绿', '树皮棕', '赭石'],
    accent: ['蘑菇米', '去饱和莓果红', '湿土褐'],
    forbidden: ['纯黑（用最深的墨绿代替）', '霓虹绿', '金属金', '冷调紫'],
    luminanceProfile: '中绿调。整体明度居中，暗部是深绿而不是黑；高光偏黄绿',
  },
  lineLanguage: {
    weight: '细到中等，随枝条的粗细自然变化',
    behavior: '有机曲线，绝不完全对称；叶脉、根系、菌褶都按真实生长逻辑画',
    edgeCharacter: '有机 —— 边缘有轻微的不规则抖动，像手绘的植物标本',
  },
  composition: {
    subjectScale: '主体占 50–70%；植物经常与人物同等重要，有时更重要',
    depth: '强纵深：近处的苔藓与菌、中景的人或动物、远处的林间光',
    symmetry: '非对称为主；植物的生长方向决定构图重心',
    negativeSpace: '留白 25–35%，主要是林间的空气与光',
    perspective: '低视角居多（贴近地面），偶尔仰视树冠',
  },
  lighting: {
    source: '穿过树冠的叶隙碎光',
    direction: '从上方偏侧射入，被打散成多个小光斑',
    contrast: '中等，但光斑与阴影的边界柔和',
    behavior: '光在潮湿空气里形成可见的光柱；被照到的叶片半透明',
  },
  subjectLanguage: {
    humans: '与森林有明确关系：在采集、在倾听、在被植物包围；衣物是天然材质，有磨损',
    animals: '鹿、狐、鸦、蛙、昆虫；按真实解剖画，不拟人化',
    architecture: '几乎没有；若有则是被自然收回的：塌了一半的石墙、长满苔的台阶',
    nature: '主角。树、根、苔、蕨、花、菌、水、土、枝 —— 每一样都要有物种依据',
    objects: '木、陶、编织物；器物边缘有使用痕迹',
  },
  frame: {
    structure: '不规则的细木纹边框，四角略有粗细差异',
    ornament: '真实植物的剪影：蕨叶、种荚、菌伞，按四角各不相同',
    titlePlacement: '底部居中，下方压一条极细的枝条',
    numberPlacement: '顶部居中，阿拉伯数字（这套不用罗马数字 —— 它是图鉴，不是典籍）',
  },
  typography: {
    personality: '轻衬线，接近植物图鉴的标注；字距略宽',
    caseStyle: '中文常规，英文首字母大写',
    numberingStyle: '阿拉伯数字，细笔画',
  },
  cardBack: {
    composition: '深绿底，中心一株对称生长的植物剖面（根 + 茎 + 叶 + 种）',
    symmetry: '左右镜像',
    motifs: ['植物剖面', '根系网络', '孢子点', '年轮纹'],
  },
  forbidden: [
    '把植物当边框装饰而不参与牌义',
    '纯图鉴（每张都只有植物、没有人物与动作）',
    '3D 渲染',
    '荧光色',
    '骷髅作为死亡的唯一表达',
    /* Phase C1B-1 追加 */
    '通用奇幻精灵形象（尖耳 / 铠甲 / 魔法特效）',
    '发光的魔法森林',
    '写实野生动物摄影质感',
  ],
}

/* ── 04 星图 ──────────────────────────────────────────────── */

const starmap: DeckArtBible = {
  deckId: 'legacy-celestial',
  identity: {
    name: '星图',
    visualThesis:
      '天体插画 × 宇宙叙事。人物与宇宙必须真正结合 —— 不是在人物背后贴几颗星，而是星座、轨道、行星与人共处同一个空间。',
    coreMood: ['浩大', '精确', '悬浮', '被注视'],
    emotionalKeywords: ['自己很小但不孤单', '像看古星图', '有秩序', '想凑近看细节'],
  },
  medium: {
    primary: '深色广告颜料（gouache）厚涂',
    secondary: ['墨线勾星座连线', '发光颜料点星', '极小面积金属色'],
    surfaceTexture: '深色卡纸；厚涂处有笔触厚度，星点是点上去的',
    printCharacter: '接近古天文图册的印刷：深底、细线、小字；金属色只在放大时反光',
  },
  palette: {
    dominant: ['午夜蓝', '深紫罗兰', '青', '洋红', '近黑'],
    accent: ['琥珀', '发光金（点状，面积 < 3%）'],
    forbidden: ['赛博霓虹', '科技 HUD 蓝', '渐变光晕滥用', '纯黑大面积平涂'],
    luminanceProfile: '深而饱和。五套里色彩最丰富，但饱和度服务于插画感而非 UI 感',
  },
  lineLanguage: {
    weight: '极细发丝线，星座连线更细',
    behavior: '几何精确的轨道与连线 + 自由的人物轮廓，两种线并存',
    edgeCharacter: '发丝 —— 线几乎不占面积，靠密度而不是粗细表达',
  },
  composition: {
    subjectScale: '人物占 40–60%，宇宙占据其余；人物不能压满画面',
    depth: '四层：前景的水面或地面、人物、中景的轨道与星座、深空',
    symmetry: '常用轴对称或径向对称 —— 那是星图的语言',
    negativeSpace: '留白 30–40%，全部是深空；空但不空洞，要有星尘密度变化',
    perspective: '广角，地平线压低；天空占大部分画面',
  },
  lighting: {
    source: '自发光天体（星、月、行星）—— 光源就在画面里',
    direction: '来自画面内的具体天体，方向可指认',
    contrast: '高。深底 + 亮点',
    behavior: '光在水面产生倒影；星光不做十字星芒，只做柔和晕散',
  },
  subjectLanguage: {
    humans: '沉静、常为坐姿或仰望；剪影感强；衣物垂坠，边缘融进深空',
    animals: '很少；若有则是夜行动物或神话星座对应的形象',
    architecture: '观星台、拱、石阵；结构简洁，作为人与天空之间的中介',
    nature: '水面（用于倒影）、低矮地平线、稀疏的树剪影',
    objects: '星盘、浑仪、罗盘、灯；器物有精密的刻度',
  },
  frame: {
    structure: '几何细线边框，四角有小型刻度标记 —— 像天文图表',
    ornament: '刻度与坐标线，不用植物纹样',
    titlePlacement: '底部居中，下方一条带刻度的细线',
    numberPlacement: '顶部居中，罗马数字，两侧各一个小星点',
  },
  typography: {
    personality: '细笔画衬线，字距开阔，接近古星图的标注',
    caseStyle: '中文常规，英文小型大写',
    numberingStyle: '罗马数字，极细',
  },
  cardBack: {
    composition: '深空底，中心一个同心轨道系统，外围星座连线',
    symmetry: '径向对称',
    motifs: ['同心轨道', '星座连线', '刻度环', '疏密变化的星尘'],
  },
  forbidden: [
    '黑底 + 金线 + 月亮 的廉价玄学模板',
    '赛博朋克 / 科技 HUD',
    '把星星当贴纸贴在人物背后',
    '十字星芒特效',
    '3D 渲染的行星',
    /* Phase C1B-1 追加：这套最容易滑向"太空壁纸" */
    '全息 UI / 科技界面元素',
    '通用太空壁纸（星云铺满 + 无主体）',
    '把人物和星空画成两个互不相干的图层',
  ],
}

/* ── 05 幽影 ──────────────────────────────────────────────── */

const shadow: DeckArtBible = {
  deckId: 'legacy-shadow',
  identity: {
    name: '幽影',
    visualThesis:
      '哥特插画 × 暗黑超现实。黑暗不等于骷髅和血 —— 它表现的是心理上的不安：说不通的空间、错误的透视、不该亮的地方亮着。',
    coreMood: ['不安', '克制', '戏剧性', '说不上哪里不对'],
    emotionalKeywords: ['先觉得漂亮', '再觉得不对劲', '不敢久看又想看', '像半夜想起的事'],
  },
  medium: {
    primary: '炭笔 + 深色墨',
    secondary: ['水粉提亮（面积极小）', '刮擦质感', '干笔扫过'],
    surfaceTexture: '做旧纸，有轻微斑渍；炭粉在纸纹里堆积',
    printCharacter: '高对比印刷，暗部堆到几乎无细节；纸的做旧感是画面的一部分',
  },
  palette: {
    dominant: ['近黑', '炭灰', '脏象牙'],
    accent: ['深林绿', '牛血红（面积 < 5%）', '冷灰蓝'],
    forbidden: ['鲜血红', '荧光', '紫色魔法辉光', '任何明快的颜色', '橙红火焰'],
    luminanceProfile: '五套里最暗。大面积暗部 + 极少数极亮的点；中间调被刻意压掉',
  },
  lineLanguage: {
    weight: '粗细跳变剧烈 —— 同一根线可以从很粗突然变细',
    behavior: '不完整的轮廓，靠明暗切出形；大量使用刮擦与干笔',
    edgeCharacter: '硬切 —— 明暗交界线锋利，没有过渡',
  },
  composition: {
    subjectScale: '主体占 35–60%，经常刻意偏小以放大空间的压迫',
    depth: '空间纵深被刻意拧过：远处的东西可能比近处大',
    symmetry: '接近对称但差一点 —— 那一点不对称就是不安的来源',
    negativeSpace: '留白 ≥ 45%，且是**暗的**留白；大片黑不是偷懒，是主体',
    perspective: '每张牌至少有一处明显的透视或尺度错误（门比人矮、影子方向不对、月亮位置不合理）',
  },
  lighting: {
    source: '来源不明。画面里找不到能解释这个光的东西',
    direction: '与阴影方向不完全一致 —— 这是刻意的',
    contrast: '极高。从近黑直接跳到近白',
    behavior: '光只照亮局部；被照亮的区域边界锋利；影子比物体长得多',
  },
  subjectLanguage: {
    humans: '比例轻微异常（略长的四肢或脖颈）；常为剪影或背对；面部经常在暗处',
    animals: '乌鸦、蛾、黑犬；只画出轮廓与眼睛',
    architecture: '门、走廊、楼梯 —— 尺寸不合理是常态；材质是石与铁',
    nature: '枯枝、雾、静止的水；植物是失去生机的那一种',
    objects: '镜、钟、钥匙、蜡烛；器物常有一处坏掉或缺失',
  },
  frame: {
    structure: '不完整的细框 —— 四条边中有一条会断掉或消失',
    ornament: '几乎没有；四角只有极小的刮擦痕',
    titlePlacement: '底部居中，压在暗部上，字是亮的',
    numberPlacement: '顶部居中，罗马数字，可以被暗部吃掉一半',
  },
  typography: {
    personality: '高对比衬线，笔画细，略显紧张；字距偏窄',
    caseStyle: '中文常规，英文全大写',
    numberingStyle: '罗马数字，细而高',
  },
  cardBack: {
    composition: '近黑底，中心一个空心的拱形轮廓，四周极暗的刮擦纹',
    symmetry: '左右接近对称但有一处刻意错开',
    motifs: ['空心拱', '刮擦纹', '断掉的边框线', '一处极亮的小点'],
  },
  forbidden: [
    '骷髅 / 血 / 内脏作为恐怖的主要手段',
    '廉价 Horror Poster 的审美',
    '跳吓（jump scare）式构图',
    '霓虹或魔法辉光',
    '把"暗"做成单纯的低亮度而没有心理内容',
    /* Phase C1B-1 追加：不安来自空间说不通，不是来自怪物 */
    '恶魔 / 怪物作为默认主体',
    '血腥内脏',
    '黑色矩形中央摆一个符号（那不是构图，是偷懒）',
    '紫色霓虹玄学模板',
  ],
}

/* ══════════════════════════════════════════════════════════════ */

export const DECK_ART_BIBLES: readonly DeckArtBible[] = [
  moonlight,
  classical,
  forest,
  starmap,
  shadow,
]

/** 本阶段的五套正式牌组 id。**唯一事实来源** */
export const CANONICAL_DECK_IDS: readonly DeckId[] = DECK_ART_BIBLES.map((b) => b.deckId)

const byId = new Map<string, DeckArtBible>(DECK_ART_BIBLES.map((b) => [b.deckId, b]))

export function getArtBible(deckId: DeckId): DeckArtBible | null {
  return byId.get(deckId) ?? null
}

export function isCanonicalDeck(deckId: DeckId): boolean {
  return byId.has(deckId)
}
