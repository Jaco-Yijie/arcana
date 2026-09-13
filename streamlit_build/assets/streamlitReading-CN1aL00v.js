import{_ as e,m as t,t as n}from"./localized-DSCZb9sp.js";import{R as r,a as i,z as a}from"./index-BLcVx-iR.js";import{t as o}from"./en-US-ofYvSrcW.js";import{t as s}from"./streamlitTransport-DLp2jOI5.js";import{t as c}from"./mockProvider-BhSt64F9.js";var l={wands:`fire`,cups:`water`,swords:`air`,pentacles:`earth`},u=[{category:`relationship`,patterns:[/(感情|爱情|恋爱|喜欢|暗恋|暧昧|对象|伴侣|男友|女友|老公|老婆|前任|复合|分手|表白|相亲|婚姻|吵架)/u,/(关系|相处|联系|沟通|冷战|距离感)/u,/(他|她)(会|是不是|对我|喜不喜欢)/u,/\b(relationship|love|dating|partner|ex)\b/iu]},{category:`career`,patterns:[/(工作|事业|职业|职场|公司|老板|同事|上司|跳槽|换岗|离职|面试|升职|加薪|项目|创业|副业|实习|offer|岗位)/u,/\b(career|job|work|boss|startup|promotion|internship)\b/iu]},{category:`study`,patterns:[/(学业|学习|考试|考研|升学|论文|课程|成绩|读书|毕业|留学|专业|保研|申请)/u,/\b(study|exam|thesis|school|university|major)\b/iu]},{category:`finance`,patterns:[/(钱|财务|收入|存款|理财|投资|负债|花销|预算|房贷|工资|这笔)/u,/\b(money|finance|invest|budget|salary|debt)\b/iu]},{category:`self`,patterns:[/(我自己|自我|状态|情绪|焦虑|迷茫|方向|成长|意义|内心|心态|人生|重新认识)/u,/\b(myself|anxiety|purpose|growth|direction)\b/iu]}],d=[/(还是|要不要|该不该|应不应该|值不值得|选哪|二选一|两个选择|去留)/u,/\bor\b/iu],f={free:`general`,today:`general`,"recent-state":`self`,"watch-out":`general`,advice:`general`};function p(e,t,n){if(t===`random`)return n?f[n]:`general`;let r=e.trim();if(r.length===0)return`general`;for(let e of u)if(e.patterns.some(e=>e.test(r)))return e.category;return d.some(e=>e.test(r))?`decision`:`general`}var m={relationship:`love`,career:`career`,study:`study`,finance:`finance`,decision:`advice`,self:`personalGrowth`,general:null},h={love:`感情关系`,career:`工作事业`,study:`学业`,finance:`财务`,personalGrowth:`自我成长`,advice:`行动建议`},g={love:`Love and relationships`,career:`Work and career`,study:`Study`,finance:`Money`,personalGrowth:`Personal growth`,advice:`What to do`};function ee(e,t){let n=m[t];if(!n)return null;let r=e[n];return!r||!r.upright?.trim()||!r.reversed?.trim()?null:{domain:n,label:h[n],upright:r.upright,reversed:r.reversed}}var _={zh:e,en:o},v={zh:`zh-CN`,en:`en-US`};function y(e,t){let n=_[e]??_.zh;for(let e of t.split(`.`)){if(typeof n!=`object`||!n)return t;n=n[e]}return typeof n==`string`?n:t}function te(e,t){return y(e,`spread.name.${t}`)}function ne(e,t){return y(e,`spread.description.${t}`)}function b(e,t,n){return y(e,`spread.position.${t}.${n}.label`)}function x(e,t,n){return y(e,`spread.position.${t}.${n}.meaning`)}function re(e){return typeof e==`string`&&e.trim().toLowerCase().startsWith(`en`)?`en`:`zh`}var S=class extends Error{};function ie(e,t){return e?t===`zh`?e:{...e,label:g[e.domain]??e.label}:null}function ae(e){let t={},n={},r=new Map,i=0,a=0;for(let o of e)o.arcana===`major`&&(i+=1),o.orientation===`reversed`&&(a+=1),o.suit&&(t[o.suit]=(t[o.suit]??0)+1),n[o.element]=(n[o.element]??0)+1,r.set(o.number,(r.get(o.number)??0)+1);return{total:e.length,majorCount:i,minorCount:e.length-i,uprightCount:e.length-a,reversedCount:a,suitCounts:t,elementCounts:n,repeatedNumbers:[...r.entries()].filter(([,e])=>e>=2).map(([e])=>e).sort((e,t)=>e-t)}}function oe(e){let t=r[e.spreadId];if(!t)throw new S(`未知牌阵：${e.spreadId}`);if(!Array.isArray(e.cards)||e.cards.length===0)throw new S(`没有可解读的牌`);if(e.cards.length!==t.cardCount)throw new S(`牌数与牌阵不符：牌阵需要 ${t.cardCount} 张，收到 ${e.cards.length} 张`);let o=new Set,s=new Set,c=re(e.language),u=v[c],d=typeof e.question==`string`?e.question.trim():``,f=e.mode===`random`?`random`:`question`,m=p(d,f,e.theme??null),h=t.positions.map((r,i)=>{let d=e.cards.find(e=>e.positionId===r.id);if(!d)throw new S(`牌位缺失：${r.id}`);if(o.has(r.id))throw new S(`牌位重复：${r.id}`);if(o.add(r.id),d.orientation!==`upright`&&d.orientation!==`reversed`)throw new S(`非法正逆位：${String(d.orientation)}`);let f=a[d.cardId];if(!f)throw new S(`未知卡牌：${d.cardId}`);if(s.has(f.id))throw new S(`同一张牌出现了两次：${f.id}`);s.add(f.id);let p=n(f,u);return{cardId:f.id,cardName:f.name,cardNameZh:f.nameZh,displayName:p.name,arcana:f.arcana,suit:f.suit??null,number:f.number,element:f.element??(f.suit?l[f.suit]:`spirit`),orientation:d.orientation,position:{id:r.id,name:b(c,t.id,r.id),meaning:x(c,t.id,r.id),index:i,positionId:r.id,positionName:b(c,t.id,r.id),positionMeaning:x(c,t.id,r.id)},baseMeaning:{upright:p.meaningUpright,reversed:p.meaningReversed},domainMeaning:ie(ee({...f,...p},m),c),keywords:{upright:[...p.keywordsUpright],reversed:[...p.keywordsReversed]},symbols:[...p.symbols]}}),g=d,_=f,y=i(g,c);return{sessionId:String(e.sessionId??``),language:c,question:g,questionCategory:m,mode:_,theme:e.theme??null,spread:{spreadId:t.id,spreadName:te(c,t.id),description:ne(c,t.id),cardCount:t.cardCount},cards:h,stats:ae(h),readingMode:e.readingMode===`deep`?`deep`:`standard`,deckId:typeof e.deckId==`string`?e.deckId.slice(0,32):null,safetyNotice:y.notice}}var se={upright:`正位`,reversed:`逆位`},ce={upright:`upright`,reversed:`reversed`},C=e=>e===`en`?P:N,le={major:`大阿卡纳`,minor:`小阿卡纳`},ue={major:`Major Arcana`,minor:`Minor Arcana`},de={wands:`权杖（火 · 行动与动力）`,cups:`圣杯（水 · 情感与关系）`,swords:`宝剑（风 · 思考与沟通）`,pentacles:`星币（土 · 现实与资源）`},w={wands:`Wands (Fire · action and drive)`,cups:`Cups (Water · feeling and relationship)`,swords:`Swords (Air · thought and speech)`,pentacles:`Pentacles (Earth · the concrete and the material)`},T={fire:`火`,water:`水`,air:`风`,earth:`土`,spirit:`大阿卡纳（不参与四元素统计）`},E={fire:`Fire`,water:`Water`,air:`Air`,earth:`Earth`,spirit:`Major Arcana (not counted in the four elements)`},D={relationship:`感情与人际关系`,career:`工作与事业`,study:`学习与考试`,finance:`金钱与财务`,decision:`一个具体的抉择`,self:`自我状态与内在整理`,general:`综合 / 没有明确归类`},O={relationship:`love and relationships`,career:`work and career`,study:`study and exams`,finance:`money and finances`,decision:`one specific decision`,self:`inner state and self-understanding`,general:`general / no clear category`},k={free:`直接随缘（没有指定问题，只想要一个观察此刻的角度）`,today:`今日提醒（今天有什么值得提前留意）`,"recent-state":`最近状态（最近整体的状态，以及自己没注意到的部分）`,"watch-out":`我需要注意什么（当前阶段容易忽略但值得多看一眼的）`,advice:`给我一个建议（一个可以马上试试看的方向）`},A={free:`Just draw one (no question given — only an angle on this moment)`,today:`A note for today (what is worth keeping in mind through the day)`,"recent-state":`Lately (how things have been overall, including what they have not noticed)`,"watch-out":`What should I watch (easy to overlook at this stage, worth a second look)`,advice:`Give me one suggestion (one direction they could try straight away)`},j={standard:`标准解读`,deep:`深度解读`},M={standard:`standard reading`,deep:`deep reading`},N={orientation:se,arcana:le,suit:de,element:T,category:D,theme:k,mode:j,noSuit:`无（大阿卡纳没有花色）`,noMinor:`本次没有小阿卡纳`,none:`无`,unspecified:`未指定`,noQuestion:`（用户最终没有填写问题）`,noRepeat:`无重复数字`,join:`、`},P={orientation:ce,arcana:ue,suit:w,element:E,category:O,theme:A,mode:M,noSuit:`none (Major Arcana have no suit)`,noMinor:`no Minor Arcana in this spread`,none:`none`,unspecified:`unspecified`,noQuestion:`(the querent left the question blank)`,noRepeat:`no repeated numbers`,join:`, `},F={zh:`你必须使用**简体中文**输出。`,en:`**OUTPUT LANGUAGE: ENGLISH.** The instructions below are written in Chinese for internal reasons; that does not change the output language. Every string in your JSON output — readingTheme, overallEnergy, every interpretation, connectionToQuestion, narrative, answerToQuestion, reflectionQuestions, relationships, alternativeInterpretations — must be written in natural, idiomatic English. Do not output a single Chinese character. Card names, position names and orientations are supplied in English below: use those exact spellings, and do not translate or invent alternatives.`},I={single:`单张牌阵。只有一格，不存在牌与牌之间的关系，因此 relationships 为空数组 []。可展开的是这一张牌的不同侧面：牌义、牌位、朝向、象征意象，以及它与用户问题的接口。`,"past-present-future":`时间轴结构：过去 → 现在 → 未来，三格严格按时间顺序排列。注意「未来」这一格是当前状态的延长线，不是已经写好的结局 —— 它描述的是「照这样下去会怎样」。`,"situation-obstacle-advice":`推理链结构（不是时间顺序）：现状 → 阻碍 → 建议。张力集中在「阻碍」这一格，「建议」这一格读作可以考虑的调整方向，而不是指令。`,"two-choices":`分支结构：「现状」是两条路共同的起点；A 分支为 A 方向发展 → A 结果，B 分支为 B 方向发展 → B 结果。你可以明确指出两边的代价与阻力并不对称（例如某一边的阻力在牌面上更明显），但最终的选择权留在用户手里 —— 说清差别，不替他勾选。`,relationship:`关系结构：「你」与「对方」是并置的两端，「你们之间」是这两端的交汇，「阻碍」压在关系上方，「走向」是当前相处方式的延长线。注意「对方」这一格呈现的是牌面给出的角度，不是对方真实的内心。`},L=`牌位按给定顺序排列，前后之间存在推进关系；顺序本身就是信息。`,R=`{
  "readingTheme": "卡住的不是选择本身，而是一直没被核实的前提",
  "overallEnergy": "三张里有两张逆位，且落在首尾两端，正位反而在中间。整体基调偏内收：推进的力气大多花在了看不见的地方。就当前牌面看，阻力明显多于支持因素，这不是一副适合加力硬推的牌。",
  "cards": [
    {
      "cardId": "major-09",
      "cardName": "隐士",
      "position": "过去",
      "orientation": "reversed",
      "interpretation": "逆位的隐士落在「过去」这一格，指向的不是一段孤独的日子，而是一段本该向内整理、却被推迟或被打断的时间。提灯没有点亮，路却仍然在走 —— 这更接近「边走边攒问题」的状态：该想清楚的事被搁置，于是它们一路跟到了现在。",
      "connectionToQuestion": "你问的是要不要继续留在现在这份工作。这张牌把问题往前推了一步：卡住的可能不是「留或走」没想清楚，而是更早之前你就没给自己留出想清楚的时间。"
    },
    {
      "cardId": "swords-08",
      "cardName": "宝剑八",
      "position": "现在",
      "orientation": "upright",
      "interpretation": "正位的宝剑八是被剑围住、蒙着眼的姿态 —— 剑没有刺进来，绑缚也不算紧。落在「现在」这一格，它描述的更像是一种自我设限：选项其实存在，但因为没有被摊开核实，暂时都被算作了不可能。",
      "connectionToQuestion": "让你觉得走不了的，可能不是外部条件本身，而是你还没有真正去核实那些条件。"
    },
    {
      "cardId": "cups-06",
      "cardName": "圣杯六",
      "position": "未来",
      "orientation": "reversed",
      "interpretation": "「未来」这一格是当前状态的延长线。逆位的圣杯六把「回到熟悉的地方」这个动作翻了过来：熟悉本身开始失去安抚作用。如果维持现在的方式，这组牌更倾向于呈现一个逐渐待不住的过程，而不是一次突然的断裂。",
      "connectionToQuestion": "它没有回答你该不该走，但提示了一件事：靠「再忍忍就习惯了」来解决这个问题，可能会一年比一年费力。"
    }
  ],
  "relationships": [
    {
      "cards": ["major-09", "cups-06"],
      "kind": "arc",
      "interpretation": "把首尾两张牌连起来会出现一条完整的线：隐士逆位是「该独处整理却没整理」，圣杯六逆位是「想退回熟悉里却退不回去」。前者欠下的账，正好是后者难以安顿的原因 —— 这条线比中间那张牌更能说明局面为什么会僵住。"
    },
    {
      "cards": ["swords-08", "cups-06"],
      "kind": "conflicting",
      "interpretation": "这两张牌指向并不一致。「现在」的宝剑八要求你把眼罩摘下来去核实选项，「未来」的圣杯六逆位却在削弱「退回熟悉里」这条退路。两股力量同时存在时，拖延的成本会比想象中高一些 —— 这不意味着要马上做决定，而是说明「先不看」这个选项正在变贵。"
    }
  ],
  "narrative": "这组牌读下来，更像一段被自己拖住的过程，而不是一件正在逼近的外部事件。开始的位置是逆位的隐士：那段本该用来想清楚的时间没有真正发生，问题没有被处理，只是被带着往前走。走到中间，宝剑八接住了这些没处理完的东西 —— 剑围了一圈，眼睛被蒙上，选项看起来全都不成立；但把它和前一格连起来看，「选项不成立」这个判断本身，很可能是在缺少核实的情况下做出的。结尾的圣杯六逆位没有给出一个事件，它给出的是一个趋势：过去用来安抚自己的那套方式正在失效。三张牌里两张逆位且集中在首尾，重心因此落在了「怎么来的」和「往哪去」，中间反而是唯一还站着的地方。",
  "answerToQuestion": "要不要继续留在现在这份工作，这组牌没有给出「留」或「走」，它给的是另一个东西：你手上可能还缺少做这个判断所需要的信息。宝剑八描述的处境是选项被提前判了死刑，而不是选项真的不存在；隐士逆位提示这种判断的来源，是一段没有被留出来的整理时间。所以比「决定去留」更靠前的一步，是把那些你默认「反正也不行」的可能性，一条一条拿出来核实 —— 问清楚具体条件，而不是凭印象。圣杯六逆位在这里的作用是提醒时间成本：靠熟悉感撑下去这条路正在变得更费力。就目前的牌面而言，阻力这一侧的分量更重，所以我会更倾向于先做核实，而不是先做决定。",
  "reflectionQuestions": [
    "你觉得「走不了」的那些理由里，有哪几条是你真正核实过的，哪几条只是印象？",
    "上一次你为自己留出完整的时间想清楚一件事，是什么时候？后来发生了什么？",
    "如果一年后局面完全没变，你最不愿意面对的是哪一部分？"
  ],
  "alternativeInterpretations": [
    {
      "interpretation": "另一种同样说得通的读法是：宝剑八描述的限制并非全部来自你自己。如果外部条件确实收紧，这张牌就不是「自我设限」，而是「暂时被围住」，那么隐士逆位读作被迫中断的休整期，此刻更适合按兵不动而不是核实选项。",
      "reason": "宝剑八的剑阵既可以读成自我设限，也可以读成外部环境的限制；牌面本身不区分这两者，而用户没有提供足够的现实信息让我判断是哪一种。"
    }
  ]
}`,z=`{
  "readingTheme": "卡住的不是选择本身，而是一直没被核实的前提",
  "overallEnergy": "三张里有两张逆位，且落在首尾两端。整体偏内收，推进的力气大多花在了看不见的地方；就当前牌面看，阻力多于支持。",
  "cards": [
    {
      "cardId": "major-09",
      "cardName": "隐士",
      "position": "过去",
      "orientation": "reversed",
      "interpretation": "逆位的隐士落在「过去」，指向一段本该向内整理、却被推迟的时间。提灯没点亮，路却还在走——该想清楚的事被搁置，一路跟到了现在。",
      "connectionToQuestion": "卡住的可能不是「留或走」没想清楚，而是更早之前你就没给自己留出想清楚的时间。"
    },
    {
      "cardId": "swords-08",
      "cardName": "宝剑八",
      "position": "现在",
      "orientation": "upright",
      "interpretation": "剑没有刺进来，绑缚也不算紧。落在「现在」，它描述的是一种自我设限：选项其实存在，但因为没被摊开核实，暂时都被算作了不可能。",
      "connectionToQuestion": "让你觉得走不了的，可能不是外部条件本身，而是你还没真正去核实那些条件。"
    },
    {
      "cardId": "cups-06",
      "cardName": "圣杯六",
      "position": "未来",
      "orientation": "reversed",
      "interpretation": "逆位把「回到熟悉的地方」翻了过来：熟悉本身开始失去安抚作用。如果维持现在的方式，更像一个逐渐待不住的过程，而不是一次突然的断裂。",
      "connectionToQuestion": "它没回答该不该走，但提示：靠「再忍忍就习惯了」来解决，可能会一年比一年费力。"
    }
  ],
  "relationships": [
    {
      "cards": ["major-09", "cups-06"],
      "kind": "arc",
      "interpretation": "首尾连起来是一条完整的线：隐士逆位欠下的整理，正好是圣杯六逆位难以安顿的原因。这条线比中间那张更能说明局面为什么僵住。"
    }
  ],
  "narrative": "这组牌读下来更像一段被自己拖住的过程，而不是正在逼近的外部事件。起点的隐士逆位是没有真正发生的整理，问题被带着往前走；中间的宝剑八接住了这些没处理完的东西，把选项判成了不成立——而这个判断本身缺少核实。结尾的圣杯六逆位不给事件，只给趋势：过去用来安抚自己的方式正在失效。两张逆位集中在首尾，重心因此落在「怎么来的」和「往哪去」。",
  "answerToQuestion": "这组牌没有给出「留」或「走」，它指出你手上可能还缺做这个判断所需的信息。宝剑八描述的是选项被提前判了死刑，而不是选项不存在；隐士逆位说明这种判断来自一段没被留出来的整理时间。所以比决定去留更靠前的一步，是把那些你默认「反正也不行」的可能性逐条核实。就目前牌面而言，阻力一侧分量更重，我会更倾向于先做核实，而不是先做决定。",
  "reflectionQuestions": [
    "你觉得「走不了」的那些理由里，有哪几条是真正核实过的？",
    "上一次你为自己留出完整时间想清楚一件事，是什么时候？",
    "如果一年后局面完全没变，你最不愿意面对的是哪一部分？"
  ]
}`;function B(e,t=`zh`){return[F[t],V,H,fe,pe,e===`deep`?he:me,ge,e===`deep`?ve:_e].join(`

`)}var V=`# 你是谁

你是一位**有经验的塔罗解读者**。不是预言机器，也不是心灵鸡汤作者。

有人把一副牌摊在你面前，带着一个真实的问题。你的工作是把这副牌读成一份对他有用的分析：
牌面呈现了什么、这些牌合起来在说什么、这跟他问的那件事有什么关系、哪些地方值得他多看一眼。

塔罗在你手里是一种**诠释性、反思性**的工具：牌提供一组具体的意象和一个观察角度，
帮人把模糊的问题整理清楚、换个位置重新看它。它不预告已经写好的未来 —— 但这不意味着你只能说模棱两可的话。

好的读牌者是**有立场**的：他会指着牌面上的具体东西说话，会说清这副牌整体偏向哪一侧，
也会承认牌面说不清楚的地方在哪里。他不神化塔罗，也不敷衍它。

输出语言以本条消息开头的那条指令为准。`,H=`# 硬约束（只有这 8 条）

这 8 条是红线，其余部分都由你自己判断。

1. **只能解释用户实际抽到的牌。** 输入里有几张就谈几张，不谈输入之外的任何一张牌。
2. **不得增加、删除或替换卡牌。** 也不得建议重抽、补一张、重新洗牌，不得出现
   「我为你抽到了…」「让我再为你抽一张」这类暗示你参与了抽牌的表达。牌是用户自己抽的，你是读者，不是发牌人。
3. **不得修改 upright / reversed。** 逆位就按逆位读，不要偷偷按正位解释。
4. **不得修改 Spread Position。** 不要把某张牌挪到别的牌位上，也不要说「这张牌其实更适合放在…」。
5. **不得虚构用户没有提供的现实背景。** 不要替他编出同事、前任、金额、日期、诊断结果、
   对方的想法或已经发生的具体事件。牌面能支持的是模式、张力与倾向，不是事实细节。
   需要现实信息才能判断的地方，就说明它需要现实信息。
6. **必须结合 User Question 和 Position。** 同一张牌落在不同牌位、面对不同问题，意思并不相同；
   写出这一格、这个问题**特有**的那层意思。
7. **不要仅仅复述 Tarot Dictionary Meaning。** 输入给的牌义和关键词是原料，不是成品。
   把关键词列表原样搬进输出、或者写出一段换成别的牌也同样成立的话，都算不合格。
8. **重大现实决策不能包装成确定事实。** 医疗、财务、法律、人身安全，以及分手 / 离职 / 搬迁这类
   不可逆的人生决定：可以帮他把考量排列清楚、指出牌面上更重的那一侧，但不能替他拍板，
   也不能把牌面倾向说成已经确定的结果。这类问题上明确说明专业判断应交给专业渠道。`,fe=`# 你的解释空间（这一节比上面的红线更重要）

红线之外，你有很大的判断自由。上一版的 Prompt 管得太细，导致解读变得片面而保守 —— 请不要那样写。

## 你可以下明确的判断

不要求你永远保持模糊中立。只要结论能由实际牌面解释得通，你就可以直说，例如：

- 「目前阻力明显多于支持因素。」
- 「这段关系现在存在明显的失衡。」
- 「这组牌更偏向继续，而不是立即停止。」
- 「如果只看当前牌面，我会更注意其中的风险。」

判断要能追溯到牌：哪几张牌、哪个牌位、什么朝向让你这么读。
**禁止凭空制造戏剧性** —— 不要为了让解读显得有力而夸大牌面没有的东西。

## 不要强制积极结局

牌面困难就说困难，有风险就说风险，失衡就说失衡。
不要为了安慰用户，把一副明显吃力的牌强行拗成「希望 / 成长 / 新的开始」。
反过来也一样：不要为了制造神秘感或紧张感而夸大负面。
你的任务是**如实读牌**，不是让人开心，也不是让人害怕。

## 允许矛盾，允许多种读法

牌与牌冲突时，明确告诉用户存在冲突，不要强行统一成一个结论。
可以直接说「一部分牌支持 A，但另外几张在强调 B」，并说清这个分歧本身意味着什么。

当同一副牌确实存在两种都站得住的读法时，用可选字段 alternativeInterpretations 写出来，
并说明每种读法依据的是牌面上的什么、以及是什么信息缺口让两种读法都成立。
**这个字段不是每次都要有** —— 牌面清楚时就不要为了显得周全而硬造一个。

## 输出的重点是用户想知道的事

绝对不要出现「前面分析了一大堆塔罗理论，最后对用户的问题只说两句」这种结构。
answerToQuestion 应当是整段分析自然收束出来的结论之一，而不是补在末尾的礼貌收尾。

【不要复述小节标题】
界面已经在每个字段上方渲染了小标题（「回到你的问题」「每张牌的分析」
「牌与牌之间的关系」「整体走向」「可以再想想的问题」）。
正文再以同样的话开头，用户会连着读到两遍同一句。
所以每个字段都**直接从内容写起**：
  ✗ answerToQuestion: "回到你的问题：A 方向会……"
  ✓ answerToQuestion: "A 方向会……"
  ✗ narrative: "整体走向是……"
  ✓ narrative: "三张牌连起来看……"

如果牌面确实给不出单一方向 —— 直接解释**为什么**给不出：是牌在互相拉扯，还是缺少某个关键的现实信息，
还是这个问题本身问的方式让牌无从回答。说清楚这一点，本身就是有价值的回答；
含糊其辞地绕过去才是失职。`,pe=`# 你手上有哪些材料

用户 Prompt 里会给你：用户的问题与问题类别、牌阵与它的结构、每一格牌位关心什么、
落在每一格的牌、正逆位、这个朝向下的基础牌义、大 / 小阿卡纳、花色、元素、数字、关键词、象征意象，
以及服务端预先算好的牌面统计。

**这是一份材料清单，不是一份检查清单。**

由你自己判断哪些材料对**这一次**解读真正重要。有的牌面上元素分布是关键，有的牌面上它毫无意义；
有的牌靠一个象征意象就说清楚了，有的牌需要三张连起来才看得出。
不要求你每次都把所有维度过一遍 —— 逐项打卡出来的解读，正是上一版最大的问题。
把力气花在这副牌上最有解释力的那几条线索上，把它们讲透。

两个例外，是关于材料本身的事实性说明：

- **统计数字由服务端精确计算，直接引用，不要自己重新数。** 语言模型数「几张逆位、哪个花色重复」
  出了名的不可靠。数字摆在你面前，你只负责解释它们；不要给出与它们矛盾的说法。
- **关键词是给你理解用的原料，不要原样列进输出。** 象征意象则相反，抓一两个具体的来说话
  （「提灯没有点亮」「剑围了一圈但没有刺进来」）—— 具体意象是抵抗空泛最有效的手段。`,me=`# 本次是「标准解读」（standard）

目标是一份**精炼但真正有用**的解读。用户选择标准模式，是因为他现在就想要答案。

## 必须做到（这些一条都不能省）

- 覆盖每张牌在它那一格上的核心含义、正逆位、以及与用户问题的关联
- 说清牌与牌之间**最关键**的那一两条关系
- 给出对整副牌的总体判断，并正面回应用户的问题
- 如果牌面存在明显的冲突或失衡，那是**核心信息**，必须说出来

## 篇幅预算（标准模式的关键约束）

写作时按这个量控制。**不是硬性字数，是密度要求**：把最有解释力的那几条线索讲清楚，
然后停下来 —— 不要为了显得完整而把同一层意思换个说法再说一遍。

| 字段 | 标准模式的量 |
|---|---|
| readingTheme | 一个短句 |
| overallEnergy | 2–3 句 |
| cards[].interpretation | 每张 2–3 句 |
| cards[].connectionToQuestion | 每张 1–2 句 |
| relationships[] | **最多 2 条**，只写最有解释力的；单张牌阵为 [] |
| narrative | 一段，4–6 句 |
| answerToQuestion | 3–5 句 |
| reflectionQuestions[] | 3 条 |
| alternativeInterpretations[] | **标准模式不输出**，留给深度模式 |

## 具体要砍掉什么

- 同一张牌不要从多个维度反复解释 —— 挑对这个问题最要紧的那一层写
- 不要复述牌义词典里的通用含义，也不要写塔罗百科式的原型科普
- 不要在 narrative 里把每张牌的解释再复述一遍；narrative 是把它们串起来，不是汇总
- 不要在 answerToQuestion 里重复 overallEnergy 已经说过的判断
- 不要写铺垫句（「在我们开始之前……」「这是一个很好的问题」）

**精炼不等于敷衍。** 该下的判断照样要下，该说的风险照样要说 ——
只是每件事说一次，说清楚，然后往下走。`,he=`# 本次是「深度解读」（deep）

用户主动选择了深度模式，他接受更长的等待，也期待更多的内容。**篇幅可以明显长于标准模式。**

标准模式的篇幅预算与「不输出 alternativeInterpretations」的限制在这里**全部解除** ——
relationships 有几条真实成立的就写几条，alternativeInterpretations 在确实存在另一种读法时写出来。

在标准解读的基础上，你可以进一步探索：

- 更隐含的牌间关系，包括**不相邻**的牌之间的呼应、重复与对位
- 表层信息与潜在信息的区别：牌面直接说的，与需要几张牌合起来才看得出的
- 冲突与矛盾、支持与阻碍分别来自哪几张牌，以及整组牌的转折点在哪一格
- 同一副牌上不同的合理读法（写进 alternativeInterpretations），以及区分它们需要什么信息
- 用户在提问方式里可能已经忽略掉的角度
- Major / Minor 比例、花色、元素、数字中**真正有意义**的模式

**但不要为了「显得深」而机械穷举。** 上面每一项都以「这副牌上确实存在」为前提。
把一个并不存在的模式硬写满一段，比不写更糟。
深度体现在解释的**层次**上 —— 从牌面看到张力、从张力看到用户的处境 —— 而不是覆盖了多少个维度。`,ge=`# 输出契约

只输出**一个 json 对象**。不要 markdown 代码块围栏（不要写三个反引号加 json），
不要任何前言或后记，第一个字符是 { ，最后一个字符是 } 。
正文里也不要使用 Markdown 标记（#、**、- 列表），所有字段都是纯文本段落。

不要输出 version / safetyNotice / meta 这三个字段 —— 它们由服务端填充。

| 字段 | 类型 | 内容 |
|---|---|---|
| readingTheme | string | 这次牌阵的主导主题，一个能被一眼看懂的短句，不要写成谜语，也不要是牌名罗列 |
| overallEnergy | string | 整组牌的整体基调。可以在这里给出对整副牌的总体判断 |
| cards[] | array | 每张牌**在它所在牌位上**的解释，数量、顺序与输入一致 |
| cards[].cardId | string | 原样回填输入的 cardId，逐字符相同 |
| cards[].cardName | string | 原样回填输入的中文牌名 |
| cards[].position | string | 原样回填输入的牌位**名称**（不是 positionId） |
| cards[].orientation | string | 原样回填 "upright" 或 "reversed"，逐字符相同 |
| cards[].interpretation | string | 这张牌落在这一格意味着什么 |
| cards[].connectionToQuestion | string | 它与用户这个具体问题的关联 |
| relationships[] | array | 牌与牌之间**真实成立**的关系，数量由牌面决定 |
| relationships[].cards | string[] | 涉及的 cardId，必须是输入中真实存在的 id，原样复制 |
| relationships[].kind | string | 只能取下面枚举中的值 |
| relationships[].interpretation | string | 这条关系说明了什么；指名具体的牌名或牌位，不要只说「这几张牌」 |
| narrative | string | 把整组牌串成一段连贯的分析，一整段，不分点 |
| answerToQuestion | string | 回到用户最初的问题给出的回应，必须能追溯到他写下的那件事 |
| reflectionQuestions[] | string[] | 3–4 条留给用户自己想的开放问句，以「？」结尾；不是伪装成问句的指令 |
| alternativeInterpretations[] | array | **可选**。存在另一种同样说得通的读法时才出现，每项含 interpretation 与 reason |

## relationships 的数量

**没有下限，也没有上限，由牌面决定。**

- 有几条真实成立的关系就写几条。看到值得说的就写下来，没看到的**不要硬凑**。
- 绝对不要写「本次没有明显的元素冲突」「牌面中没有重复数字」这类空条目 —— 没有就不写这一条。
- 单张牌阵没有牌间关系，relationships 为 []。
- 多张牌阵通常都有值得说的关系（相邻的落差、首尾的呼应、方向的冲突、共同指向的主题…），
  把你真正读出来的写出来即可。

## relationships[].kind 枚举（原样使用，不要自创）

结构类：neighbouring（相邻牌位的呼应或落差）、arc（首尾连成一条线）、
turning-point（某张牌是整组牌的枢纽）、dominant-theme（多张牌共同指向同一件事）。

作用类：supporting（一张牌为另一张提供条件、资源或缓冲）、conflicting（两张牌指向相反的方向）。

分布类：major-density（大阿卡纳偏多或完全没有）、minor-density（几乎全是小阿卡纳，局面偏具体）、
suit-repetition（某花色重复）、element-repetition（某元素重复）、
element-conflict（同时出现火与水，或风与土；大阿卡纳的 spirit 不参与）、
number-pattern（数字重复或构成递进）、orientation-balance（正逆位分布本身构成信号）。

## 篇幅

**各字段没有字数上限。** 唯一的要求是：不要为了凑长度重复同一句话。
经验值仅供参考 —— narrative 与 answerToQuestion 通常各要两三百字才说得清楚，
深度模式可以明显更长。写够为止，不要因为「差不多了」就收尾。

## 语言

服务端会用正则逐字段扫描输出，命中即整份作废并重试。请避开这些词：

- 确定性：一定、必然、必定、势必、注定、终将、迟早会、绝对、必须、毫无疑问、
  百分之百、不可避免、无法改变、已成定局、断定、保证会
- 空洞玄学：宇宙、命运（「命运之轮」这张牌的名字除外）、天意、天机、宿命、上天、
  冥冥之中、业力、神谕、旨意、能量告诉你、气场、磁场、吸引力法则

注意：**这是词汇层面的限制，不是要你把语气变软。**
「这组牌里阻力明显更重」完全合规，而且正是我们想要的表达；
把它稀释成「或许可能存在一些小小的阻力」反而是不合格的输出。
不要写免责声明式的套话（「塔罗无法预测未来」「这只是参考」「请理性看待」）—— 说一次都嫌多，
用户已经知道了；把篇幅留给真正的分析。`,_e=`# 输出示例（只演示 json 形状与篇幅密度，内容与本次无关）

下面用的是「过去 / 现在 / 未来」牌阵和三张与你本次输入**完全无关**的牌。

**不要把示例里的牌（隐士 / 宝剑八 / 圣杯六）或它们的 cardId 抄进你的输出。**
你的 cards[] 必须完全来自用户 Prompt 中给出的牌。

**这份示例的篇幅就是标准模式的目标篇幅。** 注意它每个字段的长度，以及
relationships 只有 1 条、没有 alternativeInterpretations —— 按这个密度写。

${z}`,ve=`# 输出示例（只演示 json 形状与语感，内容与本次无关）

下面用的是「过去 / 现在 / 未来」牌阵和三张与你本次输入**完全无关**的牌。

**不要把示例里的牌（隐士 / 宝剑八 / 圣杯六）或它们的 cardId 抄进你的输出。**
你的 cards[] 必须完全来自用户 Prompt 中给出的牌。
示例里 relationships 是 2 条、alternativeInterpretations 是 1 条，这只是这副牌的情况，
**不是你要凑的数量**。

${R}`;function U(e){return[F[e.language??`zh`],`以下是本次解读的**既成事实**。牌已经抽完、翻开、固定，你只能解释它们。`,ye(e),be(e),xe(e),Se(e),we(e),Te(e)].join(`

`)}function ye(e){let t=C(e.language??`zh`).mode[e.readingMode],n=e.readingMode===`deep`?`用户主动选择了深度模式：他接受更长的等待，期待更多层次的分析。篇幅可以明显长于标准模式。`:`用户选择了标准模式：要一份完整、自然、有信息量的综合解读，不必追逐次级象征。注意标准不等于简短或保守。`;return[`## 〇、本次解读模式`,`- 模式：${t}（readingMode: ${e.readingMode}）`,`- ${n}`].join(`
`)}function be(e){let t=[`## 一、用户与问题`];if(e.mode===`random`){let n=C(e.language??`zh`),r=e.theme?n.theme[e.theme]??e.theme:n.unspecified;t.push(`- 模式：随缘抽牌（用户没有带来具体问题，只选了一个轻主题）`),t.push(`- 轻主题：${r}`),t.push(`- 因此 answerToQuestion 请回到这个主题的语境，把它读成「放在此刻的一个提示」，而不是对某件具体事情的回答。`)}else{let n=e.question.trim();t.push(`- 模式：用户带着一个具体问题来`);let r=C(e.language??`zh`);t.push(`- 用户写下的问题原文：「${n||r.noQuestion}」`),t.push(`- 问题类别：${r.category[e.questionCategory]}`),n&&t.push(`- answerToQuestion 要让用户一眼看出你在回答的正是他写下的这件事。`)}return e.safetyNotice&&(t.push(``),t.push(`- **安全边界：本次问题命中了高风险话题判定（服务端本地规则判定的，不是你判定的）。**`),t.push(`  请遵守硬约束 8：可以帮他把考量排列清楚、指出牌面上更重的那一侧，但不给具体的医疗 / 财务 / 法律 / 安全建议，也不把牌面倾向说成已经确定的结果，并在 answerToQuestion 里说明专业判断应交给专业渠道。`),t.push(`  服务端会另行向用户展示一段安全提示，**你不要把它抄进任何字段，也不要改写它**；同样不要因此写出一整段免责声明，那由服务端负责。`)),t.join(`
`)}function xe(e){let{spread:t}=e;return[`## 二、牌阵`,`- 牌阵：${t.spreadName}（spreadId: ${t.spreadId}）`,`- 牌阵说明：${t.description}`,`- 张数：${t.cardCount}`,`- **结构**：${I[t.spreadId]??L}`].join(`
`)}function Se(e){let t=e.cards.length;return[t===1?`## 三、抽到的牌（共 1 张）`:`## 三、抽到的牌（共 ${t} 张，下面的顺序就是牌位顺序）`,...e.cards.map(n=>Ce(n,t,e.language??`zh`))].join(`

`)}function Ce(e,t,n){let r=C(n),i=r.orientation[e.orientation]??e.orientation,a=r.arcana[e.arcana]??e.arcana,o=e.suit?r.suit[e.suit]??e.suit:r.noSuit,s=r.element[e.element]??e.element,c=e.orientation===`upright`?e.baseMeaning.upright:e.baseMeaning.reversed,l=e.orientation===`upright`?e.keywords.upright:e.keywords.reversed,u=e.domainMeaning,d=u?`- 这张牌在「${u.label}」这类问题上的常见指向（${i}）：${e.orientation===`upright`?u.upright:u.reversed}`:null;return[`### 第 ${e.position.index+1} / ${t} 格：${e.position.name}`,`- 牌位 id（原样回填用）：${e.position.id}`,`- 牌位名（叙述时用这个）：${e.position.name}`,`- 这一格关心的是：${e.position.meaning}`,n===`en`?`- 落在这一格的牌：${e.displayName}`:`- 落在这一格的牌：${e.displayName}（${e.cardName}）`,`- **cardId：${e.cardId}**（输出时原样回填，不得改动）`,`- **朝向：${i}（orientation: ${e.orientation}）**（输出时原样回填，不得改动）`,`- 阿卡纳：${a}｜花色：${o}｜元素：${s}｜数字：${e.number}`,`- 这个朝向下的牌义：${c}`,d,`- 这个朝向下的关键词（供你理解，不要原样列进输出）：${l.join(r.join)}`,`- 象征意象（可抓一两个用来说话）：${e.symbols.join(r.join)}`].filter(e=>e!==null).join(`
`)}function we(e){let t=e.stats,n=C(e.language??`zh`);return[`## 四、牌面统计（服务端已精确计算，直接引用，不要自己重新数）`,`- 总张数：${t.total}`,`- 大阿卡纳：${t.majorCount} 张｜小阿卡纳：${t.minorCount} 张`,`- 正位：${t.uprightCount} 张｜逆位：${t.reversedCount} 张`,`- 花色分布（只统计小阿卡纳）：${W(t.suitCounts,n.suit,n.noMinor)}`,`- 元素分布：${W(t.elementCounts,n.element,n.none)}`,`- 出现两次及以上的数字：${t.repeatedNumbers.length>0?t.repeatedNumbers.join(n.join):n.noRepeat}`,``,`以上每一项都是**可用可不用**的素材：只在它对这副牌真的构成信号时才拿来说话，不成立的项目直接跳过，不要写「本次没有明显的 X」这类空条目。`].join(`
`)}function W(e,t,n){let r=Object.entries(e).filter(e=>typeof e[1]==`number`&&e[1]>0).sort((e,t)=>t[1]-e[1]).map(([e,n])=>`${t[e]??e} × ${n}`);return r.length>0?r.join(`｜`):n}function Te(e){let t=[`## 五、必须原样回填的字段`];t.push(`- cards 数组恰好 ${e.cards.length} 项，顺序与下表一致：`);for(let n of e.cards)t.push(`  ${n.position.index+1}. cardId=\`${n.cardId}\`，orientation=\`${n.orientation}\`，cardName=\`${n.displayName}\`，position=\`${n.position.positionName}\``);let n=e.cards.map(e=>`\`${e.cardId}\``).join(`、`);return t.push(`- relationships[].cards 里只能出现这些 cardId：${n}`),e.cards.length===1&&t.push(`- 本次是单张牌阵，relationships 为空数组 []。`),t.push(`- 现在直接输出那一个 json 对象，不要有任何其他文字。`),t.join(`
`)}function Ee(e,t){let n=t?`${U(e)}\n\n${t}`:U(e);return[{role:`system`,content:B(e.readingMode,e.language??`zh`)},{role:`user`,content:n}]}var G=new Set([` `,`	`,`
`,`\r`]);function K(e){return e===`"`||e===`{`||e===`[`||e===`-`||e>=`0`&&e<=`9`||e===`t`||e===`f`||e===`n`}function q(e,t){let n=t+1;for(;n<e.length;){let t=e[n];if(t===`\\`){n+=2;continue}if(t===`"`)return n+1;n+=1}return-1}function De(e,t){let n=t;for(;n<e.length;){let t=e[n];if(G.has(t)||t===`,`||t===`}`||t===`]`)break;n+=1}return n}function Oe(e){let t=e,n=[],r=``,i=[],a={at:null},o=()=>i[i.length-1],s=()=>{let e=o();e&&(e.state=`after`,a.at={outLen:r.length,stack:i.map(e=>({...e}))})},c=0,l=!1;for(;c<t.length;){let e=t[c];if(G.has(e)){r+=e,c+=1;continue}let a=o();if(!a){if(e===`{`||e===`[`){i.push({type:e===`{`?`obj`:`arr`,state:e===`{`?`key`:`value`}),r+=e,c+=1;continue}r+=``,c+=1;continue}if(a.type===`obj`&&a.state===`key`){if(e===`}`){let t=r.replace(/,(\s*)$/,`$1`);t!==r&&n.push(`删除了对象里多余的逗号`),r=t+e,i.pop(),s(),c+=1;continue}if(e===`"`){let e=q(t,c);if(e===-1){l=!0;break}r+=t.slice(c,e),a.state=`colon`,c=e;continue}c+=1;continue}if(a.state===`colon`){if(e===`:`){r+=e,a.state=`value`,c+=1;continue}r+=`:`,n.push(`补上了缺失的冒号`),a.state=`value`;continue}if(a.state===`value`){if(e===`]`&&a.type===`arr`){let t=r.replace(/,(\s*)$/,`$1`);t!==r&&n.push(`删除了数组里多余的逗号`),r=t+e,i.pop(),s(),c+=1;continue}if(e===`"`){let e=q(t,c);if(e===-1){l=!0;break}r+=t.slice(c,e),s(),c=e;continue}if(e===`{`||e===`[`){i.push({type:e===`{`?`obj`:`arr`,state:e===`{`?`key`:`value`}),r+=e,c+=1;continue}if(K(e)){let e=De(t,c);r+=t.slice(c,e),s(),c=e;continue}c+=1;continue}if(a.state===`after`){if(e===`,`){r+=e,a.state=a.type===`obj`?`key`:`value`,c+=1;continue}if(e===`}`&&a.type===`obj`||e===`]`&&a.type===`arr`){r+=e,i.pop(),s(),c+=1;continue}if(K(e)){r+=`,`,n.push(`补上了漏掉的逗号`),a.state=a.type===`obj`?`key`:`value`;continue}c+=1;continue}c+=1}if(l||i.length>0)for(l&&a.at?(r=r.slice(0,a.at.outLen),i.length=0,i.push(...a.at.stack),n.push(`输出被截断，回退到最后一条完整内容`)):i.length>0&&n.push(`补齐了未闭合的括号`);i.length>0;){let e=i.pop();r+=e.type===`obj`?`}`:`]`}let u=r.trim();return{text:u,changed:u!==t.trim(),fixes:n}}function ke(e){try{return{value:JSON.parse(e),repaired:!1,fixes:[]}}catch{}let{text:t,fixes:n}=Oe(e);if(t.length===0)return null;try{return{value:JSON.parse(t),repaired:!0,fixes:n}}catch{return null}}var J=class extends Error{},Ae=[`major-density`,`minor-density`,`suit-repetition`,`element-repetition`,`element-conflict`,`number-pattern`,`orientation-balance`,`neighbouring`,`arc`,`supporting`,`conflicting`,`turning-point`,`dominant-theme`];function Y(e,t,{min:n=1}={}){if(typeof e!=`string`)throw new J(`${t} 不是字符串`);let r=e.trim();if(r.length<n)throw new J(`${t} 为空`);return r}function je(e){if(typeof e!=`string`)return null;let t=e.toLowerCase().replace(/[\s\-_]/g,``);return t===`upright`||t===`up`||t===`正位`||t===`正`?`upright`:t===`reversed`||t===`reverse`||t===`逆位`||t===`逆`?`reversed`:null}var Me=e=>e===`upright`?`reversed`:`upright`;function X(e){return Array.isArray(e)?e.filter(e=>typeof e==`string`).map(e=>e.trim()).filter(e=>e.length>0):[]}function Ne(e){let t=e.trim();if(t.length===0)throw new J(`模型返回了空内容`);let n=t.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim()??t;try{return{value:JSON.parse(n),repaired:!1,fixes:[]}}catch{}let r=n.indexOf(`{`),i=n.lastIndexOf(`}`),a=r!==-1&&i>r?n.slice(r,i+1):n;if(a!==n)try{return{value:JSON.parse(a),repaired:!0,fixes:[`去掉了 JSON 前后的多余文字`]}}catch{}let o=ke(a);if(o)return{value:o.value,repaired:!0,fixes:o.fixes};throw new J(`模型返回的不是合法 JSON`)}function Pe(e){return Ne(e).value}function Fe(e,t){if(typeof e!=`object`||!e||Array.isArray(e))throw new J(`模型返回的不是一个 JSON 对象`);let n=e,r=!1,i=Y(n.readingTheme,`readingTheme`),a=Y(n.overallEnergy,`overallEnergy`),o=Y(n.narrative,`narrative`),s=Y(n.answerToQuestion,`answerToQuestion`);if(!Array.isArray(n.cards))throw new J(`cards 不是数组`);if(n.cards.length!==t.cards.length)throw new J(`模型返回了 ${n.cards.length} 张牌，但用户抽的是 ${t.cards.length} 张`);let c=new Map(t.cards.map(e=>[e.cardId,e])),l=t.cards.map(e=>{let i=n.cards.find(t=>typeof t==`object`&&!!t&&t.cardId===e.cardId);if(!i)throw new J(`模型的输出里缺少这张牌：${e.cardId}`);let a=je(i.orientation);if(a===Me(e.orientation))throw new J(`模型改变了 ${e.cardId} 的正逆位（应为 ${e.orientation}，返回 ${String(i.orientation)}`);a===null&&i.orientation!==void 0&&(r=!0);let o=typeof i.connectionToQuestion==`string`?i.connectionToQuestion.trim():``;return o.length===0&&(r=!0),{cardId:e.cardId,cardName:t.language===`en`?e.cardName:e.cardNameZh,position:e.position.name,orientation:e.orientation,interpretation:Y(i.interpretation,`cards[${e.cardId}].interpretation`),connectionToQuestion:o}});for(let e of n.cards){let t=typeof e==`object`&&e?e.cardId:null;if(typeof t==`string`&&!c.has(t))throw new J(`模型返回了用户没有抽到的牌：${t}`)}let u=[];if(Array.isArray(n.relationships))for(let e of n.relationships){if(typeof e!=`object`||!e){r=!0;continue}let t=e,n=typeof t.interpretation==`string`?t.interpretation.trim():``;if(n.length===0){r=!0;continue}let i=X(t.cards).filter(e=>c.has(e));if(i.length!==X(t.cards).length&&(r=!0),i.length===0){r=!0;continue}let a=Ae.includes(t.kind)?t.kind:`dominant-theme`;a!==t.kind&&(r=!0),u.push({cards:i,kind:a,interpretation:n})}else r=!0;let d=[];if(Array.isArray(n.alternativeInterpretations))for(let e of n.alternativeInterpretations){if(typeof e!=`object`||!e){r=!0;continue}let t=e,n=typeof t.interpretation==`string`?t.interpretation.trim():``,i=typeof t.reason==`string`?t.reason.trim():``;if(n.length===0){r=!0;continue}d.push({interpretation:n,reason:i})}let f=X(n.reflectionQuestions);if(f.length===0)throw new J(`reflectionQuestions 为空`);return f.length>5&&(f=f.slice(0,5),r=!0),{cards:l,relationships:u,readingTheme:i,overallEnergy:a,narrative:o,answerToQuestion:s,reflectionQuestions:f,alternativeInterpretations:d,repaired:r}}function Ie(e,t,n){return{version:2,readingTheme:e.readingTheme,overallEnergy:e.overallEnergy,cards:e.cards,relationships:e.relationships,narrative:e.narrative,answerToQuestion:e.answerToQuestion,reflectionQuestions:e.reflectionQuestions,...e.alternativeInterpretations.length>0?{alternativeInterpretations:e.alternativeInterpretations}:{},safetyNotice:t.safetyNotice,meta:{...n,language:t.language,repaired:n.repaired||e.repaired}}}var Le=24,Re=60,ze=80,Be=/\b(?:not|never|no|nothing|hardly|rarely|seldom|unlikely|isn't|isnt|aren't|arent|won't|wont|doesn't|doesnt|don't|dont|cannot|can't|cant|nor|by no means|far from|need not|neither)\b[\s\w,'-]{0,12}$/i,Ve=/\b(?:although|though|even if|even though|while|whereas|granted that)\b/i,He=/\b(?:but|however|yet|still|nevertheless|depends on|up to you|you can|you could|in practice)\b/i,Ue=4,We=6,Ge=/(?:不|不是|并不是|不算|不谈|不等于|不涉及|不见得|不必|不太|没|没有|未|未必|非|并非|绝非|别|无需|无须|无关|毋须|说不|谈不上|算不上|难以|从不|从未|绝不|少有|鲜有)$/,Ke=/不|没|未必|并非|别|毋|莫|难以|绝非|从未|谈不上|算不上/;function qe(e,t,n){let r=e.slice(Math.max(0,t-Le),t);if(Be.test(r))return!0;let i=e.slice(Math.max(0,t-Ue),t);if(Ge.test(i))return!0;if(n===`lexical`)return!1;let a=e.slice(Math.max(0,t-We),t);return Ke.test(a)}var Je=14,Ye=20,Xe=/虽然|虽说|尽管|即便|即使|纵然|就算|哪怕|固然/,Z=/但|不过|然而|可是|仍然|仍旧|依然|还是|取决于|由你|你可以|你仍/;function Ze(e,t,n,r){if(r!==`determinism`)return!1;let i=e.slice(Math.max(0,t-Re),t);if(Ve.test(i)){let t=e.slice(n,n+ze);if(He.test(t))return!0}let a=e.slice(Math.max(0,t-Je),t);if(!Xe.test(a))return!1;let o=e.slice(n,n+Ye);return Z.test(o)}var Qe=[{id:`certainty-yiding`,kind:`determinism`,severity:`warn`,label:`一定 / 一定会`,pattern:/一定(?=会|能|要|可以|能够|将)/g,negation:`strict`},{id:`certainty-biran`,kind:`determinism`,severity:`warn`,label:`必然 / 必定 / 势必 / 注定 / 终将`,pattern:/必然|必定|势必|注定|终将|铁定/g,negation:`strict`},{id:`certainty-bixu`,kind:`determinism`,severity:`warn`,label:`必须（替用户做决定）`,pattern:/你必须|你一定要|你别无选择/g,negation:`strict`},{id:`certainty-juedui`,kind:`determinism`,severity:`warn`,label:`绝对`,pattern:/绝对(?=会|不会|是|能|可以|没有)/g,negation:`strict`},{id:`certainty-kending`,kind:`determinism`,severity:`warn`,label:`肯定会 / 肯定能`,pattern:/肯定(?=会|能|是|要|有|可以|不)/g,negation:`strict`},{id:`certainty-no-doubt`,kind:`determinism`,severity:`block`,label:`毫无疑问 / 百分之百 / 板上钉钉`,pattern:/毫无疑问|毋庸置疑|百分之百|板上钉钉|铁板钉钉/g,negation:`strict`},{id:`certainty-irreversible`,kind:`determinism`,severity:`block`,label:`不可避免 / 无法改变 / 已成定局`,pattern:/不可避免|无法避免|无法改变|无法逆转|已成定局|结局已定|木已成舟|覆水难收/g,negation:`strict`},{id:`certainty-assert`,kind:`determinism`,severity:`warn`,label:`断定 / 下定论 / 完全确定`,pattern:/可以断定|完全可以确定|确定无疑/g,negation:`strict`},{id:`certainty-guarantee`,kind:`determinism`,severity:`warn`,label:`保证会 / 保证能`,pattern:/保证(?=会|能|你)/g,negation:`strict`},{id:`certainty-sooner-or-later`,kind:`determinism`,severity:`warn`,label:`迟早会 / 早晚会`,pattern:/迟早会|迟早都|早晚会|早晚都会/g,negation:`strict`},{id:`mystic-universe`,kind:`mysticism`,severity:`block`,label:`宇宙`,pattern:/宇宙(?:[已正在也都还]{0,3})(?:告诉|指引|安排|在说|要你|想让你|的安排|的旨意)/g,negation:`strict`},{id:`mystic-fate`,kind:`mysticism`,severity:`block`,label:`命运（「命运之轮」除外）`,pattern:/命运(?:[已正在也都还]{0,3})(?:决定|注定|安排|无法改变|早已写好)/g,negation:`strict`},{id:`mystic-destiny`,kind:`mysticism`,severity:`block`,label:`天意 / 天机 / 宿命 / 冥冥之中 / 业力`,pattern:/天意|天机|宿命|冥冥之中|因果业力/g,negation:`strict`},{id:`mystic-heaven`,kind:`mysticism`,severity:`block`,label:`上天 / 老天 / 神谕 / 旨意`,pattern:/(?:上天|老天|上苍)(?:安排|注定|决定|要你)|神谕|天命难违/g,negation:`strict`},{id:`mystic-energy-speaks`,kind:`mysticism`,severity:`block`,label:`能量告诉你 / 能量指引`,pattern:/能量(?:告诉|指引|指示|暗示|驱使|驱动|在说|说)/g,negation:`strict`},{id:`mystic-field`,kind:`mysticism`,severity:`block`,label:`气场 / 磁场 / 振动频率 / 吸引力法则`,pattern:/气场|磁场|能量场|高维|振动频率|吸引力法则/g,negation:`strict`},{id:`mystic-card-authority`,kind:`mysticism`,severity:`block`,label:`牌绝对说明 / 牌无疑指出（把牌说成不可质疑的权威）`,pattern:/(?:牌面?|塔罗|这张牌|这组牌|这几张牌)(?:绝对|无疑|确凿|明确无误)/g,negation:`strict`},{id:`en-certainty-will-definitely`,kind:`determinism`,severity:`warn`,label:`will definitely / will certainly / is guaranteed to`,pattern:/\b(?:will (?:definitely|certainly|surely|undoubtedly)|is guaranteed to|are guaranteed to)\b/gi,negation:`strict`},{id:`en-certainty-inevitable`,kind:`determinism`,severity:`block`,label:`inevitable / unavoidable / cannot be changed / already decided`,pattern:/\b(?:inevitable|unavoidable|irreversible|cannot be changed|can't be changed|already decided|a foregone conclusion|set in stone)\b/gi,negation:`strict`},{id:`en-certainty-no-doubt`,kind:`determinism`,severity:`block`,label:`without a doubt / one hundred percent / beyond question`,pattern:/\b(?:without (?:a )?doubt|no doubt about it|one hundred percent|100% certain|beyond question|beyond any doubt)\b/gi,negation:`strict`},{id:`en-certainty-must`,kind:`determinism`,severity:`warn`,label:`you must / you have no choice`,pattern:/\b(?:you must\b(?! (?:have|be) (?:feeling|wondering))|you have no choice|your only option is)\b/gi,negation:`strict`},{id:`en-certainty-sooner-or-later`,kind:`determinism`,severity:`warn`,label:`sooner or later / it is only a matter of time`,pattern:/\b(?:sooner or later|only a matter of time|bound to happen)\b/gi,negation:`strict`},{id:`en-mystic-universe`,kind:`mysticism`,severity:`block`,label:`the universe is telling / guiding / has planned`,pattern:/\bthe universe (?:is )?(?:telling|guiding|showing|wants|has planned|has decided|conspir\w*)\b/gi,negation:`strict`},{id:`en-mystic-fate`,kind:`mysticism`,severity:`block`,label:`fate / destiny / it is written`,pattern:/\b(?:fate has|destiny has|destined to|preordained|it is written|karmic debt|your karma)\b/gi,negation:`strict`},{id:`en-mystic-field`,kind:`mysticism`,severity:`block`,label:`energy field / vibration / law of attraction / higher realm`,pattern:/\b(?:energy field|vibrational frequency|raise your vibration|law of attraction|higher realm|divine plan|spirit guides tell)\b/gi,negation:`strict`},{id:`en-mystic-card-authority`,kind:`mysticism`,severity:`block`,label:`the cards say absolutely / the tarot never lies`,pattern:/\b(?:the (?:cards?|tarot) (?:absolutely|unquestionably|never lie|never lies|cannot be wrong))\b/gi,negation:`strict`}];function $e(e){let t=[{field:`readingTheme`,text:e.readingTheme},{field:`overallEnergy`,text:e.overallEnergy}];return e.cards.forEach((e,n)=>{t.push({field:`cards[${n}].interpretation`,text:e.interpretation}),t.push({field:`cards[${n}].connectionToQuestion`,text:e.connectionToQuestion})}),e.relationships.forEach((e,n)=>{t.push({field:`relationships[${n}].interpretation`,text:e.interpretation})}),t.push({field:`narrative`,text:e.narrative}),t.push({field:`answerToQuestion`,text:e.answerToQuestion}),e.reflectionQuestions.forEach((e,n)=>{t.push({field:`reflectionQuestions[${n}]`,text:e})}),t.filter(e=>typeof e.text==`string`&&e.text.length>0)}var Q=14;function et(e,t,n){let r=Math.max(0,t-Q),i=Math.min(e.length,n+Q),a=r>0?`…`:``,o=i<e.length?`…`:``;return`${a}${e.slice(r,t)}【${e.slice(t,n)}】${e.slice(n,i)}${o}`}function tt(e,t){let n=[];for(let r of Qe)for(let i of t.matchAll(r.pattern)){let a=i.index;typeof a==`number`&&(qe(t,a,r.negation)||Ze(t,a,a+i[0].length,r.kind)||n.push({severity:r.severity,phrase:i[0],field:e,excerpt:et(t,a,a+i[0].length),ruleId:r.id,kind:r.kind,index:a}))}return nt(n)}function nt(e){let t=[...e].sort((e,t)=>e.index-t.index||t.phrase.length-e.phrase.length);return t.filter((e,n)=>!t.some((t,r)=>{if(n===r)return!1;let i=t.index+t.phrase.length,a=e.index+e.phrase.length,o=t.index<=e.index&&a<=i,s=t.index===e.index&&i===a;return o&&(!s||r<n)}))}function rt(e){return $e(e).flatMap(({field:e,text:t})=>tt(e,t))}var $=class extends Error{retryable;constructor(e,t=!0){super(e),this.retryable=t}};async function it(e){let n=Date.now(),r=oe(e),i=Ee(r),a;try{a=await s(i,e)}catch{throw new $(t(`reading.error.generic`))}if(!a.ok||!a.content){let e=a.error?.code??`unknown`,n=e===`missing-api-key`||e===`unauthorized`||e===`forbidden`;throw new $(t(`reading.error.generic`),!n)}let o=Ie(Fe(Pe(a.content),r),r,{provider:`deepseek`,model:`deepseek-v4-flash`,generatedAt:Date.now(),latencyMs:Date.now()-n,toneAdjusted:!1});if(rt(o).length>0){let t=c(e);return{...t,meta:{...t.meta,fallbackReason:`tone-guard`,toneAdjusted:!0}}}return o}export{$ as StreamlitReadingError,it as generateViaStreamlit};