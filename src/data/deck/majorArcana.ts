/**
 * 大阿卡纳（Major Arcana）22 张牌义数据
 *
 * 内容原则（见 docs/05-content-spec.md）：
 * - 全部为理性分析型描述，用于「整理问题、提供观察角度」，不做命运预测。
 * - 每张牌的 art 只声明母题/色相/层级，实际画面由 CardArt 组件程序化生成。
 * - hue 统一控制在冷色域（200–300 深蓝紫）为主，少量 30–50 的冷金作为强调。
 */

import type { TarotCard } from '@/types/tarot'

export const majorArcana: TarotCard[] = [
  {
    id: 'major-00',
    name: 'The Fool',
    nameZh: '愚者',
    number: 0,
    arcana: 'major',
    keywordsUpright: ['起点', '未知', '轻装', '直觉'],
    keywordsReversed: ['冒进', '准备不足', '逃避', '摇摆'],
    meaningUpright:
      '愚者站在还没有路的地方，手上只有很少的行李。它描述的是一个尚未被定义的开始，条件不完备，但意愿是真实的。',
    meaningReversed:
      '逆位时，同样的轻装可能变成对细节的回避。此刻的「自由」有时是还没想清楚就先动了，也可能是明明想走却迟迟不肯迈步。',
    love: {
      upright: '关系可能正处在还没有形状的阶段，双方都在试探。保持坦率比急着定义更有帮助。',
      reversed: '可能存在只想要新鲜感、不愿承担后续的倾向，也可能是害怕认真而假装随意。',
    },
    career: {
      upright: '适合尝试没做过的方向，经验不足不是决定性的障碍，学习速度才是。',
      reversed: '计划里可能缺少最基本的落地步骤，热情跑在了准备前面。',
    },
    study: {
      upright: '入门阶段的好奇心很旺盛，可以允许自己先粗略走一遍全景再回头补细节。',
      reversed: '注意力容易被新目标带走，学过的东西还没形成结构就换了方向。',
    },
    finance: {
      upright: '资源不多但负担也轻，适合小额试错而不是重仓投入。',
      reversed: '可能低估了风险的具体形状，值得把「最坏情况」写下来看看。',
    },
    advice: {
      upright: '先走一步再评估，比在原地把所有变量算清楚更符合当前局面。',
      reversed: '可以把「我到底在怕什么」和「我到底想要什么」分开写，会清楚很多。',
    },
    symbols: ['悬崖边缘', '轻便的行囊', '未被踩出的路', '白色的犬'],
    art: { motif: 'threshold', hue: 210, tier: 'signature' },
  },
  {
    id: 'major-01',
    name: 'The Magician',
    nameZh: '魔术师',
    number: 1,
    arcana: 'major',
    keywordsUpright: ['行动力', '资源整合', '意图明确', '开始执行'],
    keywordsReversed: ['空转', '话多于做', '目的模糊', '操控'],
    meaningUpright:
      '桌上四种元素都已备齐，缺的不是工具而是把它们连起来的意图。这张牌指向「你已经拥有能开始的条件」。',
    meaningReversed:
      '逆位时，能力仍在，但方向散了。也可能是把技巧用在了说服别人而不是解决问题上。',
    love: {
      upright: '主动表达往往能推进局面，对方在等一个明确信号而不是暗示。',
      reversed: '言语和实际做法之间可能有落差，值得留意自己或对方的表述是否经过修饰。',
    },
    career: {
      upright: '手上的技能足以支撑一次正式的推进，可以把想法转成具体方案。',
      reversed: '忙碌感很强但产出模糊，可能需要重新确认这件事到底要达成什么。',
    },
    study: {
      upright: '方法比努力时长更关键，找到合适的工具会明显提速。',
      reversed: '收集了很多资料却迟迟没开始真正练习，输入盖过了输出。',
    },
    finance: {
      upright: '现有资源具备被重新组合的空间，收入结构可以主动设计。',
      reversed: '警惕包装漂亮但逻辑说不清的机会，尤其是需要你快速决定的那种。',
    },
    advice: {
      upright: '把「想做」压缩成本周可以完成的第一个动作，这张牌重视启动。',
      reversed: '停下来问一句：我做这件事，最终想换到什么？',
    },
    symbols: ['四元素法器', '无限符号', '高举的手杖', '桌面'],
    art: { motif: 'flame', hue: 275, tier: 'signature' },
  },
  {
    id: 'major-02',
    name: 'The High Priestess',
    nameZh: '女祭司',
    number: 2,
    arcana: 'major',
    keywordsUpright: ['直觉', '沉静', '未公开的信息', '等待'],
    keywordsReversed: ['忽视内在信号', '秘密受困', '过度理性', '疏离'],
    meaningUpright:
      '帷幕之后还有内容尚未展示。这张牌描述的是一个「信息未完全公开」的时刻，此时观察比表态更有价值。',
    meaningReversed:
      '逆位可能是把内心的提醒当作噪音压了下去，也可能是秘密本身已经开始造成负担。',
    love: {
      upright: '有些感受还没被说出口，双方都在读对方的沉默。给彼此一点解释的机会会更好。',
      reversed: '隐瞒或回避正在消耗信任，哪怕出发点是善意的。',
    },
    career: {
      upright: '还有关键信息没浮出水面，现在不是拍板的最好时机。',
      reversed: '可能被表面数据带偏，或者反过来完全不信任自己的判断。',
    },
    study: {
      upright: '安静独处的学习效率会明显高于讨论，适合深度阅读与消化。',
      reversed: '心里已经知道哪一块薄弱，却一直绕开它。',
    },
    finance: {
      upright: '账面之外还有变量，先把信息补齐再谈配置。',
      reversed: '对不透明的安排保持追问是合理的，不必因为怕尴尬而不问。',
    },
    advice: {
      upright: '先听，先记录，先不评价。答案可能在第三次回想时才出现。',
      reversed: '把模糊的不安写成具体的一句话，它通常没有想象中那么难面对。',
    },
    symbols: ['双柱之间的帷幕', '新月', '卷轴', '静水'],
    art: { motif: 'veil', hue: 250, tier: 'signature' },
  },
  {
    id: 'major-03',
    name: 'The Empress',
    nameZh: '女皇',
    number: 3,
    arcana: 'major',
    keywordsUpright: ['滋养', '丰盛', '创造', '接纳'],
    keywordsReversed: ['过度付出', '停滞', '依赖', '自我忽略'],
    meaningUpright:
      '这是一个允许事物慢慢长大的状态。不需要急着收割，重点在于持续提供条件。',
    meaningReversed:
      '逆位可能是把所有养分都给了外部，自己反而干枯；也可能是环境舒适到失去了推进的意愿。',
    love: {
      upright: '关系里存在真实的照顾与温度，适合把日常经营得更具体。',
      reversed: '付出与被看见之间可能不成比例，值得诚实地表达需求。',
    },
    career: {
      upright: '创意类与需要长期培育的工作会有进展，成果正在积累。',
      reversed: '长期处在舒适区，能力增长可能已经放缓。',
    },
    study: {
      upright: '适合用理解和联想去消化知识，而不是硬背。',
      reversed: '学习被生活琐事挤压，需要重新划出一块不被打扰的时间。',
    },
    finance: {
      upright: '收入有稳定来源，可以考虑把一部分投入到会增值的方向。',
      reversed: '为他人的开支可能超过了自己的承受范围。',
    },
    advice: {
      upright: '给正在做的事多一点时间，它还没到该被评价的阶段。',
      reversed: '先照顾好自己的状态，再谈能给出多少。',
    },
    symbols: ['麦田', '流水', '缀星的冠', '柔软的靠垫'],
    art: { motif: 'seed', hue: 292, tier: 'placeholder' },
  },
  {
    id: 'major-04',
    name: 'The Emperor',
    nameZh: '皇帝',
    number: 4,
    arcana: 'major',
    keywordsUpright: ['结构', '边界', '责任', '掌控'],
    keywordsReversed: ['僵化', '控制过度', '权威冲突', '失序'],
    meaningUpright:
      '这张牌强调秩序的价值：先立规则再谈自由。它适合出现在需要建立框架的局面里。',
    meaningReversed:
      '逆位时，结构可能变成了束缚，或者相反——本该有的框架一直没有建立起来。',
    love: {
      upright: '关系需要明确的承诺和边界，含糊会带来更多消耗。',
      reversed: '一方可能在关系里过度主导，另一方的意愿被压缩了。',
    },
    career: {
      upright: '适合承担管理与规划的角色，制度化能解决当前的混乱。',
      reversed: '与上级或规则的摩擦值得正视，硬碰硬未必是唯一选项。',
    },
    study: {
      upright: '制定计划表并严格执行，效果会优于凭感觉学习。',
      reversed: '计划定得太满反而无法执行，可以调低标准换取持续性。',
    },
    finance: {
      upright: '适合建立预算与长期规划，纪律比机会更重要。',
      reversed: '过度保守可能让资金长期闲置，也是一种成本。',
    },
    advice: {
      upright: '把模糊的期待写成可执行的规则，局面会稳下来。',
      reversed: '检查一下哪些规则是当初有用、现在已经过期的。',
    },
    symbols: ['石座', '权杖', '公羊纹饰', '远山'],
    art: { motif: 'gate', hue: 224, tier: 'placeholder' },
  },
  {
    id: 'major-05',
    name: 'The Hierophant',
    nameZh: '教皇',
    number: 5,
    arcana: 'major',
    keywordsUpright: ['传统', '指导', '共识', '学习体系'],
    keywordsReversed: ['教条', '形式主义', '质疑权威', '独走'],
    meaningUpright:
      '这张牌指向已被验证过的路径：前人的经验、既有的制度、可以请教的人。稳妥但需要耐心。',
    meaningReversed:
      '逆位可能是既有规则已经不适用，也可能是过早地否定了所有既定做法。',
    love: {
      upright: '关系可能进入需要被外部认可的阶段，例如见家长或公开身份。',
      reversed: '双方对关系应有的样子理解不同，值得直接谈而不是各自默认。',
    },
    career: {
      upright: '按流程走、找有经验的人请教，会比自己摸索省时间。',
      reversed: '现有流程可能已经拖慢了效率，但改动前需要准备好理由。',
    },
    study: {
      upright: '系统课程与正规教材比零散资料更适合当前阶段。',
      reversed: '照搬别人的方法未必适合自己，可以做一次针对性调整。',
    },
    finance: {
      upright: '选择成熟保守的方式，不必追求超额收益。',
      reversed: '对「大家都在做」的选择保持独立判断。',
    },
    advice: {
      upright: '找一个真正走过这条路的人聊一次，比看十篇经验帖有用。',
      reversed: '可以质疑规则，但先弄清它当初为什么被建立。',
    },
    symbols: ['三重冠', '交叉的钥匙', '石阶', '两名聆听者'],
    art: { motif: 'gate', hue: 262, tier: 'placeholder' },
  },
  {
    id: 'major-06',
    name: 'The Lovers',
    nameZh: '恋人',
    number: 6,
    arcana: 'major',
    keywordsUpright: ['选择', '联结', '价值观一致', '坦诚'],
    keywordsReversed: ['分歧', '逃避决定', '失衡', '被外力干扰'],
    meaningUpright:
      '恋人牌的核心并不只是感情，而是「在两个都有吸引力的选项之间，依据价值观做出选择」。',
    meaningReversed:
      '逆位时，选择被拖延，或者做选择的依据来自外部压力而不是自己真正在乎的东西。',
    love: {
      upright: '双方在重要的事情上看法接近，这是关系可以往下走的实质基础。',
      reversed: '吸引力还在，但对未来的想象可能并不一致，值得摊开来谈。',
    },
    career: {
      upright: '面临一个需要取舍的机会，判断标准应该是「哪个更接近我想成为的样子」。',
      reversed: '两边都不想放弃的结果，往往是两边都没做好。',
    },
    study: {
      upright: '与合适的伙伴一起学习会形成正向推力。',
      reversed: '在多个方向之间反复横跳，消耗掉了本可以积累的时间。',
    },
    finance: {
      upright: '涉及共同财务的安排适合现在讲清楚。',
      reversed: '因人情而做的财务决定，事后容易两边都不舒服。',
    },
    advice: {
      upright: '把两个选项各自的代价写出来，选择会比想象中清晰。',
      reversed: '不做选择本身也是一种选择，而且通常代价更高。',
    },
    symbols: ['两株树', '天使的注视', '山峰', '分岔'],
    art: { motif: 'mirror', hue: 300, tier: 'signature' },
  },
  {
    id: 'major-07',
    name: 'The Chariot',
    nameZh: '战车',
    number: 7,
    arcana: 'major',
    keywordsUpright: ['推进', '意志', '方向感', '克服阻力'],
    keywordsReversed: ['失控', '方向摇摆', '用力过猛', '内耗'],
    meaningUpright:
      '两股相反的力量被同一个人握在手里并往同一个方向拉动。这张牌讲的是驾驭，不是压制。',
    meaningReversed:
      '逆位时，两股力量各拉各的，速度还在但方向丢了；也可能是靠意志硬撑已经接近极限。',
    love: {
      upright: '主动推进关系会有效果，但要注意节奏是否两个人都跟得上。',
      reversed: '一方在推、一方在退，先停下来对齐比继续加速重要。',
    },
    career: {
      upright: '适合冲刺阶段的项目，专注单一目标能带来突破。',
      reversed: '同时开太多战线，结果是每条线都推不动。',
    },
    study: {
      upright: '短期高强度的推进是可行的，但要设定明确终点。',
      reversed: '硬扛式学习效率在下降，休息不是浪费时间。',
    },
    finance: {
      upright: '主动争取比被动等待更可能改善现状。',
      reversed: '情绪驱动的操作风险较高，值得先冷却再决定。',
    },
    advice: {
      upright: '锁定一个方向，其余的先放进待办里。',
      reversed: '检查一下：我在用力，还是我在较劲？',
    },
    symbols: ['两匹异色的兽', '星幕华盖', '城墙', '缰绳'],
    art: { motif: 'path', hue: 218, tier: 'placeholder' },
  },
  {
    id: 'major-08',
    name: 'Strength',
    nameZh: '力量',
    number: 8,
    arcana: 'major',
    keywordsUpright: ['温和的坚定', '耐心', '自我接纳', '持续'],
    keywordsReversed: ['自我怀疑', '压抑', '急躁', '消耗过度'],
    meaningUpright:
      '力量牌的方式不是压制而是安抚：先承认那股强烈的情绪存在，再慢慢让它愿意配合。',
    meaningReversed:
      '逆位时，可能是把情绪硬压下去导致反弹，也可能是对自己的能力评价过低。',
    love: {
      upright: '包容与耐心正在起作用，关系里的粗糙处在慢慢磨平。',
      reversed: '一直忍让并不等于处理，情绪需要有出口。',
    },
    career: {
      upright: '面对难缠的人或事，柔性沟通比强硬对抗更可能奏效。',
      reversed: '自我否定可能让你低估了自己实际的贡献。',
    },
    study: {
      upright: '难点需要反复回来看，进度慢不代表没有效果。',
      reversed: '和别人比进度带来的焦虑，正在抵消掉学习本身。',
    },
    finance: {
      upright: '克制冲动消费的能力正在建立，坚持下去会看到差别。',
      reversed: '用消费缓解压力的模式值得留意。',
    },
    advice: {
      upright: '对自己说话的方式，可以和对朋友说话的方式一样。',
      reversed: '先承认「我现在很累」，再谈下一步。',
    },
    symbols: ['狮与手', '无限符号', '花环', '沉静的目光'],
    art: { motif: 'flame', hue: 42, tier: 'placeholder' },
  },
  {
    id: 'major-09',
    name: 'The Hermit',
    nameZh: '隐士',
    number: 9,
    arcana: 'major',
    keywordsUpright: ['内省', '独处', '寻找方向', '沉淀'],
    keywordsReversed: ['孤立', '拖延面对', '拒绝求助', '迷失'],
    meaningUpright:
      '提灯照到的范围很小，但足够走下一步。这张牌肯定的是主动退出喧闹、把注意力收回来的选择。',
    meaningReversed:
      '逆位时，独处从「整理」变成了「躲藏」，也可能是明明需要别人的意见却不愿开口。',
    love: {
      upright: '需要一点距离来看清自己在这段关系里的位置，暂时的安静不是冷淡。',
      reversed: '过度封闭会让对方无从靠近，误会往往在沉默中长大。',
    },
    career: {
      upright: '适合独立完成需要深度思考的工作，暂时减少社交消耗。',
      reversed: '拒绝协作可能让你错过关键信息。',
    },
    study: {
      upright: '一个人啃硬骨头的阶段，安静环境会带来实质进展。',
      reversed: '卡住了却不愿提问，时间成本正在累积。',
    },
    finance: {
      upright: '适合安静复盘自己的收支结构，而不是寻找新机会。',
      reversed: '回避查看真实数字，问题不会因此变小。',
    },
    advice: {
      upright: '给自己一段不被打断的时间，只做一件事：想清楚我到底要什么。',
      reversed: '找一个你信任的人说一次，说出来的过程本身就有整理作用。',
    },
    symbols: ['提灯', '雪原', '长杖', '独行的背影'],
    art: { motif: 'path', hue: 232, tier: 'signature' },
  },
  {
    id: 'major-10',
    name: 'Wheel of Fortune',
    nameZh: '命运之轮',
    number: 10,
    arcana: 'major',
    keywordsUpright: ['转折', '周期', '外部变化', '时机'],
    keywordsReversed: ['卡住', '重复旧模式', '时机未到', '抗拒变化'],
    meaningUpright:
      '有些变化的开关不在你手上。这张牌提醒的是：识别自己正处在周期的哪一段，比预测下一步更实际。',
    meaningReversed:
      '逆位时，同样的情境反复出现，可能是模式本身还没被看见，也可能只是需要再等一段。',
    love: {
      upright: '关系可能因为外部环境（工作、地点、家庭）出现转向。',
      reversed: '相似的争执反复上演，值得看看触发点是不是同一个。',
    },
    career: {
      upright: '行业或组织层面的变动会带来新的位置，保持灵活。',
      reversed: '当前的停滞更可能是周期性的，不必全部归因于自己。',
    },
    study: {
      upright: '状态起伏是正常的，用长周期而非单日表现来评估自己。',
      reversed: '方法一直没换，结果自然一直一样。',
    },
    finance: {
      upright: '收入可能出现波动，留出缓冲比预测走势更有效。',
      reversed: '追逐时机的成本可能高于收益本身。',
    },
    advice: {
      upright: '把注意力放在自己能控制的那一部分，其余交给时间。',
      reversed: '记录一下最近三次相似情况的经过，模式通常会自己浮现。',
    },
    symbols: ['转动的轮', '四方守望者', '云端', '不断变化的刻度'],
    art: { motif: 'orbit', hue: 268, tier: 'placeholder' },
  },
  {
    id: 'major-11',
    name: 'Justice',
    nameZh: '正义',
    number: 11,
    arcana: 'major',
    keywordsUpright: ['权衡', '因果', '公正', '负责'],
    keywordsReversed: ['偏颇', '逃避责任', '不平衡', '拖延裁断'],
    meaningUpright:
      '这张牌把注意力拉回到「我做了什么，因此得到了什么」。它偏冷静，也偏诚实。',
    meaningReversed:
      '逆位时，评判标准可能对自己和对别人并不一致；也可能是明知该承担却一直推给环境。',
    love: {
      upright: '关系里的付出与回报需要被摆到台面上算一次。',
      reversed: '一方长期承担更多，这种失衡不会自动修复。',
    },
    career: {
      upright: '涉及合约、评估、责任划分的事宜适合现在处理清楚。',
      reversed: '模糊的分工可能已经埋下问题，值得书面确认。',
    },
    study: {
      upright: '成绩基本反映了投入，可以据此调整分配。',
      reversed: '把结果全部归因于运气或不公，会让改进无从下手。',
    },
    finance: {
      upright: '适合做一次完整的账目清理与责任梳理。',
      reversed: '不清晰的金钱往来最好尽早说明。',
    },
    advice: {
      upright: '用同一把尺子量自己和别人。',
      reversed: '先分清哪部分确实不是你的责任，再谈剩下的那部分。',
    },
    symbols: ['天平', '直立的剑', '双柱', '垂帘'],
    art: { motif: 'mirror', hue: 206, tier: 'placeholder' },
  },
  {
    id: 'major-12',
    name: 'The Hanged Man',
    nameZh: '倒吊人',
    number: 12,
    arcana: 'major',
    keywordsUpright: ['换角度', '暂停', '主动等待', '放下执着'],
    keywordsReversed: ['无谓牺牲', '拖延', '被动僵持', '钻牛角尖'],
    meaningUpright:
      '悬停不是失败，而是一种主动选择的姿势。视角一旦倒过来，原本无解的问题可能换了形状。',
    meaningReversed:
      '逆位时，等待失去了目的，变成单纯的耗着；或者付出被当成理所当然。',
    love: {
      upright: '试着从对方的处境重新理解一次这件事，也许结论会不同。',
      reversed: '一味退让并没有换来改变，值得重新评估这段关系的成本。',
    },
    career: {
      upright: '当前推不动是正常的，用这段时间换一种思路。',
      reversed: '在一个已经没有回报的项目上持续投入，是沉没成本在做决定。',
    },
    study: {
      upright: '换一本教材、换一种讲法，卡住的地方可能就通了。',
      reversed: '死磕同一个方法太久了，效率已经很低。',
    },
    finance: {
      upright: '暂时不动是合理的策略，观察期本身有价值。',
      reversed: '被套住的部分需要一个明确的止损标准。',
    },
    advice: {
      upright: '把问题倒过来问一次：如果这不是问题，而是提醒呢？',
      reversed: '给等待设一个期限，到期就重新评估。',
    },
    symbols: ['倒悬的姿态', '发光的头部', '树枝', '静止的水面'],
    art: { motif: 'veil', hue: 244, tier: 'placeholder' },
  },
  {
    id: 'major-13',
    name: 'Death',
    nameZh: '死神',
    number: 13,
    arcana: 'major',
    keywordsUpright: ['结束', '转化', '清理', '让位'],
    keywordsReversed: ['拖住不放', '过渡期延长', '抗拒改变', '反复'],
    meaningUpright:
      '这张牌几乎不指向字面意义的死亡，它描述的是一个阶段确实结束了。空出来的位置，是新东西能进来的前提。',
    meaningReversed:
      '逆位时，明知已经结束却还维持着形式，过渡期被人为拉长，双方都在消耗。',
    love: {
      upright: '关系正在发生性质上的转变，旧的相处方式可能已经不适用了。',
      reversed: '在一段已经走完的关系里反复回头，会让新的可能一直进不来。',
    },
    career: {
      upright: '结束一个项目、一段合作或一个角色，是为了腾出精力。',
      reversed: '迟迟不做决定，成本会继续累积。',
    },
    study: {
      upright: '放弃不适合的方向不是失败，是把时间还给自己。',
      reversed: '因为「已经学了这么久」而不愿转向，是投入在替你思考。',
    },
    finance: {
      upright: '适合清理长期无效的支出与资产。',
      reversed: '不愿承认亏损，往往会让亏损变得更大。',
    },
    advice: {
      upright: '列出「已经结束但我还没承认」的事，承认本身就是进展。',
      reversed: '给告别一个具体的动作，比如删掉、退订、说清楚。',
    },
    symbols: ['黑色旗帜', '白玫瑰', '地平线上的双塔', '缓慢的行进'],
    art: { motif: 'threshold', hue: 256, tier: 'signature' },
  },
  {
    id: 'major-14',
    name: 'Temperance',
    nameZh: '节制',
    number: 14,
    arcana: 'major',
    keywordsUpright: ['平衡', '调和', '节奏', '整合'],
    keywordsReversed: ['失衡', '极端', '不耐', '勉强融合'],
    meaningUpright:
      '两只杯子之间的水在缓慢流动，比例是慢慢试出来的。这张牌讲的是配比与耐心，而不是取舍。',
    meaningReversed:
      '逆位时，节奏被打乱：要么全力冲刺要么完全停摆，中间地带消失了。',
    love: {
      upright: '两个人的节奏正在互相适应，不需要一次性对齐所有事。',
      reversed: '一方过度投入、一方明显后撤，先谈节奏而不是对错。',
    },
    career: {
      upright: '不同角色或不同方法可以共存，找到搭配比选边更有效。',
      reversed: '工作与生活的比例已经明显偏斜，需要主动调整。',
    },
    study: {
      upright: '规律而适度的节奏，长期效果好过突击。',
      reversed: '临时抱佛脚与长期空转在交替出现。',
    },
    finance: {
      upright: '收支比例可以细调，不必大改。',
      reversed: '过度节省与冲动消费交替，本质是同一个问题。',
    },
    advice: {
      upright: '找出那个可以长期维持的强度，而不是最高强度。',
      reversed: '把「全部或没有」的选项，改写成「先做百分之三十」。',
    },
    symbols: ['交换的双杯', '一足踏水', '前方的小径', '天边的光'],
    art: { motif: 'tide', hue: 200, tier: 'placeholder' },
  },
  {
    id: 'major-15',
    name: 'The Devil',
    nameZh: '恶魔',
    number: 15,
    arcana: 'major',
    keywordsUpright: ['执着', '惯性', '欲望', '受限的自觉'],
    keywordsReversed: ['松动', '开始看清', '挣脱', '仍在反复'],
    meaningUpright:
      '锁链其实是松的。这张牌指向那些自己知道不太好、却一再回去的模式——它的力量来自熟悉感，而不是来自它本身有多牢固。',
    meaningReversed:
      '逆位通常是好转的方向：开始意识到自己被什么绑住了，尽管还没完全走出来。',
    love: {
      upright: '关系里可能存在强烈但消耗的吸引，值得分清是喜欢还是习惯。',
      reversed: '正在从一段不健康的相处里往外走，反复是过程的一部分。',
    },
    career: {
      upright: '因为待遇或安全感而留在一个明知不合适的位置上。',
      reversed: '已经开始为离开做准备，可以把步骤具体化。',
    },
    study: {
      upright: '拖延已经形成回路，先处理触发点而不是责怪意志力。',
      reversed: '已经找到一点方法，需要的是把它固定下来。',
    },
    finance: {
      upright: '警惕以「犒劳自己」为名的重复性支出。',
      reversed: '正在建立新的消费习惯，记录会帮上忙。',
    },
    advice: {
      upright: '先不急着戒掉，先如实记录它出现的时间和情境。',
      reversed: '把已经做到的部分写下来，它比你以为的多。',
    },
    symbols: ['松开的锁链', '倒悬的火把', '基座', '低垂的角'],
    art: { motif: 'veil', hue: 286, tier: 'placeholder' },
  },
  {
    id: 'major-16',
    name: 'The Tower',
    nameZh: '高塔',
    number: 16,
    arcana: 'major',
    keywordsUpright: ['突发', '结构瓦解', '真相显露', '重建前夜'],
    keywordsReversed: ['勉强维持', '延后的崩塌', '内部震动', '缓慢瓦解'],
    meaningUpright:
      '塌下来的通常是建在错误地基上的部分。冲击是真实的，但它同时也移除了一个本来就不稳的结构。',
    meaningReversed:
      '逆位时，动摇发生在内部而没有外显，或者是靠额外的力气在维持一个已经开裂的框架。',
    love: {
      upright: '某个一直被绕开的问题可能会被摊开，短期难受但方向会清楚。',
      reversed: '关系表面平静，实际的裂缝还在，回避只是延后。',
    },
    career: {
      upright: '计划可能被外部变化打断，应急预案比坚持原案更重要。',
      reversed: '问题已经出现苗头，早处理成本远低于晚处理。',
    },
    study: {
      upright: '一次挫败可能暴露了基础的漏洞，这是修补的机会。',
      reversed: '知道哪里没学会却一直不去补，风险在积累。',
    },
    finance: {
      upright: '意外支出的可能性存在，现金缓冲很关键。',
      reversed: '靠拆东墙补西墙维持的结构，需要尽快正视。',
    },
    advice: {
      upright: '先确保基本盘不受影响，重建的事可以稍后再谈。',
      reversed: '主动拆掉一小块，好过等它整体塌下来。',
    },
    symbols: ['断裂的塔顶', '闪电', '坠落的冠', '暗色的天'],
    art: { motif: 'flame', hue: 36, tier: 'placeholder' },
  },
  {
    id: 'major-17',
    name: 'The Star',
    nameZh: '星星',
    number: 17,
    arcana: 'major',
    keywordsUpright: ['希望', '恢复', '清澈', '长期方向'],
    keywordsReversed: ['信心不足', '方向感模糊', '疲惫', '自我怀疑'],
    meaningUpright:
      '在动荡之后出现的安静时刻。它不承诺速度，但确认了方向是存在的，而且值得往那边走。',
    meaningReversed:
      '逆位时，方向还在，只是看不清了。多数时候需要的是休息与补给，而不是更用力。',
    love: {
      upright: '关系正在从紧绷中缓过来，坦诚会带来修复。',
      reversed: '对关系的期待被现实磨损了一些，可以重新校准而不是放弃。',
    },
    career: {
      upright: '长期目标开始有轮廓，适合规划下一阶段。',
      reversed: '对能力的怀疑更多来自疲劳，而不是事实。',
    },
    study: {
      upright: '进入了良性节奏，学习本身开始带来满足感。',
      reversed: '目标定得太远，可以拆成能看见的小段。',
    },
    finance: {
      upright: '财务状况在缓慢改善，坚持既定计划即可。',
      reversed: '短期内看不到成效，容易放弃长期方案。',
    },
    advice: {
      upright: '把想去的地方写下来，哪怕现在还很远。',
      reversed: '先补觉、先吃饭、先减负，判断力会自己回来。',
    },
    symbols: ['八角星', '倾注的双瓶', '静湖', '夜色中的鸟'],
    art: { motif: 'star', hue: 212, tier: 'signature' },
  },
  {
    id: 'major-18',
    name: 'The Moon',
    nameZh: '月亮',
    number: 18,
    arcana: 'major',
    keywordsUpright: ['不确定', '潜意识', '错觉', '摸索前行'],
    keywordsReversed: ['迷雾散去', '真相浮现', '焦虑释放', '仍在混沌'],
    meaningUpright:
      '月光会让熟悉的东西变形。这张牌描述的是信息不全、情绪介入判断的状态——不代表危险，但确实需要慢一点。',
    meaningReversed:
      '逆位常表示雾正在散开，或者相反：明明已经看到线索却仍旧不愿承认。',
    love: {
      upright: '猜测多于确认，很多不安可能来自想象而非事实。',
      reversed: '误会正在澄清，或者某些真实感受终于被说出口。',
    },
    career: {
      upright: '关键信息仍不透明，重大决定值得推迟。',
      reversed: '之前看不懂的局面开始清晰，可以重新评估。',
    },
    study: {
      upright: '概念还很模糊，此时的困惑是学习过程的正常部分。',
      reversed: '之前的疑点逐渐串起来，适合做一次总结。',
    },
    finance: {
      upright: '不清楚的条款与承诺需要问到底。',
      reversed: '风险的实际形状开始清楚，可以据此调整。',
    },
    advice: {
      upright: '把「我知道的」和「我猜的」分成两栏写出来。',
      reversed: '相信已经浮现的证据，而不是最初的假设。',
    },
    symbols: ['半掩的月', '两座塔', '水中的路', '仰首的犬与狼'],
    art: { motif: 'moon', hue: 248, tier: 'signature' },
  },
  {
    id: 'major-19',
    name: 'The Sun',
    nameZh: '太阳',
    number: 19,
    arcana: 'major',
    keywordsUpright: ['清晰', '活力', '被看见', '简单的快乐'],
    keywordsReversed: ['暂时黯淡', '过度乐观', '用力表现', '延迟'],
    meaningUpright:
      '光把所有细节都照出来了，包括好的和不好的。这张牌的价值在于「看得清」，而不只是「运气好」。',
    meaningReversed:
      '逆位时，热度还在但被遮了一层：可能是成果延后，也可能是用高兴掩盖了尚未处理的问题。',
    love: {
      upright: '关系里的坦率带来轻松感，这种状态值得被珍惜和维持。',
      reversed: '努力维持气氛的同时，有些话可能一直没说。',
    },
    career: {
      upright: '成果容易被看见，适合展示与表达。',
      reversed: '进展比预期慢，但方向本身没有问题。',
    },
    study: {
      upright: '理解通畅，适合挑战更难的内容。',
      reversed: '自我感觉良好与实际掌握之间可能有差距，测一次会更踏实。',
    },
    finance: {
      upright: '收入面向好，但仍建议把一部分转为长期储备。',
      reversed: '过度乐观的预期值得打个折再做计划。',
    },
    advice: {
      upright: '把今天觉得不错的事记下来，它会在低谷时有用。',
      reversed: '允许自己状态一般，不必每天都是高光。',
    },
    symbols: ['正面的日轮', '向日葵', '白马', '围墙内的花园'],
    art: { motif: 'sun', hue: 46, tier: 'signature' },
  },
  {
    id: 'major-20',
    name: 'Judgement',
    nameZh: '审判',
    number: 20,
    arcana: 'major',
    keywordsUpright: ['回顾', '觉醒', '重新评估', '召唤'],
    keywordsReversed: ['自责', '拒绝面对', '错过时机', '悬而未决'],
    meaningUpright:
      '过去的经历被重新拿出来看了一遍，并且给出了一个结论。这张牌指向清算之后的释然。',
    meaningReversed:
      '逆位时，回顾变成了反复自责；或者一个明确的召唤出现了，但迟迟没有回应。',
    love: {
      upright: '适合把关系里的旧账做一次彻底的说明与和解。',
      reversed: '一直在心里给对方定罪，却没有真正沟通过。',
    },
    career: {
      upright: '过去的积累开始产生回报，也适合做一次职业方向的复盘。',
      reversed: '机会出现时的犹豫，可能来自对自己旧失败的记忆。',
    },
    study: {
      upright: '系统复盘会带来明显跃升，比继续往前赶更有效。',
      reversed: '把过去的成绩当成对自己的定论，会限制现在的判断。',
    },
    finance: {
      upright: '适合全面检视过去一年的财务决策并总结规律。',
      reversed: '为过去的错误决定持续付情绪成本，无助于当前。',
    },
    advice: {
      upright: '写一份诚实的复盘，只写事实与选择，不写评价。',
      reversed: '把「我当时很糟糕」改写成「我当时只有那些信息」。',
    },
    symbols: ['号角', '升起的人群', '远山', '灰白的浪'],
    art: { motif: 'orbit', hue: 238, tier: 'placeholder' },
  },
  {
    id: 'major-21',
    name: 'The World',
    nameZh: '世界',
    number: 21,
    arcana: 'major',
    keywordsUpright: ['完成', '整合', '阶段收束', '新的循环'],
    keywordsReversed: ['差最后一步', '未收尾', '形式完成', '拖长的结尾'],
    meaningUpright:
      '一个循环走完了，各个部分终于对齐。它不是终点，而是可以带着完整的经验进入下一段。',
    meaningReversed:
      '逆位时，事情基本做完但缺一个收尾动作；或者形式上结束了，心理上还没有。',
    love: {
      upright: '关系进入一个稳定完整的阶段，适合共同规划更长的时间。',
      reversed: '还差一次坦白或一个明确的承诺，局面才能真的落定。',
    },
    career: {
      upright: '阶段性目标达成，可以开始考虑下一个层级的问题。',
      reversed: '项目卡在最后百分之十，收尾往往需要单独安排时间。',
    },
    study: {
      upright: '知识形成了体系，可以尝试输出与教别人。',
      reversed: '学完了但没整理，等于只完成了一半。',
    },
    finance: {
      upright: '财务结构比较完整，可以考虑长期配置。',
      reversed: '有一笔尚未了结的事项，处理掉会轻松很多。',
    },
    advice: {
      upright: '为这个阶段做一次正式的结束，仪式感有实际作用。',
      reversed: '列出「还差什么才算完」，通常只有两三项。',
    },
    symbols: ['环形花冠', '四方守望者', '飘带', '舞动的身姿'],
    art: { motif: 'orbit', hue: 282, tier: 'signature' },
  },
]
