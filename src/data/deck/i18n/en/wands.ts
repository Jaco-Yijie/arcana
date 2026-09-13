/** English card text · Wands (Fire — action, drive, momentum). Voice rules: see ./major.ts */

import type { CardText } from '../../localized'

export const wandsEn: Record<string, CardText> = {
  'wands-01': {
    name: 'Ace of Wands',
    keywordsUpright: ['a spark', 'impulse to act', 'raw opportunity', 'appetite'],
    keywordsReversed: ['a stalled start', 'scattered energy', 'hesitation', 'false start'],
    meaningUpright:
      'An offered beginning with heat in it. Nothing is built yet — what exists is the impulse and the opening, and both have a short shelf life.',
    meaningReversed:
      'Reversed, the spark is there but nothing is catching. Either the timing is wrong or the energy is going in five directions at once.',
    love: {
      upright: 'A new attraction or a fresh charge in an existing one. Act on it while it is live.',
      reversed: 'Interest that flares and fades. Watch whether it is being fed or just enjoyed.',
    },
    career: {
      upright: 'An opening worth taking. Move before the conditions get discussed to death.',
      reversed: 'The project has been announced more times than it has been started.',
    },
    study: {
      upright: 'Enthusiasm is high. Convert it into the first concrete session today.',
      reversed: 'Excitement about learning something is standing in for learning it.',
    },
    finance: {
      upright: 'A new source or a new idea worth a small first test.',
      reversed: 'Acting on the excitement without checking the mechanics.',
    },
    advice: {
      upright: 'Do the smallest version of it now, while the heat is still there.',
      reversed: 'Pick one. The energy is real; the dispersal is the problem.',
    },
    symbols: ['the offered wand', 'sprouting leaves', 'the distant castle', 'the open hand'],
  },

  'wands-02': {
    name: 'Two of Wands',
    keywordsUpright: ['planning', 'surveying', 'a wider horizon', 'first commitment'],
    keywordsReversed: ['planning instead of doing', 'playing safe', 'a narrowed view', 'delay'],
    meaningUpright:
      'Standing somewhere secure and looking at what is beyond it. The first success is in hand; the question is whether to extend.',
    meaningReversed:
      'Reversed, the survey has replaced the journey. The map keeps getting better and the door stays shut.',
    love: {
      upright: 'Considering where this could go. Worth saying what you picture out loud.',
      reversed: 'Keeping a foot inside the safe version of the relationship.',
    },
    career: {
      upright: 'Time to plan the next scale up rather than optimise the current one.',
      reversed: 'The plan is thorough and untested. Ship something small.',
    },
    study: {
      upright: 'Choose the syllabus and commit to it before comparing more of them.',
      reversed: 'Researching how to study has become the study.',
    },
    finance: {
      upright: 'Set a longer horizon and size the first move against it.',
      reversed: 'Over-caution is a position too, with its own cost.',
    },
    advice: {
      upright: 'Decide the direction, then take the first step that cannot be un-taken.',
      reversed: 'Give the plan a deadline. Plans without one become hobbies.',
    },
    symbols: ['the globe in hand', 'the parapet', 'two fixed wands', 'the coastline beyond'],
  },

  'wands-03': {
    name: 'Three of Wands',
    keywordsUpright: ['expansion', 'waiting for return', 'a wider field', 'the ships out'],
    keywordsReversed: ['delayed return', 'a limited outlook', 'impatience', 'overreach'],
    meaningUpright:
      'The work has been sent out and the results are in transit. This is the stage of watching, not of adding more.',
    meaningReversed:
      'Reversed, the return is slower than expected, or the reach exceeded what could be supported.',
    love: {
      upright: 'What you put in earlier is coming back. Give it a little more time.',
      reversed: 'Waiting for a response has turned into a stand-off. Ask directly.',
    },
    career: {
      upright: 'Work already in motion is worth monitoring rather than restarting.',
      reversed: 'Too many things launched to support any of them properly.',
    },
    study: {
      upright: 'The groundwork is laid. Results appear later than effort does.',
      reversed: 'Judging progress too early is making you change methods too often.',
    },
    finance: {
      upright: 'Returns are pending, not absent. Do not liquidate the position out of impatience.',
      reversed: 'Committed further than the current cash flow supports.',
    },
    advice: {
      upright: 'Let what you started run. Adding more now dilutes it.',
      reversed: 'Set a review date instead of checking daily.',
    },
    symbols: ['the figure looking out', 'three planted wands', 'the ships', 'the yellow sky'],
  },

  'wands-04': {
    name: 'Four of Wands',
    keywordsUpright: ['a stable base', 'celebration', 'belonging', 'a milestone'],
    keywordsReversed: ['an unsteady base', 'a postponed celebration', 'friction at home', 'transition'],
    meaningUpright:
      'A structure is solid enough to stand on and to gather under. This card marks arrival at something worth acknowledging.',
    meaningReversed:
      'Reversed, the foundation is less settled than it appears, or the moment worth marking has been passed over.',
    love: {
      upright: 'Stability, and often a public or shared marker of it.',
      reversed: 'Home ground feels unsettled. The issue is usually structural, not emotional.',
    },
    career: {
      upright: 'A stable platform. A good time to consolidate rather than expand.',
      reversed: 'The team or the arrangement is less stable than the surface suggests.',
    },
    study: {
      upright: 'The base is solid; build the next layer on it.',
      reversed: 'Foundations were skipped and the later material keeps collapsing.',
    },
    finance: {
      upright: 'A secure position. Fix the structure while conditions are easy.',
      reversed: 'A commitment tied to housing or family needs re-checking.',
    },
    advice: {
      upright: 'Mark the milestone. Unacknowledged progress stops feeling like progress.',
      reversed: 'Repair the base before adding weight.',
    },
    symbols: ['the four pillars', 'the garland', 'the raised bouquets', 'the walls beyond'],
  },

  'wands-05': {
    name: 'Five of Wands',
    keywordsUpright: ['friction', 'competition', 'unaligned effort', 'noise'],
    keywordsReversed: ['friction ending', 'avoided conflict', 'internal conflict', 'exhaustion'],
    meaningUpright:
      'Several forces pushing at once with no agreed order. It is chaotic rather than hostile — nobody is actually being defeated.',
    meaningReversed:
      'Reversed, either the scuffle is dying down, or it has moved inside where it cannot be resolved by talking.',
    love: {
      upright: 'Bickering over surface things while the real issue stays unnamed.',
      reversed: 'Conflict is being avoided rather than settled, and it is going quiet not away.',
    },
    career: {
      upright: 'Too many people steering. Agreeing the decision rule matters more than the decision.',
      reversed: 'Withdrawal from the fight is being read as agreement.',
    },
    study: {
      upright: 'Comparison with others is generating heat without direction.',
      reversed: 'Arguing with yourself about method has replaced practising one.',
    },
    finance: {
      upright: 'Competing demands on the same money. Rank them explicitly.',
      reversed: 'A disagreement about shared money is being deferred.',
    },
    advice: {
      upright: 'Get everyone to state what they actually want before debating how.',
      reversed: 'Say the disagreement out loud. Silent friction lasts longer.',
    },
    symbols: ['five raised staves', 'no clear opponent', 'crossed poles', 'uneven footing'],
  },

  'wands-06': {
    name: 'Six of Wands',
    keywordsUpright: ['recognition', 'a win in the open', 'confidence', 'being seen'],
    keywordsReversed: ['unacknowledged work', 'private doubt', 'inflated claim', 'delayed credit'],
    meaningUpright:
      'The work has been seen and named. Recognition here is real and public, and it changes what you can ask for next.',
    meaningReversed:
      'Reversed, the credit has not landed where the work was done — or the confidence outside does not match the read inside.',
    love: {
      upright: 'Feeling valued and saying so. Appreciation spoken aloud carries here.',
      reversed: 'Effort in the relationship is going unnoticed. Say what you would like noticed.',
    },
    career: {
      upright: 'Visibility is high. Use it to ask for the next thing while it lasts.',
      reversed: 'Someone else is presenting your work. Document what you did.',
    },
    study: {
      upright: 'A result confirms the method. Keep the method.',
      reversed: 'A good outcome you do not believe in yourself is still a good outcome.',
    },
    finance: {
      upright: 'A good moment to negotiate — the case is currently easy to make.',
      reversed: 'Compensation is lagging behind contribution. Raise it with evidence.',
    },
    advice: {
      upright: 'Accept the recognition plainly and ask for the next thing.',
      reversed: 'Write down what you actually did. Memory shrinks it.',
    },
    symbols: ['the laurel', 'the horse', 'the walking crowd', 'the covered wand'],
  },

  'wands-07': {
    name: 'Seven of Wands',
    keywordsUpright: ['holding ground', 'defending a position', 'conviction', 'the uphill side'],
    keywordsReversed: ['worn down', 'giving ground', 'defensiveness', 'losing the reason'],
    meaningUpright:
      'You are standing higher than the pressure but you are outnumbered. The position is defensible; it just needs to be actually defended.',
    meaningReversed:
      'Reversed, the defence has run long and you can no longer remember why you are holding this particular hill.',
    love: {
      upright: 'A boundary needs holding, including against people who mean well.',
      reversed: 'Defensiveness is reading as hostility. Restate the boundary calmly.',
    },
    career: {
      upright: 'Your position is sound; keep making the case rather than assuming it is obvious.',
      reversed: 'The fight is costing more than the ground is worth. Check which it is.',
    },
    study: {
      upright: 'Keeping your own pace under pressure is the task right now.',
      reversed: 'Constantly justifying your approach is eating the time meant for using it.',
    },
    finance: {
      upright: 'Hold the budget line even when it is socially awkward.',
      reversed: 'The line has quietly moved several times already.',
    },
    advice: {
      upright: 'Choose which hill this is before you fight for it.',
      reversed: 'Ask whether stepping back here loses anything you actually need.',
    },
    symbols: ['the higher ground', 'six wands below', 'mismatched footwear', 'the braced stance'],
  },

  'wands-08': {
    name: 'Eight of Wands',
    keywordsUpright: ['speed', 'messages in flight', 'things unblocking', 'rapid movement'],
    keywordsReversed: ['a hold-up', 'crossed signals', 'too fast', 'scattered arrival'],
    meaningUpright:
      'Everything that was stuck is moving at once. The window is short and the correct response is speed, not deliberation.',
    meaningReversed:
      'Reversed, the movement is jammed or arriving out of order, and messages are landing wrong.',
    love: {
      upright: 'Things accelerate. Communication becomes easy and frequent.',
      reversed: 'Messages misread. Slow the exchange down and check meaning.',
    },
    career: {
      upright: 'A fast window. Respond quickly; the pace itself is the opportunity.',
      reversed: 'Waiting on replies that keep not coming. Chase once, explicitly.',
    },
    study: {
      upright: 'Momentum is high. Cover ground while it holds.',
      reversed: 'Rushing has skipped a step that later material depends on.',
    },
    finance: {
      upright: 'Transactions clear quickly. Handle the paperwork while it is fluid.',
      reversed: 'A delayed payment or transfer needs following up directly.',
    },
    advice: {
      upright: 'Answer fast. This is not the phase for careful drafting.',
      reversed: 'Confirm what was actually received before assuming it landed.',
    },
    symbols: ['eight wands in flight', 'the open sky', 'the river below', 'no figure at all'],
  },

  'wands-09': {
    name: 'Nine of Wands',
    keywordsUpright: ['near the end', 'guardedness', 'resilience', 'one more push'],
    keywordsReversed: ['depleted', 'over-guarded', 'giving up close to the line', 'old wounds steering'],
    meaningUpright:
      'Tired, marked, and still standing. Most of the distance is behind you, which is exactly why stopping feels reasonable right now.',
    meaningReversed:
      'Reversed, the wariness has outgrown the actual threat, or the reserves are genuinely gone and need refilling before anything else.',
    love: {
      upright: 'Guardedness that came from somewhere real. Worth saying where it came from.',
      reversed: 'Defending against a past situation in a present one.',
    },
    career: {
      upright: 'Almost through. Protect the remaining energy rather than adding tasks.',
      reversed: 'Running on nothing. A real break is cheaper than the mistakes fatigue makes.',
    },
    study: {
      upright: 'The final stretch. Reduce scope, keep going.',
      reversed: 'Stopping now would forfeit most of what is already paid for.',
    },
    finance: {
      upright: 'The tight period is nearly over. Hold the discipline a little longer.',
      reversed: 'Vigilance has turned into anxiety and it is affecting judgement.',
    },
    advice: {
      upright: 'Cut scope, not the finish. One more push is enough.',
      reversed: 'Rest properly first. Then decide whether to continue.',
    },
    symbols: ['the bandaged head', 'eight wands behind', 'one wand held', 'the watchful stance'],
  },

  'wands-10': {
    name: 'Ten of Wands',
    keywordsUpright: ['overload', 'carrying everything', 'the last stretch', 'burden'],
    keywordsReversed: ['putting some down', 'refusing to delegate', 'collapse', 'released'],
    meaningUpright:
      'The load is being carried and it is too much to see over. The destination is close, which is why nothing has been set down.',
    meaningReversed:
      'Reversed is either finally putting some of it down, or reaching the point where it falls rather than being placed.',
    love: {
      upright: 'One person is carrying the logistics of the relationship. Say which parts.',
      reversed: 'Redistribute before resentment does it for you.',
    },
    career: {
      upright: 'Taking on everything is no longer efficiency, it is a bottleneck.',
      reversed: 'Delegating feels slower for a week and faster after that.',
    },
    study: {
      upright: 'The workload has passed what one schedule can hold. Cut something.',
      reversed: 'Dropping the least important item is a decision, not a failure.',
    },
    finance: {
      upright: 'Obligations have accumulated past comfortable. List them all in one place.',
      reversed: 'Consolidating or renegotiating one item would relieve most of the pressure.',
    },
    advice: {
      upright: 'Ask which of these are actually yours to carry.',
      reversed: 'Put one thing down today. Not the biggest — just one.',
    },
    symbols: ['ten wands bundled', 'the bent back', 'the town ahead', 'the obscured view'],
  },

  'wands-11': {
    name: 'Page of Wands',
    keywordsUpright: ['curiosity', 'a fresh start', 'declaring it', 'unpolished energy'],
    keywordsReversed: ['fizzling out', 'all announcement', 'restlessness', 'inexperience showing'],
    meaningUpright:
      'Newness with real appetite behind it. Unskilled and undeterred, which at this stage is the correct combination.',
    meaningReversed:
      'Reversed, the enthusiasm keeps arriving and not converting. Announcing counts as progress for a while, then it does not.',
    love: {
      upright: 'Fresh interest, openly shown. Directness is the charm here.',
      reversed: 'Interest that moves on quickly. Note the pattern rather than the instance.',
    },
    career: {
      upright: 'Take the entry-level version of the thing you actually want to do.',
      reversed: 'Impatience with the beginner stage is the main obstacle.',
    },
    study: {
      upright: 'Follow the curiosity, even if the topic looks unstrategic.',
      reversed: 'Beginning again is not the same as progressing.',
    },
    finance: {
      upright: 'A small, contained experiment is appropriate.',
      reversed: 'Acting on a tip without understanding the mechanism.',
    },
    advice: {
      upright: 'Start badly. The skill comes after the starting.',
      reversed: 'Finish one thing before announcing the next.',
    },
    symbols: ['the sprouting wand', 'the salamander pattern', 'the open desert', 'the raised gaze'],
  },

  'wands-12': {
    name: 'Knight of Wands',
    keywordsUpright: ['charge', 'boldness', 'movement', 'conviction in motion'],
    keywordsReversed: ['recklessness', 'burning out', 'inconsistency', 'unfinished charges'],
    meaningUpright:
      'Full commitment at speed. Effective at breaking inertia, expensive if the direction was wrong.',
    meaningReversed:
      'Reversed, the speed has come loose from the aim, and the trail behind is a series of unfinished starts.',
    love: {
      upright: 'Intense and fast-moving. Enjoyable; check whether it is sustainable.',
      reversed: 'Hot then absent. The inconsistency is the information.',
    },
    career: {
      upright: 'Good for breaking a stalemate. Assign someone else the follow-through.',
      reversed: 'Starting the next initiative before the last one shipped.',
    },
    study: {
      upright: 'Intensive bursts work here. Schedule the consolidation too.',
      reversed: 'Speed without review means the same errors get faster.',
    },
    finance: {
      upright: 'Decisive action can pay off. Size it so being wrong is survivable.',
      reversed: 'Impulse decisions are compounding. Introduce a waiting rule.',
    },
    advice: {
      upright: 'Move, but write down what would tell you to stop.',
      reversed: 'Finish one thing all the way through, for the practice of it.',
    },
    symbols: ['the rearing horse', 'the plume', 'the desert', 'the forward lean'],
  },

  'wands-13': {
    name: 'Queen of Wands',
    keywordsUpright: ['warm authority', 'self-possession', 'drawing people in', 'steady heat'],
    keywordsReversed: ['insecurity behind confidence', 'brittleness', 'over-extension', 'comparison'],
    meaningUpright:
      'Confidence that does not need to be loud. Warmth and clarity together, holding a room without dominating it.',
    meaningReversed:
      'Reversed, the outward assurance is running on something depleted, and comparison has crept in underneath it.',
    love: {
      upright: 'Being fully yourself is what is working. Do not tone it down.',
      reversed: 'Needing constant reassurance is coming from somewhere older than this relationship.',
    },
    career: {
      upright: 'Lead by presence rather than process. People follow the certainty.',
      reversed: 'Taking on more to prove something. Check what is being proven and to whom.',
    },
    study: {
      upright: 'Teaching it to someone else will consolidate it fastest.',
      reversed: 'Comparing your progress with others is doing measurable damage.',
    },
    finance: {
      upright: 'Confident, well-judged decisions. Trust the read.',
      reversed: 'Spending to maintain an image is a real line item. Name it.',
    },
    advice: {
      upright: 'Say what you think, in your own register.',
      reversed: 'Refill before performing. The warmth needs a source.',
    },
    symbols: ['the sunflower', 'the black cat', 'the lion throne', 'the open posture'],
  },

  'wands-14': {
    name: 'King of Wands',
    keywordsUpright: ['vision', 'command', 'entrepreneurship', 'setting direction'],
    keywordsReversed: ['imperious', 'impatient with detail', 'grandstanding', 'directionless authority'],
    meaningUpright:
      'The long view plus the willingness to commit resources to it. Leadership here is about naming the direction and standing behind it.',
    meaningReversed:
      'Reversed, the authority has outgrown the listening, or the vision keeps changing before anyone can execute it.',
    love: {
      upright: 'Take the lead openly and leave room for the other person to answer.',
      reversed: 'Deciding for both of you is being experienced as being decided about.',
    },
    career: {
      upright: 'Set the direction and delegate the execution. Both halves matter.',
      reversed: 'Impatience with the detail is generating rework downstream.',
    },
    study: {
      upright: 'Define the goal, then work backwards to the weekly plan.',
      reversed: 'Changing the goal is why the plan never gets tested.',
    },
    finance: {
      upright: 'Strategic, longer-horizon decisions suit this position.',
      reversed: 'Big-picture confidence is skipping over the arithmetic.',
    },
    advice: {
      upright: 'Say where you are going, then hold it long enough to be tested.',
      reversed: 'Ask one person what they would change, and actually listen.',
    },
    symbols: ['the salamander throne', 'the sprouting sceptre', 'the lizard at his feet', 'the turned head'],
  },
}
