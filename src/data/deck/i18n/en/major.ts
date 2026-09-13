/**
 * English card text · Major Arcana (22)
 *
 * 【写作纪律，与中文母版同一套】
 * 分析性、反思性，第二人称；描述模式与张力，不预告已经写好的结果。
 * 不出现 will / destined / must —— 那是宿命论措辞，中文母版同样禁止。
 * 逆位不是「坏牌」，是同一股力量换了一种表现方式。
 *
 * 这不是逐字翻译：中文母版的句子长度与口语节奏搬进英文会显得拖沓。
 * 保持的是**同一份内容与同一种语气**，而不是同一串词。
 */

import type { CardText } from '../../localized'

export const majorEn: Record<string, CardText> = {
  'major-00': {
    name: 'The Fool',
    keywordsUpright: ['beginning', 'the unknown', 'travelling light', 'instinct'],
    keywordsReversed: ['rushing in', 'unprepared', 'avoidance', 'wavering'],
    meaningUpright:
      'The Fool stands where there is no path yet, carrying very little. It describes a beginning that has not been defined: the conditions are incomplete, but the willingness is real.',
    meaningReversed:
      'Reversed, the same light packing can turn into avoiding the details. What looks like freedom is sometimes moving before thinking — or wanting to move and never quite stepping off.',
    love: {
      upright:
        'The relationship may have no shape yet and both of you are still testing the ground. Being candid helps more than rushing to define it.',
      reversed:
        'There may be an appetite for novelty without appetite for what follows — or a fear of being serious dressed up as being casual.',
    },
    career: {
      upright:
        'A good moment to try a direction you have not worked in before. Inexperience is not the deciding obstacle here; how fast you learn is.',
      reversed:
        'The plan may be missing its most basic first steps. Enthusiasm has got out ahead of preparation.',
    },
    study: {
      upright:
        'Curiosity is high at the entry stage. Give yourself permission to walk the whole landscape roughly before going back for the detail.',
      reversed:
        'Attention keeps getting pulled to the next new thing, and what you learned changes direction before it has formed a structure.',
    },
    finance: {
      upright:
        'Few resources, but light obligations too. Small experiments suit this better than committing heavily.',
      reversed:
        'The specific shape of the risk may be underestimated. It is worth writing out the worst case and looking at it.',
    },
    advice: {
      upright:
        'Taking one step and then reassessing fits this situation better than standing still trying to solve every variable.',
      reversed:
        'Write "what am I actually afraid of" and "what do I actually want" as two separate lines. It usually clears quickly.',
    },
    personalGrowth: {
      upright:
        'You are standing somewhere you get to define yourself again. Inexperience is not the weak point here — not yet being boxed in by how you used to do it is a kind of freedom. The permission this stage needs is: let yourself be a beginner.',
      reversed:
        'The wish to start is genuine, but you are waiting for a signal that says you are ready. That signal does not arrive on its own. Sometimes what stops people is not the risk either — it is being seen while still unskilled. Shrink the first step until it can be finished today and nobody would see it.',
    },
    symbols: ['the cliff edge', 'a light pack', 'a path not yet worn', 'the white dog'],
    symbolism: [
      { title: 'the cliff edge', meaning: 'The threshold of a choice. One step forward is unknown; standing still is not safer.' },
      { title: 'a light pack', meaning: 'Carrying little is what makes movement possible. This stage needs mobility, not complete preparation.' },
      { title: 'a path not yet worn', meaning: 'No footprints ahead means no prescribed way to walk it.' },
      { title: 'the white dog', meaning: 'Instinct, alongside rather than in the way. It does not stop you; it reminds you to watch your feet.' },
    ],
  },

  'major-01': {
    name: 'The Magician',
    keywordsUpright: ['agency', 'resources in hand', 'clear intent', 'starting'],
    keywordsReversed: ['spinning', 'talk over action', 'unclear aim', 'manipulation'],
    meaningUpright:
      'All four elements are already on the table. What is missing is not a tool but the intent that connects them. This card points at: you already hold what it takes to begin.',
    meaningReversed:
      'Reversed, the capability is still there but the direction has scattered. Or the skill is going into persuading people rather than solving the thing.',
    love: {
      upright:
        'Saying it directly tends to move things forward. The other person is waiting for a clear signal, not a hint.',
      reversed:
        'There may be a gap between what is said and what is done — worth noticing whether your wording, or theirs, has been polished.',
    },
    career: {
      upright:
        'Your current skills are enough to support a real push. Turn the idea into a concrete proposal.',
      reversed:
        'It feels busy but the output is vague. It may be time to re-confirm what this work is actually meant to achieve.',
    },
    study: {
      upright:
        'Method matters more than hours here. Finding the right tool will noticeably speed things up.',
      reversed:
        'A lot of material collected, very little actually practised. Input has been covering for the absence of output.',
    },
    finance: {
      upright:
        'What you already have can be recombined. Your income structure is something you can design rather than receive.',
      reversed:
        'Be careful with opportunities that are well packaged but cannot explain their own logic — especially ones asking for a fast decision.',
    },
    advice: {
      upright:
        'Compress "I want to do this" into the first action you can finish this week. This card cares about starting.',
      reversed: 'Stop and ask once: what am I actually trying to trade this effort for?',
    },
    personalGrowth: {
      upright:
        'Everything needed is already in reach; what has been missing is the decision to point it somewhere. This is a stage for acting rather than acquiring — one more course will not change what the first attempt would.',
      reversed:
        'The capability is not in question. The aim is. Busyness has been standing in for direction, and the energy is going into explaining the plan rather than testing it.',
    },
    symbols: ['the four elemental tools', 'the infinity sign', 'the raised wand', 'the working table'],
    symbolism: [
      { title: 'the four elemental tools', meaning: 'Every kind of resource is already on the table. Nothing is waiting to be supplied.' },
      { title: 'the infinity sign', meaning: 'Capacity that renews. The constraint is attention, not supply.' },
      { title: 'the raised wand', meaning: 'Intent made visible. Pointing at something is the act this card is about.' },
      { title: 'the working table', meaning: 'A surface to build on. Ordinary, and the whole precondition.' },
    ],
  },

  'major-02': {
    name: 'The High Priestess',
    keywordsUpright: ['intuition', 'stillness', 'undisclosed information', 'waiting'],
    keywordsReversed: ['ignoring the signal', 'a secret weighing', 'over-rationalising', 'distance'],
    meaningUpright:
      'There is more behind the veil that has not been shown. This card describes a moment where the information is not fully public, and observing is worth more than declaring a position.',
    meaningReversed:
      'Reversed can be pushing down an inner note as though it were noise — or so much input that you can no longer hear your own read. After ten other opinions, the first instinct is usually the first thing dropped. A secret that has started to cost something is another common shape of this card reversed.',
    love: {
      upright:
        'Some feelings have not been said out loud and both of you are reading the other\'s silence. Giving each other a chance to explain would help.',
      reversed:
        'Withholding or sidestepping is spending down trust, even when the intention behind it is kind.',
    },
    career: {
      upright:
        'Key information has not surfaced yet. This is not the best moment to commit to a decision.',
      reversed:
        'You may be led off by surface numbers — or, the other way round, refusing to trust your own read at all.',
    },
    study: {
      upright:
        'Quiet solo work will be noticeably more effective than discussion. Good conditions for deep reading and digestion.',
      reversed: 'You already know which part is weak, and you keep routing around it.',
    },
    finance: {
      upright:
        'There are variables outside the visible numbers. Fill in the information before talking about allocation.',
      reversed:
        'Keeping up questions about an opaque arrangement is reasonable. Do not skip the question to avoid the awkwardness.',
    },
    advice: {
      upright:
        'Listen first, note it down, hold the judgement. The answer may only arrive the third time you think it over.',
      reversed:
        'Turn the vague unease into one specific sentence. It is usually less difficult to face than it looked.',
    },
    personalGrowth: {
      upright:
        'Something in you already knows, and it speaks quietly enough to be missed. This stage rewards keeping your own counsel long enough to hear it.',
      reversed:
        'After enough outside opinions, the first instinct is usually the first thing discarded. Or something is being held in that has grown heavier than telling it would be.',
    },
    symbols: ['the veil between two pillars', 'the new moon', 'the scroll', 'still water'],
    symbolism: [
      { title: 'the veil between two pillars', meaning: 'Information exists and is not yet shown. Not hidden maliciously — simply not yet time.' },
      { title: 'the new moon', meaning: 'The dark phase of a cycle. Nothing is wrong; nothing is visible either.' },
      { title: 'the scroll', meaning: 'What is known but not spoken. Partially held out of sight even by the one holding it.' },
      { title: 'still water', meaning: 'Surfaces that reflect only when nothing is disturbing them.' },
    ],
  },

  'major-03': {
    name: 'The Empress',
    keywordsUpright: ['nourishing', 'abundance', 'creating', 'receptivity'],
    keywordsReversed: ['over-giving', 'stalling', 'dependence', 'self-neglect'],
    meaningUpright:
      'This is a state that lets things grow at their own pace. There is no need to rush the harvest; the point is to keep supplying the conditions.',
    meaningReversed:
      'Reversed can be giving every nutrient outward until you are dry yourself — or an environment so comfortable that the will to move has gone.',
    love: {
      upright:
        'There is genuine care and warmth here. A good time to make the everyday texture of the relationship more concrete.',
      reversed:
        'What you give and what gets seen may be out of proportion. Saying what you need plainly is worth the discomfort.',
    },
    career: {
      upright:
        'Creative work and work that needs long cultivation will move. The results are accumulating even where they are not visible.',
      reversed:
        'A long stay in the comfortable range. Your capability may already have stopped growing.',
    },
    study: {
      upright:
        'Digest through understanding and association rather than memorisation.',
      reversed:
        'Study is being squeezed by the small business of daily life. Fence off a block of time that nothing else may enter.',
    },
    finance: {
      upright:
        'Income has a stable source. Consider directing part of it somewhere that compounds.',
      reversed: 'Spending on other people may have gone past what you can carry.',
    },
    advice: {
      upright:
        'Give what you are making more time. It has not reached the stage where it should be judged.',
      reversed: 'Look after your own condition first, then talk about how much you can give.',
    },
    symbols: ['the wheat field', 'running water', 'the crown of stars', 'soft cushions'],
  },

  'major-04': {
    name: 'The Emperor',
    keywordsUpright: ['structure', 'boundaries', 'responsibility', 'command'],
    keywordsReversed: ['rigidity', 'over-control', 'clashing with authority', 'no order at all'],
    meaningUpright:
      'This card argues for the value of order: set the rules first, then talk about freedom. It belongs in situations that need a frame built.',
    meaningReversed:
      'Reversed, the structure may have become a constraint — or the opposite: the frame that should exist was never built.',
    love: {
      upright:
        'The relationship needs explicit commitment and explicit boundaries. Vagueness costs more here than clarity would.',
      reversed:
        'One side may be leading too heavily, and the other\'s wishes have been compressed out of the picture.',
    },
    career: {
      upright:
        'Suited to taking on planning and management. Turning the current mess into process will solve most of it.',
      reversed:
        'Friction with a superior or with the rules deserves to be looked at directly. Meeting force with force is not the only option.',
    },
    study: {
      upright:
        'A schedule strictly kept will outperform studying by feel.',
      reversed:
        'A plan packed too full cannot be executed. Lower the bar in exchange for continuity.',
    },
    finance: {
      upright:
        'Good conditions for building a budget and a long horizon. Discipline matters more than opportunity right now.',
      reversed:
        'Being over-cautious can leave money idle for years — that is a cost too, just a quiet one.',
    },
    advice: {
      upright: 'Write the vague expectation down as an executable rule and the situation will steady.',
      reversed: 'Check which of your rules were useful once and have since expired.',
    },
    symbols: ['the stone seat', 'the sceptre', 'the ram motif', 'distant mountains'],
  },

  'major-05': {
    name: 'The Hierophant',
    keywordsUpright: ['tradition', 'mentorship', 'shared consensus', 'a system of learning'],
    keywordsReversed: ['dogma', 'going through the motions', 'questioning authority', 'going it alone'],
    meaningUpright:
      'This card points at paths that have already been proven: other people\'s experience, existing institutions, someone you can actually ask. Sound, but it asks for patience.',
    meaningReversed:
      'Reversed may mean the existing rule no longer fits — or that every established way has been dismissed too early.',
    love: {
      upright:
        'The relationship may be entering the stage that wants outside acknowledgement: meeting family, being public about it.',
      reversed:
        'The two of you picture what a relationship "should" look like differently. Better said out loud than each assumed privately.',
    },
    career: {
      upright:
        'Following the process and asking someone experienced will save more time than working it out alone.',
      reversed:
        'The current process may already be slowing things down, but have your reasons ready before you change it.',
    },
    study: {
      upright:
        'A structured course and a proper textbook suit this stage better than scattered material.',
      reversed:
        'Copying someone else\'s method wholesale may not fit you. One targeted adjustment is worth making.',
    },
    finance: {
      upright: 'Choose the mature, conservative route. There is no need to chase excess return.',
      reversed: 'Keep your own judgement about the choice that "everybody is making".',
    },
    advice: {
      upright:
        'One conversation with someone who has actually walked this road beats ten write-ups about it.',
      reversed: 'You may question the rule — but first work out why it was set in the first place.',
    },
    symbols: ['the triple crown', 'the crossed keys', 'stone steps', 'two listeners'],
  },

  'major-06': {
    name: 'The Lovers',
    keywordsUpright: ['choice', 'connection', 'shared values', 'candour'],
    keywordsReversed: ['divergence', 'deferring the decision', 'imbalance', 'outside pressure'],
    meaningUpright:
      'The core of this card is not only romance. It is choosing between two genuinely attractive options on the basis of what you actually value.',
    meaningReversed:
      'Reversed, the choice is being deferred — or the basis for it is coming from outside pressure rather than from what you care about.',
    love: {
      upright:
        'You see the important things similarly. That is the substantive ground a relationship can move forward on.',
      reversed:
        'The attraction is still there, but the picture of the future may not match. Worth laying out rather than assuming.',
    },
    career: {
      upright:
        'An opportunity that requires giving something up. The measure should be: which one is closer to who I want to become.',
      reversed:
        'Refusing to let go of either side usually ends with neither side done well.',
    },
    study: {
      upright:
        'Both directions in front of you may be worth learning, but there is only time to take one far enough to use. The measure is not which has more prospects — it is which one you would still continue during the dull stretch.',
      reversed:
        'Jumping between several directions, each stopping at the easy introductory part. What actually gets spent is not the time, it is the willingness to start again.',
    },
    finance: {
      upright:
        'Where money involves two people, settle it while there is still no disagreement. Separating "how much each contributes" from "what counts as fair" usually goes better than one conversation.',
      reversed:
        'Financial decisions made out of obligation tend to leave both sides uncomfortable afterwards.',
    },
    advice: {
      upright: 'Write out the cost of each option. The choice becomes clearer than expected.',
      reversed: 'Not choosing is also a choice, and usually the more expensive one.',
    },
    personalGrowth: {
      upright:
        'A choice that is really about values: which version of yourself each option feeds. Deciding on that basis makes the cost bearable, because you chose it knowingly.',
      reversed:
        'Deferring is comfortable because it keeps both futures theoretically alive. It also means the decision gets made by circumstance, using someone else\'s criteria.',
    },
    symbols: ['two trees', 'the angel\'s gaze', 'the peak', 'the fork in the road'],
    symbolism: [
      { title: 'two trees', meaning: 'Two things both alive and both real. Neither is the wrong option in itself.' },
      { title: 'the angel\'s gaze', meaning: 'A perspective larger than preference. Value, not appetite.' },
      { title: 'the peak', meaning: 'What the choice is ultimately in service of, visible from here but not yet reached.' },
      { title: 'the fork in the road', meaning: 'Two paths that stop being reversible after a certain distance.' },
    ],
  },

  'major-07': {
    name: 'The Chariot',
    keywordsUpright: ['momentum', 'will', 'a sense of direction', 'overcoming resistance'],
    keywordsReversed: ['loss of control', 'wavering direction', 'forcing it', 'inner friction'],
    meaningUpright:
      'Two opposing forces held by one person and pulled the same way. This card is about steering, not about suppression.',
    meaningReversed:
      'Reversed, the two forces are pulling separately; the speed is still there but the heading is gone. Or willpower alone has almost run out.',
    love: {
      upright:
        'Actively moving things forward will work, but watch whether the pace is one both of you can keep.',
      reversed:
        'One is pushing while the other is stepping back. Stopping to align matters more than accelerating.',
    },
    career: {
      upright:
        'Good conditions for a sprint. Focusing on a single objective can produce a breakthrough.',
      reversed:
        'Too many fronts opened at once, with the result that none of them moves.',
    },
    study: {
      upright:
        'A short high-intensity push is workable, but set an explicit end point.',
      reversed: 'Study by brute force is losing efficiency. Rest is not wasted time.',
    },
    finance: {
      upright: 'Going after it is more likely to change things than waiting.',
      reversed: 'Emotion-driven moves carry high risk here. Cool off before deciding.',
    },
    advice: {
      upright: 'Lock one direction. Everything else goes on the list for later.',
      reversed: 'Check one thing: am I applying force, or am I just refusing to lose?',
    },
    symbols: ['two beasts of different colour', 'the starred canopy', 'the city wall', 'the reins'],
  },

  'major-08': {
    name: 'Strength',
    keywordsUpright: ['gentle firmness', 'patience', 'self-acceptance', 'staying with it'],
    keywordsReversed: ['self-doubt', 'suppression', 'impatience', 'running on empty'],
    meaningUpright:
      'This card\'s method is not suppression but settling: first admit the strong feeling exists, then slowly bring it round to cooperating.',
    meaningReversed:
      'Reversed can be pressing the feeling down until it rebounds — or rating your own capability far below what it is.',
    love: {
      upright:
        'Tolerance and patience are working. The rough edges of the relationship are wearing smooth.',
      reversed: 'Endless accommodation is not the same as handling it. Feeling needs somewhere to go.',
    },
    career: {
      upright:
        'With a difficult person or a difficult problem, a soft approach is more likely to work than a hard one.',
      reversed: 'Self-criticism may be causing you to underrate what you actually contribute.',
    },
    study: {
      upright:
        'The hard part needs revisiting more than once. Slow progress does not mean no effect.',
      reversed:
        'The anxiety of comparing your pace to other people\'s is cancelling out the studying itself.',
    },
    finance: {
      upright:
        'The ability to hold back impulse spending is being built. Kept up, it will show a difference.',
      reversed: 'Notice the pattern of using spending to take the edge off stress.',
    },
    advice: {
      upright: 'The way you speak to yourself can be the way you speak to a friend.',
      reversed: 'Admit "I am tired right now" first. Then discuss the next step.',
    },
    symbols: ['the lion\'s open jaw', 'the infinity sign', 'a garland of flowers', 'a hand without force'],
  },

  'major-09': {
    name: 'The Hermit',
    keywordsUpright: ['stepping back', 'inner clarity', 'solitude', 'seeking'],
    keywordsReversed: ['isolation', 'refusing help', 'losing the thread', 'hiding'],
    meaningUpright:
      'Deliberately stepping out of the noise to see your own position by a small light. This is not withdrawal; it is a change of vantage point.',
    meaningReversed:
      'Reversed, the retreat may have become somewhere to hide, or the door has been closed so long that useful help cannot get in.',
    love: {
      upright:
        'Space to yourself is genuinely needed right now. Saying so is better than being distant without explanation.',
      reversed:
        'Distance kept too long turns into misreading each other. One of you has to speak first.',
    },
    career: {
      upright:
        'Take some time out of the flow to reconsider the direction. Not everything has to be answered in a meeting.',
      reversed:
        'Working entirely alone is slowing you down. Someone else\'s eyes would find the problem faster.',
    },
    study: {
      upright:
        'Deep, undisturbed work suits this stage. Turn off the group chat.',
      reversed: 'Closed off for so long that you cannot tell whether your method still works.',
    },
    finance: {
      upright: 'Go through the numbers on your own, quietly, before discussing them with anyone.',
      reversed: 'Avoiding the accounts does not make them smaller.',
    },
    advice: {
      upright: 'Ask what you would answer if nobody were watching.',
      reversed: 'Solitude is a tool, not a home. Set a date to come back out.',
    },
    symbols: ['the raised lantern', 'the snow field', 'the staff', 'walking alone'],
  },

  'major-10': {
    name: 'Wheel of Fortune',
    keywordsUpright: ['a turn', 'timing', 'cycles', 'what is outside your hands'],
    keywordsReversed: ['resisting the turn', 'bad timing', 'repeating the loop', 'passivity'],
    meaningUpright:
      'Something is turning, and part of it is not yours to steer. The card is less about luck than about recognising which part is yours.',
    meaningReversed:
      'Reversed can be holding the wheel still by force, or the same loop coming round again because nothing inside it was changed.',
    love: {
      upright:
        'The state of things is shifting on its own. Watch the change before naming it.',
      reversed: 'The same argument returning is a signal about the pattern, not about this instance.',
    },
    career: {
      upright:
        'External conditions are moving. Position yourself for the turn rather than trying to stop it.',
      reversed: 'Waiting for the situation to change on its own has become the plan.',
    },
    study: {
      upright: 'The plateau is part of the cycle. Keep the routine and it will move.',
      reversed: 'Starting over from the beginning each time is the loop itself.',
    },
    finance: {
      upright: 'Conditions are cyclical. Do not read a good stretch as a permanent state.',
      reversed: 'Repeating the same move and expecting a different outcome deserves examining.',
    },
    advice: {
      upright: 'Separate what you control from what you do not, then spend your effort on the first list.',
      reversed: 'If the loop keeps closing, change one thing inside it rather than waiting outside.',
    },
    symbols: ['the turning wheel', 'the four living creatures', 'the rising and falling figures', 'the letters on the rim'],
  },

  'major-11': {
    name: 'Justice',
    keywordsUpright: ['weighing', 'consequence', 'accountability', 'clear sight'],
    keywordsReversed: ['avoiding the account', 'bias', 'imbalance', 'delayed reckoning'],
    meaningUpright:
      'Cause and effect are being made visible. This card asks you to look at what actually happened rather than at how it felt.',
    meaningReversed:
      'Reversed can be dodging your share of the account, or judging the situation through one preferred lens.',
    love: {
      upright:
        'Fairness in this relationship is measurable — who gives what, who decides what. Look at it plainly.',
      reversed: 'One side is keeping score silently. Silent scores never balance.',
    },
    career: {
      upright:
        'A decision or an evaluation is being made on the record. Documentation matters more than usual.',
      reversed: 'A judgement may be resting on incomplete information. Ask for the rest.',
    },
    study: {
      upright: 'Results here reflect input honestly. Look at the record, not the intention.',
      reversed: 'Explaining the score away is more comfortable than reading it.',
    },
    finance: {
      upright: 'Terms, contracts and the fine print deserve real attention now.',
      reversed: 'An imbalance you have been tolerating is compounding quietly.',
    },
    advice: {
      upright: 'Write down what you did and what followed, in two columns.',
      reversed: 'Ask which part of this is genuinely mine, and take exactly that part.',
    },
    symbols: ['the scales', 'the upright sword', 'the pillars', 'the drawn curtain'],
  },

  'major-12': {
    name: 'The Hanged Man',
    keywordsUpright: ['suspension', 'a changed angle', 'willing pause', 'letting go'],
    keywordsReversed: ['stuck waiting', 'pointless sacrifice', 'refusing to shift', 'stalling'],
    meaningUpright:
      'Progress has paused, and the value of the pause is the change of angle it forces. Nothing is being lost while nothing is moving.',
    meaningReversed:
      'Reversed, the waiting has stopped producing anything — or the sacrifice being made is not buying what it was supposed to buy.',
    love: {
      upright:
        'Seeing it from the other person\'s position, once, would change what you think the problem is.',
      reversed: 'Waiting for them to change has become the whole strategy.',
    },
    career: {
      upright:
        'The project is on hold and that is not necessarily bad. Use the gap to re-examine the premise.',
      reversed: 'Enduring the situation is being confused with handling it.',
    },
    study: {
      upright: 'Try approaching the topic from a completely different entry point.',
      reversed: 'Repeating a method that has stopped working is not persistence.',
    },
    finance: {
      upright: 'Holding position is a legitimate decision here, as long as it is a decision.',
      reversed: 'A cost you keep absorbing deserves a limit and a date.',
    },
    advice: {
      upright: 'Ask what this looks like if the opposite assumption were true.',
      reversed: 'Set an end date for the wait. Open-ended waiting is not patience.',
    },
    symbols: ['the inverted figure', 'the living tree', 'the halo', 'the untied hand'],
  },

  'major-13': {
    name: 'Death',
    keywordsUpright: ['an ending', 'transition', 'clearing out', 'the necessary cut'],
    keywordsReversed: ['holding on', 'a dragged-out ending', 'resisting change', 'stalled transition'],
    meaningUpright:
      'Something has finished, whether or not it has been announced. This card is about the transition itself: what has to be put down before the next thing can be picked up.',
    meaningReversed:
      'Reversed, the ending is being dragged out. Keeping the form of something after its content has gone costs more than closing it.',
    love: {
      upright:
        'A stage of this relationship is over. That may mean it ends, or that it continues in a different shape.',
      reversed: 'Holding on to how it used to be is preventing whatever it could become.',
    },
    career: {
      upright:
        'A role or a way of working has run its course. Clearing it makes room rather than losing ground.',
      reversed: 'Staying in a position whose purpose has expired is its own kind of cost.',
    },
    study: {
      upright: 'Abandon the method that is not working; that is a decision, not a defeat.',
      reversed: 'Sunk cost is keeping you on a track you already know is wrong.',
    },
    finance: {
      upright: 'Cut what is no longer earning. Clean accounts think more clearly.',
      reversed: 'Refusing to realise a loss keeps the position controlling you.',
    },
    advice: {
      upright: 'Name what has already ended. Naming it is most of the work.',
      reversed: 'Ask what you are actually preserving, and whether it is still there.',
    },
    personalGrowth: {
      upright:
        'A version of you has finished. Grieving it is appropriate and so is putting it down — the next thing cannot be picked up with both hands full.',
      reversed:
        'Keeping the form of something after the content has gone. It looks like loyalty and functions like a delay.',
    },
    symbols: ['the white rose', 'the rising sun between towers', 'the still river', 'the plain banner'],
    symbolism: [
      { title: 'the white rose', meaning: 'What survives the ending. Endings are not the same as erasure.' },
      { title: 'the rising sun between towers', meaning: 'A boundary being crossed, with light on the other side of it.' },
      { title: 'the still river', meaning: 'Passage that continues regardless of whether it is agreed to.' },
      { title: 'the plain banner', meaning: 'The same event for everyone, without rank or exception.' },
    ],
  },

  'major-14': {
    name: 'Temperance',
    keywordsUpright: ['blending', 'measure', 'patience', 'the middle path'],
    keywordsReversed: ['excess', 'imbalance', 'impatience', 'incompatible mixing'],
    meaningUpright:
      'Two things that do not obviously go together are being combined slowly, in the right proportion. The skill here is measure, not force.',
    meaningReversed:
      'Reversed, the proportion is off — too much of one thing, or two elements being forced together that need separating first.',
    love: {
      upright: 'Adjusting to each other is working. Small calibrations, repeated, are the method.',
      reversed: 'Either accommodating too much or holding too rigidly. Neither is the middle.',
    },
    career: {
      upright: 'Combining two skill sets or two teams will pay off if you go slowly.',
      reversed: 'The pace is either burning people out or too slack to hold attention.',
    },
    study: {
      upright: 'Steady daily volume beats long irregular sessions at this stage.',
      reversed: 'All-nighters followed by nothing is the pattern to fix.',
    },
    finance: {
      upright: 'Balance across a few positions rather than concentrating in one.',
      reversed: 'Something is over-weighted. Rebalance before it decides for you.',
    },
    advice: {
      upright: 'Aim for the proportion, not the extreme. Adjust by small amounts and observe.',
      reversed: 'Find which side you have been over-supplying and take some back.',
    },
    symbols: ['two cups pouring', 'one foot in water', 'the path to the mountains', 'the triangle on the robe'],
  },

  'major-15': {
    name: 'The Devil',
    keywordsUpright: ['attachment', 'a bind you can leave', 'appetite', 'the material hold'],
    keywordsReversed: ['starting to see it', 'loosening', 'breaking the pattern', 'still bargaining'],
    meaningUpright:
      'Something has a hold, and the chains are looser than they look. This card is about the arrangement you keep choosing, not about evil.',
    meaningReversed:
      'Reversed usually means the hold is being seen for what it is. That is the beginning of leaving it, though not yet leaving it.',
    love: {
      upright:
        'There is a dynamic here that keeps repeating because both sides get something out of it. Name what each of you is getting.',
      reversed: 'The pattern is visible now. Seeing it and changing it are still two steps.',
    },
    career: {
      upright:
        'Money, status or comfort may be holding you in a role you would not otherwise choose. That is a trade, and trades can be re-priced.',
      reversed: 'You are starting to count the cost. Finish counting before deciding.',
    },
    study: {
      upright: 'The distraction is not accidental; it is doing a job. Find out what job.',
      reversed: 'The habit is loosening. Do not treat one relapse as proof it never moved.',
    },
    finance: {
      upright: 'Debt or dependency is shaping decisions more than it appears on paper.',
      reversed: 'A plan to get out is forming. Write it down before the urgency fades.',
    },
    advice: {
      upright: 'Ask what this arrangement gives you. Nobody stays for nothing.',
      reversed: 'Change one link in the chain rather than trying to break all of it.',
    },
    symbols: ['the loose chains', 'the inverted torch', 'the black pedestal', 'two bound figures'],
  },

  'major-16': {
    name: 'The Tower',
    keywordsUpright: ['sudden change', 'a structure failing', 'exposure', 'clearing by force'],
    keywordsReversed: ['a delayed collapse', 'internal cracking', 'fear of the fall', 'controlled demolition'],
    meaningUpright:
      'A structure that was already unsound has given way, quickly. It is unpleasant, and it is also information you could not get any other way.',
    meaningReversed:
      'Reversed can be a collapse being held off, or one that happens quietly inside where nobody sees it.',
    love: {
      upright:
        'Something has come out that cannot be put back. What follows depends on how it is handled, not on the fact itself.',
      reversed: 'The crack is there and being papered over. Paper does not hold.',
    },
    career: {
      upright:
        'An abrupt change of circumstance. The first task is stabilising, not explaining.',
      reversed: 'You can see it coming. Preparing beats hoping it passes.',
    },
    study: {
      upright: 'A result has exposed a gap the plan was hiding. That is useful, if unpleasant.',
      reversed: 'The foundation is weaker than the surface. Go back before going forward.',
    },
    finance: {
      upright: 'An unexpected expense or loss. Deal with the cash flow first, the analysis after.',
      reversed: 'A risk you know about is being deferred rather than handled.',
    },
    advice: {
      upright: 'Do not rebuild the same structure on the same ground.',
      reversed: 'If it has to come down, bringing it down deliberately costs less.',
    },
    symbols: ['the struck crown', 'the lightning', 'the falling figures', 'the fixed rock'],
  },

  'major-17': {
    name: 'The Star',
    keywordsUpright: ['restoration', 'quiet hope', 'openness', 'a clear direction'],
    keywordsReversed: ['loss of faith', 'depletion', 'cynicism', 'a dimmed sense of direction'],
    meaningUpright:
      'After something difficult, the pressure has eased and there is room to refill. This card is about recovery and a direction that is quiet but visible.',
    meaningReversed:
      'Reversed, the sense of direction has dimmed, or the recovery is being interrupted before it finishes.',
    love: {
      upright: 'Honesty is easier now than it has been. Use the window.',
      reversed: 'A loss of confidence, not a loss of feeling. Those need different responses.',
    },
    career: {
      upright: 'A good period for laying out a longer-term direction rather than a short sprint.',
      reversed: 'Burnout is reading as disinterest. It is not the same thing.',
    },
    study: {
      upright: 'Motivation is returning. Rebuild the routine gently, not at full load.',
      reversed: 'Doubting whether it is worth learning is the thing to address, not the schedule.',
    },
    finance: {
      upright: 'Conditions are stabilising. A plan made now is more likely to hold.',
      reversed: 'Pessimism about money may be causing avoidance rather than caution.',
    },
    advice: {
      upright: 'Keep the thing that restores you on the calendar, not in the gaps.',
      reversed: 'Refill first. Direction is much easier to see when you are not empty.',
    },
    symbols: ['the eight-pointed star', 'two vessels of water', 'one foot on land', 'the bird in the tree'],
  },

  'major-18': {
    name: 'The Moon',
    keywordsUpright: ['uncertainty', 'projection', 'the half-seen', 'unease'],
    keywordsReversed: ['clearing fog', 'facing the fear', 'confusion breaking', 'residual doubt'],
    meaningUpright:
      'Not everything here is what it looks like, and part of what you are seeing is your own projection. This is a poor moment for conclusions and a good one for observation.',
    meaningReversed:
      'Reversed usually means the fog is thinning. What was frightening at low light is turning out to have an ordinary shape.',
    love: {
      upright:
        'Anxiety is filling in details that have not been confirmed. Check before acting on them.',
      reversed: 'Something unsaid is surfacing. Let it finish surfacing before responding.',
    },
    career: {
      upright: 'Information is incomplete and the incomplete part is where the worry lives.',
      reversed: 'The picture is clarifying. Re-check the decisions made while it was unclear.',
    },
    study: {
      upright: 'The sense of not understanding may be larger than the actual gap. Test it.',
      reversed: 'What was confusing is starting to resolve. Consolidate it now.',
    },
    finance: {
      upright: 'Do not commit to anything whose terms you cannot state plainly.',
      reversed: 'A detail you were uneasy about is worth revisiting now that it is visible.',
    },
    advice: {
      upright: 'Separate what you observed from what you concluded. Write both.',
      reversed: 'Name the fear specifically. Specific fears are much smaller.',
    },
    symbols: ['the moon\'s two faces', 'the path between towers', 'the dog and the wolf', 'the crayfish at the water\'s edge'],
  },

  'major-19': {
    name: 'The Sun',
    keywordsUpright: ['clarity', 'warmth', 'things in the open', 'straightforwardness'],
    keywordsReversed: ['dimmed clarity', 'forced brightness', 'delay', 'over-optimism'],
    meaningUpright:
      'Things are visible and reasonably simple. Whatever is happening does not need decoding, which is itself worth using.',
    meaningReversed:
      'Reversed can be a good situation you cannot quite feel, or optimism running ahead of the facts.',
    love: {
      upright: 'Directness works here. There is less subtext than you are giving it credit for.',
      reversed: 'Performing happiness costs more than admitting the flat patch.',
    },
    career: {
      upright: 'Visible progress and recognition. A good time to say what you want out loud.',
      reversed: 'Confidence may be running ahead of preparation. Check the numbers once.',
    },
    study: {
      upright: 'Understanding is clicking. Move faster while it does.',
      reversed: 'Feeling like you know it is not the same as being able to do it. Test yourself.',
    },
    finance: {
      upright: 'A clear stretch. Use it to fix the structure, not just to enjoy it.',
      reversed: 'Optimistic assumptions are baked into the plan. Rerun it pessimistically.',
    },
    advice: {
      upright: 'Say the plain version of what you mean.',
      reversed: 'Allow the ordinary day to be ordinary. It does not have to be bright.',
    },
    symbols: ['the child on the horse', 'the sunflowers', 'the plain wall', 'the open banner'],
  },

  'major-20': {
    name: 'Judgement',
    keywordsUpright: ['reckoning', 'a call', 'reappraisal', 'a decision that has ripened'],
    keywordsReversed: ['ignoring the call', 'harsh self-judgement', 'hesitation', 'unfinished accounting'],
    meaningUpright:
      'A period is being summed up, and something is asking for an answer. This card is about reappraising with everything now visible.',
    meaningReversed:
      'Reversed can be knowing the answer and not saying it — or turning the reckoning into self-condemnation, which is a different activity.',
    love: {
      upright:
        'This relationship is being evaluated as a whole rather than incident by incident. Answer honestly.',
      reversed: 'Replaying old grievances is not the same as reaching a verdict.',
    },
    career: {
      upright: 'A decision that has been forming for a long time is ready. It will not get riper.',
      reversed: 'Waiting for certainty that this kind of decision never provides.',
    },
    study: {
      upright: 'Review the whole arc, not the last week. The pattern is the useful part.',
      reversed: 'Judging past effort harshly is spending energy that should go forward.',
    },
    finance: {
      upright: 'Take the full picture at once — everything, on one page.',
      reversed: 'Avoiding the total is what keeps it frightening.',
    },
    advice: {
      upright: 'Answer the thing you have been not answering.',
      reversed: 'Assessment and self-punishment are different. Do only the first.',
    },
    symbols: ['the trumpet', 'the risen figures', 'the grey sea', 'the distant peaks'],
  },

  'major-21': {
    name: 'The World',
    keywordsUpright: ['completion', 'wholeness', 'a closed loop', 'arrival'],
    keywordsReversed: ['nearly finished', 'a loose end', 'closure withheld', 'starting the next too soon'],
    meaningUpright:
      'A cycle has closed properly. The value here is not the achievement itself but that it can now be set down.',
    meaningReversed:
      'Reversed usually means the last percent is unfinished, or the ending has not been marked, so it keeps taking up space.',
    love: {
      upright: 'A stage is complete and both of you know it. Say it out loud.',
      reversed: 'Something unfinished from before is still attached. Close it before the next stage.',
    },
    career: {
      upright: 'Deliver it, write it down, and let it be finished.',
      reversed: 'Starting the next thing before ending this one carries the old weight forward.',
    },
    study: {
      upright: 'Consolidate. A finished summary is worth more than the next new chapter.',
      reversed: 'The last unfinished part is small and it is blocking everything after it.',
    },
    finance: {
      upright: 'A cycle has settled. Take the record and set the next horizon.',
      reversed: 'One outstanding item is keeping the whole account open.',
    },
    advice: {
      upright: 'Mark the ending. Endings that are not marked do not feel finished.',
      reversed: 'Finish the last five percent. It is the whole of the difficulty.',
    },
    symbols: ['the wreath', 'the four living creatures', 'the two wands', 'the flowing sash'],
  },
}
