/** English card text · Cups (Water — feeling, relationship, inner life). Voice rules: see ./major.ts */

import type { CardText } from '../../localized'

export const cupsEn: Record<string, CardText> = {
  'cups-01': {
    name: 'Ace of Cups',
    keywordsUpright: ['an opening feeling', 'receptivity', 'a fresh source', 'tenderness'],
    keywordsReversed: ['held back', 'blocked feeling', 'emptied out', 'pouring away'],
    meaningUpright:
      'Something has opened emotionally and there is more available than usual. The card describes capacity, not yet a relationship.',
    meaningReversed:
      'Reversed, the feeling is present but not moving — held back, or given out faster than it is replaced.',
    love: {
      upright: 'A genuine opening. Saying the soft thing costs less right now than it usually does.',
      reversed: 'Feeling is there and the words are not. That gap is the whole problem.',
    },
    career: {
      upright: 'Work that involves care or creativity has real energy behind it now.',
      reversed: 'Emotional investment in the work is not being returned. Notice the balance.',
    },
    study: {
      upright: 'Learning something you actually care about will move quickly.',
      reversed: 'Interest has drained out. Find what originally drew you.',
    },
    finance: {
      upright: 'Generosity is easy now. Set the amount before, not during.',
      reversed: 'Spending to fill something. Name the something.',
    },
    advice: {
      upright: 'Let the feeling arrive before analysing it.',
      reversed: 'Say one true thing to one person.',
    },
    symbols: ['the overflowing cup', 'the descending dove', 'five streams', 'water lilies'],
  },

  'cups-02': {
    name: 'Two of Cups',
    keywordsUpright: ['mutual regard', 'a pact between two', 'meeting as equals', 'exchange'],
    keywordsReversed: ['imbalance', 'a broken understanding', 'misalignment', 'withdrawal'],
    meaningUpright:
      'Two parties facing each other on level terms. What matters here is the mutuality, not the intensity.',
    meaningReversed:
      'Reversed, the exchange is uneven — one side is giving more, or the two are no longer facing the same way.',
    love: {
      upright: 'A real meeting. Substance, not just chemistry.',
      reversed: 'The effort is lopsided. Say it plainly before it becomes resentment.',
    },
    career: {
      upright: 'A partnership or collaboration on equal terms is worth forming.',
      reversed: 'An agreement is being interpreted differently by each side. Write it down.',
    },
    study: {
      upright: 'A study partner will help more than another resource.',
      reversed: 'A pairing where one person carries the work is teaching them, not you.',
    },
    finance: {
      upright: 'A shared arrangement is workable if the terms are explicit.',
      reversed: 'Money between two people needs stating before it needs settling.',
    },
    advice: {
      upright: 'Check that both sides want the same thing, not just that both are willing.',
      reversed: 'Name the imbalance while it is still small.',
    },
    symbols: ['two raised cups', 'the caduceus', 'the winged lion', 'the level ground'],
  },

  'cups-03': {
    name: 'Three of Cups',
    keywordsUpright: ['shared joy', 'friendship', 'a gathering', 'being carried by others'],
    keywordsReversed: ['too much of a good thing', 'a third party', 'thinned friendships', 'isolation'],
    meaningUpright:
      'People around you, and support that is easy rather than negotiated. Worth using and worth acknowledging.',
    meaningReversed:
      'Reversed can be a social pattern that has stopped nourishing, or a third presence complicating a pair.',
    love: {
      upright: 'The relationship benefits from the people around it. Include them.',
      reversed: 'Something outside the two of you is taking up room inside it.',
    },
    career: {
      upright: 'Collaboration is producing more than the sum of the parts.',
      reversed: 'The team is social but not productive. Separate the two functions.',
    },
    study: {
      upright: 'A group is genuinely helping. Keep it.',
      reversed: 'The study group has become mostly the group.',
    },
    finance: {
      upright: 'Shared costs and shared benefits are working out.',
      reversed: 'Social spending has crept past the plan.',
    },
    advice: {
      upright: 'Ask for help. It will be given more readily than you expect.',
      reversed: 'Check who you actually want to see, versus who you habitually see.',
    },
    symbols: ['three raised cups', 'the harvest', 'the linked circle', 'the fruit underfoot'],
  },

  'cups-04': {
    name: 'Four of Cups',
    keywordsUpright: ['discontent', 'looking past what is offered', 'flatness', 'withdrawal inward'],
    keywordsReversed: ['looking up again', 'accepting the offer', 'restlessness lifting', 'renewed interest'],
    meaningUpright:
      'Something is being offered and not seen, because attention is on what is missing. The flatness is real; so is the offer.',
    meaningReversed:
      'Reversed, the attention is returning outward. What was invisible last month becomes obvious.',
    love: {
      upright: 'Taking the relationship for granted, without anything being wrong with it.',
      reversed: 'Re-engaging. Notice what is already there before looking further.',
    },
    career: {
      upright: 'Boredom with a role that is objectively fine. Both facts are true.',
      reversed: 'An opportunity you dismissed deserves a second look.',
    },
    study: {
      upright: 'Motivation has flattened. Change the format, not the subject.',
      reversed: 'Interest is coming back. Rebuild the habit while it does.',
    },
    finance: {
      upright: 'A stable position that feels dull is still a stable position.',
      reversed: 'An option previously ignored may be the practical one.',
    },
    advice: {
      upright: 'List what is already in front of you before looking for more.',
      reversed: 'Say yes to one thing you have been passing over.',
    },
    symbols: ['the offered cup', 'three cups already there', 'the crossed arms', 'the tree'],
  },

  'cups-05': {
    name: 'Five of Cups',
    keywordsUpright: ['loss', 'grief', 'attention on what spilled', 'regret'],
    keywordsReversed: ['turning around', 'acceptance beginning', 'recovery', 'still not turning'],
    meaningUpright:
      'Something has been lost and the loss deserves its space. It is also true that not everything spilled — that part is simply behind you at the moment.',
    meaningReversed:
      'Reversed usually means the head is starting to turn. The remaining cups become visible.',
    love: {
      upright: 'Grief about how it went. Feel it before deciding anything.',
      reversed: 'Beginning to see what survived. Do not rush this either.',
    },
    career: {
      upright: 'A setback that is genuinely a setback. Do not talk yourself out of the disappointment.',
      reversed: 'What remains is more usable than it looked last week.',
    },
    study: {
      upright: 'A poor result. Sit with it, then extract the one usable lesson.',
      reversed: 'Ready to start again. Start smaller than before.',
    },
    finance: {
      upright: 'A loss has happened. Stabilise before optimising.',
      reversed: 'Recoverable. Count what is left, accurately.',
    },
    advice: {
      upright: 'Let it be a loss. Reframing too early does not work.',
      reversed: 'Turn around and count the cups still standing.',
    },
    symbols: ['three cups spilled', 'two still standing', 'the black cloak', 'the bridge behind'],
  },

  'cups-06': {
    name: 'Six of Cups',
    keywordsUpright: ['memory', 'innocence', 'something returning', 'simple kindness'],
    keywordsReversed: ['stuck in the past', 'nostalgia as escape', 'moving on', 'idealised memory'],
    meaningUpright:
      'The past coming back in a benign form: an old contact, an old habit, a simpler way of doing something.',
    meaningReversed:
      'Reversed, the past has become a place to live rather than to visit — or the memory has been edited kinder than the event.',
    love: {
      upright: 'Something from earlier resurfaces. Meet it as it is now, not as it was.',
      reversed: 'Comparing the present against an improved version of the past.',
    },
    career: {
      upright: 'An old contact or old skill becomes relevant again.',
      reversed: 'The way it used to be done is not why it worked.',
    },
    study: {
      upright: 'Revisiting fundamentals will unlock the advanced material.',
      reversed: 'Rereading what you already know is comfortable, not progress.',
    },
    finance: {
      upright: 'Something set aside earlier proves useful now.',
      reversed: 'An old arrangement has quietly outlived its terms.',
    },
    advice: {
      upright: 'Bring one simple old practice back.',
      reversed: 'Check the memory against the record before acting on it.',
    },
    symbols: ['the offered flower', 'the walled garden', 'two small figures', 'the filled cups'],
  },

  'cups-07': {
    name: 'Seven of Cups',
    keywordsUpright: ['many options', 'imagination', 'unclear priority', 'projection'],
    keywordsReversed: ['choosing one', 'clarity returning', 'disillusion', 'still drifting'],
    meaningUpright:
      'Several attractive possibilities, most of them still images rather than plans. The abundance itself is what prevents choosing.',
    meaningReversed:
      'Reversed, the options are being tested against reality. Some collapse, and that is the useful part.',
    love: {
      upright: 'What you picture and what is in front of you may not be the same person.',
      reversed: 'Seeing them accurately. That is a beginning, not a loss.',
    },
    career: {
      upright: 'Too many appealing directions. Cost each one out.',
      reversed: 'One path becomes clearly the practical one. Take it.',
    },
    study: {
      upright: 'Many subjects, no depth. Pick the one you can carry.',
      reversed: 'The realistic scope is smaller than the plan. Adjust the plan.',
    },
    finance: {
      upright: 'Offers that look good in outline. Ask for the mechanics.',
      reversed: 'One option survives scrutiny. That is the answer.',
    },
    advice: {
      upright: 'Write each option as a next-week action. Most will not survive that.',
      reversed: 'Commit to the one that is still standing.',
    },
    symbols: ['seven cups in cloud', 'the shrouded figure', 'the dark silhouette', 'the tower and the wreath'],
  },

  'cups-08': {
    name: 'Eight of Cups',
    keywordsUpright: ['walking away', 'a deliberate departure', 'seeking meaning', 'leaving what works'],
    keywordsReversed: ['unable to leave', 'returning', 'aimless drifting', 'the departure delayed'],
    meaningUpright:
      'Leaving something that is not broken because it is no longer enough. This is a considered departure, not an escape.',
    meaningReversed:
      'Reversed, the decision to go keeps being postponed, or the leaving has no destination attached to it.',
    love: {
      upright: 'Something is finished for you even though nothing went wrong. That is allowed.',
      reversed: 'Leaving and returning repeatedly is harder on both of you than either choice.',
    },
    career: {
      upright: 'A good job that is no longer the right one. Both parts are true.',
      reversed: 'Waiting for a reason to leave that is bad enough to justify it.',
    },
    study: {
      upright: 'Set down the subject that no longer leads anywhere for you.',
      reversed: 'Quitting without a next direction usually turns into returning.',
    },
    finance: {
      upright: 'Exit a position that is adequate but going nowhere.',
      reversed: 'Staying because leaving requires paperwork.',
    },
    advice: {
      upright: 'You may leave a good thing. It does not need to become bad first.',
      reversed: 'Decide where you are going before deciding to go.',
    },
    symbols: ['eight cups left standing', 'the departing figure', 'the moon above', 'the stony path'],
  },

  'cups-09': {
    name: 'Nine of Cups',
    keywordsUpright: ['satisfaction', 'getting what you asked for', 'comfort', 'sufficiency'],
    keywordsReversed: ['hollow satisfaction', 'wanting more', 'indulgence', 'the wrong wish'],
    meaningUpright:
      'A wish has come through and the situation is comfortable. Worth noticing and worth enjoying, because it will not stay novel.',
    meaningReversed:
      'Reversed, what was obtained has not produced what it was supposed to produce. Worth asking what was actually wanted.',
    love: {
      upright: 'Contentment. Say it out loud rather than saving it.',
      reversed: 'Getting the relationship you described and finding it does not fit.',
    },
    career: {
      upright: 'The role delivers what you asked for. Enjoy it, then set the next question.',
      reversed: 'The promotion did not fix what you thought it would.',
    },
    study: {
      upright: 'Real progress. Mark it before moving on.',
      reversed: 'Chasing credentials rather than capability.',
    },
    finance: {
      upright: 'Comfortable. Convert some of it into something durable.',
      reversed: 'Comfort spending has become the default setting.',
    },
    advice: {
      upright: 'Stop and register that this is good. That is the whole instruction.',
      reversed: 'Ask what you actually wanted underneath what you asked for.',
    },
    symbols: ['the curved table', 'nine cups in a row', 'the folded arms', 'the blue drape'],
  },

  'cups-10': {
    name: 'Ten of Cups',
    keywordsUpright: ['shared wholeness', 'belonging', 'harmony', 'the long view of a bond'],
    keywordsReversed: ['a picture that does not match', 'strain at home', 'chasing an ideal', 'quiet distance'],
    meaningUpright:
      'Not a peak moment but a settled one: a relationship or a household that works over time. Ordinary, and rare.',
    meaningReversed:
      'Reversed, the outward picture and the inward experience have separated — or the ideal being chased belongs to someone else.',
    love: {
      upright: 'Long-term compatibility, visible in the everyday rather than the dramatic.',
      reversed: 'Performing the family picture is costing more than it returns.',
    },
    career: {
      upright: 'The work fits the life. That is worth protecting explicitly.',
      reversed: 'The job and the life you want are not currently the same shape.',
    },
    study: {
      upright: 'What you are learning fits where you are going. Keep going.',
      reversed: 'Studying toward someone else\'s idea of a good outcome.',
    },
    finance: {
      upright: 'Household finances are aligned. Formalise it while it is easy.',
      reversed: 'Financial strain is showing up as domestic friction.',
    },
    advice: {
      upright: 'Protect the ordinary arrangement that is working.',
      reversed: 'Ask whose picture of a good life you are measuring against.',
    },
    symbols: ['the rainbow of cups', 'the small house', 'the two children', 'the river'],
  },

  'cups-11': {
    name: 'Page of Cups',
    keywordsUpright: ['a tender beginning', 'openness', 'an unexpected feeling', 'imagination'],
    keywordsReversed: ['emotional immaturity', 'over-sensitivity', 'a feeling withheld', 'daydreaming'],
    meaningUpright:
      'A small, unguarded emotional opening. Inexperienced and sincere, and worth handling gently.',
    meaningReversed:
      'Reversed, the feeling is arriving without a way to express it, or reactions are outrunning the events causing them.',
    love: {
      upright: 'Something new and not yet defined. Let it stay undefined a while.',
      reversed: 'Feelings are being managed rather than shared.',
    },
    career: {
      upright: 'A creative idea worth voicing even in rough form.',
      reversed: 'Taking feedback personally is costing information.',
    },
    study: {
      upright: 'Curiosity in a soft subject. Follow it without needing a use case.',
      reversed: 'Imagining the outcome rather than doing the work.',
    },
    finance: {
      upright: 'A small unexpected gain or gift.',
      reversed: 'Emotion is doing the deciding. Add a day between wanting and buying.',
    },
    advice: {
      upright: 'Say the small sincere thing.',
      reversed: 'Name what you feel before explaining why.',
    },
    symbols: ['the fish in the cup', 'the flowered tunic', 'the moving sea', 'the surprised look'],
  },

  'cups-12': {
    name: 'Knight of Cups',
    keywordsUpright: ['an offer', 'romance', 'following feeling', 'the approach'],
    keywordsReversed: ['unreliable charm', 'moodiness', 'promise without delivery', 'idealising'],
    meaningUpright:
      'Someone arriving with an offer, or you being the one who arrives. Sincere, deliberate, and led by feeling rather than plan.',
    meaningReversed:
      'Reversed, the gesture is not matched by the follow-through, or the picture being pursued is nicer than the situation.',
    love: {
      upright: 'An invitation, made properly. Answer it properly.',
      reversed: 'The words are lovely and the pattern is inconsistent. Read the pattern.',
    },
    career: {
      upright: 'An approach or a proposal worth entertaining.',
      reversed: 'A pitch heavy on vision and light on the schedule.',
    },
    study: {
      upright: 'Learning driven by love of the subject will go furthest here.',
      reversed: 'Enthusiasm keeps replacing the timetable.',
    },
    finance: {
      upright: 'A proposal arrives. Take it seriously and check it thoroughly.',
      reversed: 'Promised returns without a mechanism. Ask twice.',
    },
    advice: {
      upright: 'Make the offer. Being direct is the point of this card.',
      reversed: 'Compare what was said last month with what happened.',
    },
    symbols: ['the winged helm', 'the raised cup', 'the walking horse', 'the small river'],
  },

  'cups-13': {
    name: 'Queen of Cups',
    keywordsUpright: ['attunement', 'holding space', 'depth', 'compassion with boundaries'],
    keywordsReversed: ['absorbing everything', 'losing the edge', 'over-identifying', 'shut down'],
    meaningUpright:
      'Reading the emotional situation accurately and staying steady inside it. The skill is depth without being swept.',
    meaningReversed:
      'Reversed, other people\'s states are being carried as if they were yours, or the door has been closed to avoid that.',
    love: {
      upright: 'Understanding is the strength here. Offer it without erasing yourself.',
      reversed: 'Managing their feelings has replaced having your own.',
    },
    career: {
      upright: 'Reading the room correctly is the advantage. Use it deliberately.',
      reversed: 'Emotional labour is being done and not counted.',
    },
    study: {
      upright: 'Intuitive grasp is ahead of formal explanation. Both will arrive.',
      reversed: 'Mood is dictating the schedule. Set a floor, not a ceiling.',
    },
    finance: {
      upright: 'Instinct about people is reliable here. Instinct about numbers still needs checking.',
      reversed: 'Lending because it is hard to say no.',
    },
    advice: {
      upright: 'Trust the read, and say it out loud.',
      reversed: 'Return the feelings that are not yours.',
    },
    symbols: ['the closed cup', 'the shell throne', 'the pebbled shore', 'the still gaze'],
  },

  'cups-14': {
    name: 'King of Cups',
    keywordsUpright: ['steadiness in feeling', 'containment', 'mature care', 'calm under pressure'],
    keywordsReversed: ['suppression', 'cold control', 'volatility beneath', 'manipulation by mood'],
    meaningUpright:
      'Strong feeling held without being flooded by it. This is composure that has been earned rather than performed.',
    meaningReversed:
      'Reversed, the calm is a lid rather than a capacity, and what is underneath governs anyway.',
    love: {
      upright: 'Steady presence is what the relationship needs. Provide it and ask for it.',
      reversed: 'Withholding feeling as a way of holding position.',
    },
    career: {
      upright: 'Stay level while others do not. That is the contribution right now.',
      reversed: 'Controlled tone masking unresolved conflict.',
    },
    study: {
      upright: 'Consistency through the dull stretch is the whole method.',
      reversed: 'Suppressing frustration until it decides to quit for you.',
    },
    finance: {
      upright: 'Decisions made calmly and held through noise.',
      reversed: 'Avoiding the conversation about money is not the same as being reasonable.',
    },
    advice: {
      upright: 'Feel it and still decide. Both, not either.',
      reversed: 'Say the thing you are being calm instead of saying.',
    },
    symbols: ['the throne on water', 'the fish pendant', 'the ship behind', 'the level cup'],
  },
}
