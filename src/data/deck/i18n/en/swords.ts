/** English card text · Swords (Air — thought, language, conflict). Voice rules: see ./major.ts */

import type { CardText } from '../../localized'

export const swordsEn: Record<string, CardText> = {
  'swords-01': {
    name: 'Ace of Swords',
    keywordsUpright: ['clarity', 'a decision made', 'cutting through', 'naming it'],
    keywordsReversed: ['confusion', 'a sharp word', 'clarity misused', 'unclear terms'],
    meaningUpright:
      'A cut that separates what is true from what is merely believed. The relief of this card comes from precision, not from comfort.',
    meaningReversed:
      'Reversed, the same edge is turned the wrong way: cutting where it does not help, or a decision made on a confused premise.',
    love: {
      upright: 'Say the plain version. Ambiguity is what is causing the damage.',
      reversed: 'Being right is being chosen over being understood.',
    },
    career: {
      upright: 'The core problem can be named now. Name it in one sentence.',
      reversed: 'A directive that sounds decisive and is not actually clear.',
    },
    study: {
      upright: 'A concept clicks into place. Write the definition down immediately.',
      reversed: 'A misunderstanding at the base is propagating upward.',
    },
    finance: {
      upright: 'Read the terms and state them back in your own words.',
      reversed: 'The contract says something other than what you were told.',
    },
    advice: {
      upright: 'Reduce it to one sentence. If you cannot, you do not have it yet.',
      reversed: 'Check the premise before sharpening the argument.',
    },
    symbols: ['the upright sword', 'the crown', 'the olive and palm', 'the bare peaks'],
  },

  'swords-02': {
    name: 'Two of Swords',
    keywordsUpright: ['a stalemate', 'refusing to look', 'balanced options', 'suspended decision'],
    keywordsReversed: ['the blindfold coming off', 'information arriving', 'forced choice', 'still stuck'],
    meaningUpright:
      'A decision held in balance by not looking at it. The balance is maintained by the blindfold, not by the facts.',
    meaningReversed:
      'Reversed, the information is arriving whether or not it was wanted, and the balance will not hold.',
    love: {
      upright: 'Avoiding a conversation both of you know is due.',
      reversed: 'Something has been said or seen. Respond to it.',
    },
    career: {
      upright: 'Two options are being kept open because choosing means losing one.',
      reversed: 'The choice is being made by delay. Make it deliberately instead.',
    },
    study: {
      upright: 'Deciding what not to study is the blocked decision.',
      reversed: 'The result has decided for you. Use it.',
    },
    finance: {
      upright: 'Not looking at the balance keeps the anxiety exactly where it is.',
      reversed: 'Now that the number is visible, it is workable.',
    },
    advice: {
      upright: 'Take the blindfold off first. Then decide.',
      reversed: 'Decide before circumstances decide.',
    },
    symbols: ['the blindfold', 'crossed swords', 'the water behind', 'the moon'],
  },

  'swords-03': {
    name: 'Three of Swords',
    keywordsUpright: ['a clean hurt', 'painful truth', 'separation', 'grief that is specific'],
    keywordsReversed: ['healing beginning', 'holding the wound open', 'release', 'residual ache'],
    meaningUpright:
      'Something true and painful has been said or seen. The clarity and the pain arrive together and cannot be separated.',
    meaningReversed:
      'Reversed, recovery is underway — or the wound is being kept open because closing it means accepting it.',
    love: {
      upright: 'A hurt that is real. It is not made smaller by being explained.',
      reversed: 'Healing, unevenly. Retelling it keeps restarting the clock.',
    },
    career: {
      upright: 'Difficult feedback that is accurate. Both facts hold.',
      reversed: 'The criticism has been absorbed. Stop re-reading it.',
    },
    study: {
      upright: 'A result that hurts and is informative. Take the second part.',
      reversed: 'Ready to try again. Do not rebuild on the old shame.',
    },
    finance: {
      upright: 'A loss with a clear cause. Write the cause down.',
      reversed: 'Recovering. Rebuild the buffer before anything else.',
    },
    advice: {
      upright: 'Let it hurt for the length it needs, not longer and not shorter.',
      reversed: 'Stop retelling it. That is the step.',
    },
    symbols: ['the pierced heart', 'three swords', 'the rain', 'the grey sky'],
  },

  'swords-04': {
    name: 'Four of Swords',
    keywordsUpright: ['rest', 'withdrawal to recover', 'a pause', 'quiet'],
    keywordsReversed: ['restlessness', 'returning too soon', 'forced stop', 'rest refused'],
    meaningUpright:
      'A deliberate stop. Nothing is being solved during it, and that is what makes it work.',
    meaningReversed:
      'Reversed, the rest is not being taken, or it is being interrupted before it does anything.',
    love: {
      upright: 'Space, agreed rather than taken silently.',
      reversed: 'Coming back to the conversation before either of you has cooled.',
    },
    career: {
      upright: 'Step out for a period. The problem will be clearer from outside it.',
      reversed: 'Returning at half capacity produces work that has to be redone.',
    },
    study: {
      upright: 'Consolidation happens during the break, not during the session.',
      reversed: 'Studying while depleted is filling in time, not learning.',
    },
    finance: {
      upright: 'A quiet period. Do not force a move.',
      reversed: 'Acting out of restlessness rather than analysis.',
    },
    advice: {
      upright: 'Stop properly. Half-stopping gives neither rest nor progress.',
      reversed: 'Book the rest like an obligation, because it is one.',
    },
    symbols: ['the recumbent figure', 'three swords above', 'one sword below', 'the stained glass'],
  },

  'swords-05': {
    name: 'Five of Swords',
    keywordsUpright: ['winning at a cost', 'hollow victory', 'conflict badly resolved', 'the leftover'],
    keywordsReversed: ['making amends', 'putting it down', 'lingering resentment', 'withdrawal'],
    meaningUpright:
      'The argument was won and something else was spent doing it. Worth checking whether the win was the objective.',
    meaningReversed:
      'Reversed, there is an opening to repair — or the residue is being carried long after the dispute ended.',
    love: {
      upright: 'Being right has cost more than the point was worth.',
      reversed: 'An apology is available and it is not weakness.',
    },
    career: {
      upright: 'A win that damaged the working relationship. Count both.',
      reversed: 'Repair the relationship before the next thing needs it.',
    },
    study: {
      upright: 'Competing has replaced learning.',
      reversed: 'Let the comparison go. It is not producing anything.',
    },
    finance: {
      upright: 'Squeezing the last term out of a deal may cost the next one.',
      reversed: 'Renegotiating in good faith is still possible.',
    },
    advice: {
      upright: 'Ask what winning this gets you, concretely.',
      reversed: 'Say the repairing sentence first. It costs almost nothing.',
    },
    symbols: ['three swords held', 'two on the ground', 'the departing figures', 'the ragged sky'],
  },

  'swords-06': {
    name: 'Six of Swords',
    keywordsUpright: ['moving away', 'transition', 'calmer water ahead', 'carrying it with you'],
    keywordsReversed: ['unable to leave', 'the same trouble followed', 'a delayed crossing', 'returning'],
    meaningUpright:
      'A move away from difficulty, not dramatic and not complete. The swords are in the boat — the situation improves, the memory travels too.',
    meaningReversed:
      'Reversed, the crossing keeps being postponed, or the same pattern reassembles on the other shore.',
    love: {
      upright: 'Moving on quietly. The absence of drama is the good sign.',
      reversed: 'Bringing the previous relationship into this one.',
    },
    career: {
      upright: 'A transition into steadier conditions. Let it be gradual.',
      reversed: 'The new role has the same problem as the old one. Look at the constant.',
    },
    study: {
      upright: 'Past the hardest section. It gets more navigable from here.',
      reversed: 'The same blocking habit has come along to the new subject.',
    },
    finance: {
      upright: 'Out of the pressured period. Rebuild slowly.',
      reversed: 'The same spending pattern is reassembling.',
    },
    advice: {
      upright: 'Move without needing the departure to be clean.',
      reversed: 'Identify what you keep bringing with you.',
    },
    symbols: ['the ferryman', 'six upright swords', 'the still water ahead', 'the choppy water behind'],
  },

  'swords-07': {
    name: 'Seven of Swords',
    keywordsUpright: ['working around', 'partial disclosure', 'strategy', 'taking what you can'],
    keywordsReversed: ['found out', 'coming clean', 'self-deception', 'returning what was taken'],
    meaningUpright:
      'Getting something done by going around rather than through. Sometimes shrewd, sometimes just avoidance with a plan.',
    meaningReversed:
      'Reversed, the workaround has been noticed — or the person being misled is you.',
    love: {
      upright: 'Something is being kept back. It does not have to be malicious to be corrosive.',
      reversed: 'Saying it now costs far less than saying it later.',
    },
    career: {
      upright: 'A workaround is achieving the result and accumulating debt.',
      reversed: 'The shortcut has surfaced. Handle it directly and early.',
    },
    study: {
      upright: 'Optimising for the assessment rather than the understanding.',
      reversed: 'The gap between the grade and the ability is becoming visible.',
    },
    finance: {
      upright: 'An arrangement that works only if nobody examines it.',
      reversed: 'Regularise it before someone else does.',
    },
    advice: {
      upright: 'Ask whether this is clever or just easier.',
      reversed: 'Disclose it yourself. The timing is the only variable you still control.',
    },
    symbols: ['five swords carried', 'two left behind', 'the tents', 'the backward glance'],
  },

  'swords-08': {
    name: 'Eight of Swords',
    keywordsUpright: ['feeling trapped', 'self-imposed limits', 'a narrowed view', 'paralysis'],
    keywordsReversed: ['seeing the gap', 'freeing yourself', 'the limits still believed', 'first movement'],
    meaningUpright:
      'Bound and blindfolded, with more room than it feels like. The constraint is real; it is also less complete than the position suggests.',
    meaningReversed:
      'Reversed, the blindfold slips. What looked like a wall turns out to have a gap in it.',
    love: {
      upright: 'Feeling you cannot say it. Check whether that is true or assumed.',
      reversed: 'One honest sentence would change the shape of this.',
    },
    career: {
      upright: 'Feeling stuck in a role. List the actual, not the imagined, constraints.',
      reversed: 'One option you had ruled out is still available.',
    },
    study: {
      upright: '"I can\'t do this subject" is a belief being treated as data.',
      reversed: 'A small success breaks the assumption. Get one.',
    },
    finance: {
      upright: 'The situation feels immovable. Write the actual numbers.',
      reversed: 'There is more room than the anxiety suggests.',
    },
    advice: {
      upright: 'Write what you believe you cannot do, then test one item.',
      reversed: 'Take the smallest possible step. It disproves the wall.',
    },
    symbols: ['the loose bindings', 'eight swords around', 'the muddy ground', 'the castle above'],
  },

  'swords-09': {
    name: 'Nine of Swords',
    keywordsUpright: ['night anxiety', 'rumination', 'dread larger than the event', 'sleeplessness'],
    keywordsReversed: ['first light', 'saying it aloud', 'the fear examined', 'still spiralling'],
    meaningUpright:
      'The three-in-the-morning version of a problem. The distress is genuine; the scale of it belongs to the hour, not to the facts.',
    meaningReversed:
      'Reversed, the worry is beginning to be examined in daylight, where it usually shrinks.',
    love: {
      upright: 'Imagining the conversation is worse than having it.',
      reversed: 'Saying the fear out loud takes most of the weight off it.',
    },
    career: {
      upright: 'Anticipating a judgement that has not been made.',
      reversed: 'Checking the real situation deflates most of the worry.',
    },
    study: {
      upright: 'Anxiety about the exam is consuming study time.',
      reversed: 'Write down what you actually do and do not know.',
    },
    finance: {
      upright: 'The dread is not proportional to the number. Look at the number.',
      reversed: 'Once written down, it becomes a task rather than a fear.',
    },
    advice: {
      upright: 'Do not make decisions at night. Write it down and read it at noon.',
      reversed: 'Tell one person the specific version.',
    },
    symbols: ['the figure sitting up', 'nine swords on the wall', 'the carved panel', 'the dark room'],
  },

  'swords-10': {
    name: 'Ten of Swords',
    keywordsUpright: ['the bottom', 'an ending that is total', 'the worst already happened', 'release'],
    keywordsReversed: ['getting up', 'slow recovery', 'dramatising it', 'the end delayed'],
    meaningUpright:
      'The thing has finished conclusively. There is a specific relief in the bottom: nothing further needs to be defended.',
    meaningReversed:
      'Reversed, standing up again — slowly, and usually before you feel ready to.',
    love: {
      upright: 'It is over. Treating it as over is the first useful act.',
      reversed: 'Recovery has begun. Do not audit its pace.',
    },
    career: {
      upright: 'A definite end. Stop rescuing it and start the next arrangement.',
      reversed: 'Back on your feet. Take the smaller version first.',
    },
    study: {
      upright: 'That approach has failed completely. Good — the question is settled.',
      reversed: 'Rebuild from fundamentals rather than from where you fell.',
    },
    finance: {
      upright: 'The loss has fully landed. Now it can be planned around.',
      reversed: 'Slow rebuilding. Consistency beats a recovery trade.',
    },
    advice: {
      upright: 'Stop defending it. It is finished, and that is usable.',
      reversed: 'Stand up before you feel like it. The feeling follows.',
    },
    symbols: ['ten swords in the back', 'the black sky', 'the still water', 'the light at the horizon'],
  },

  'swords-11': {
    name: 'Page of Swords',
    keywordsUpright: ['watchfulness', 'questions', 'quick learning', 'unfiltered directness'],
    keywordsReversed: ['gossip', 'suspicion', 'talking without knowing', 'scattered attention'],
    meaningUpright:
      'Alert, curious and not yet careful. Asking the obvious question is exactly the right move at this stage.',
    meaningReversed:
      'Reversed, the alertness has tipped into suspicion, or opinions are outrunning information.',
    love: {
      upright: 'Ask directly instead of interpreting.',
      reversed: 'Checking up on someone is corroding what it is meant to protect.',
    },
    career: {
      upright: 'Ask the question everyone assumes has an answer.',
      reversed: 'Second-hand information is being acted on as fact.',
    },
    study: {
      upright: 'Fast intake. Keep notes or it will not stick.',
      reversed: 'Skimming many sources without finishing one.',
    },
    finance: {
      upright: 'Investigate before committing. The questions are cheap.',
      reversed: 'Acting on something you heard rather than read.',
    },
    advice: {
      upright: 'Ask the naive question out loud.',
      reversed: 'Verify before repeating.',
    },
    symbols: ['the raised sword', 'the wind in the clouds', 'the turned head', 'the tense grass'],
  },

  'swords-12': {
    name: 'Knight of Swords',
    keywordsUpright: ['directness', 'fast argument', 'decisive push', 'urgency'],
    keywordsReversed: ['aggression', 'speaking before thinking', 'burnout', 'blunt force'],
    meaningUpright:
      'Straight at it, with the argument already loaded. Highly effective at cutting through, poor at leaving the room intact.',
    meaningReversed:
      'Reversed, the speed has become force, and the point is being won at the expense of the outcome.',
    love: {
      upright: 'Say it directly. Add one sentence about why it matters to you.',
      reversed: 'The delivery is undoing the content.',
    },
    career: {
      upright: 'Push the decision. Someone has to and it may as well be you.',
      reversed: 'Sending it before rereading it will cost more than the delay would.',
    },
    study: {
      upright: 'Intensive, aggressive coverage works — for a limited period.',
      reversed: 'Speed has replaced accuracy. Slow down one notch.',
    },
    finance: {
      upright: 'Decisive action on a clear analysis.',
      reversed: 'Reacting to news rather than to the plan.',
    },
    advice: {
      upright: 'Be direct and be brief.',
      reversed: 'Wait one hour. That is the whole intervention.',
    },
    symbols: ['the charging horse', 'the level sword', 'the bent trees', 'the driven clouds'],
  },

  'swords-13': {
    name: 'Queen of Swords',
    keywordsUpright: ['clear judgement', 'honesty', 'experience-earned perception', 'independence'],
    keywordsReversed: ['coldness', 'cynicism', 'harshness', 'defending with wit'],
    meaningUpright:
      'Sees the situation accurately and says so without decoration. The clarity here came from having been wrong before.',
    meaningReversed:
      'Reversed, the accuracy has hardened into cynicism, and the sharpness is doing protective work rather than useful work.',
    love: {
      upright: 'Honesty offered with care is the register that works here.',
      reversed: 'Being unanswerable is not the same as being close.',
    },
    career: {
      upright: 'Give the assessment plainly. It is what you are actually valued for.',
      reversed: 'The critique lands harder than intended. Add the intent.',
    },
    study: {
      upright: 'Assess your own work honestly. That is the accelerator.',
      reversed: 'Self-criticism has passed the point of being informative.',
    },
    finance: {
      upright: 'Unsentimental analysis. Follow it.',
      reversed: 'Distrust of everything is also a bias.',
    },
    advice: {
      upright: 'Say the accurate thing, and say why you are saying it.',
      reversed: 'Check whether the edge is defending something.',
    },
    symbols: ['the upright sword', 'the extended hand', 'the cloud-carved throne', 'the single bird'],
  },

  'swords-14': {
    name: 'King of Swords',
    keywordsUpright: ['principled judgement', 'authority of reason', 'clear standards', 'objectivity'],
    keywordsReversed: ['rigid logic', 'judgement without context', 'cold power', 'rationalising'],
    meaningUpright:
      'Decisions made against stated principles rather than mood. Consistency is the source of the authority here.',
    meaningReversed:
      'Reversed, the principle has become a way to avoid the particulars — or reason is being used to justify a decision already made.',
    love: {
      upright: 'Set out what you think and invite disagreement.',
      reversed: 'Arguing well is not the same as being fair.',
    },
    career: {
      upright: 'Make the rule explicit and apply it consistently.',
      reversed: 'The framework is being applied to a case it does not fit.',
    },
    study: {
      upright: 'Build the mental model, then hang the details on it.',
      reversed: 'Theory without practice looks like understanding until it is tested.',
    },
    finance: {
      upright: 'A written policy will outperform judgement calls.',
      reversed: 'The analysis was built to support a conclusion you had already reached.',
    },
    advice: {
      upright: 'Write your decision rule before the decision.',
      reversed: 'Ask what would change your mind. If nothing, it is not reasoning.',
    },
    symbols: ['the stone throne', 'the butterflies', 'the raised sword', 'the still clouds'],
  },
}
