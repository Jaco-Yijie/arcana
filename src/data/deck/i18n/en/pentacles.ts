/** English card text · Pentacles (Earth — resources, body, the concrete). Voice rules: see ./major.ts */

import type { CardText } from '../../localized'

export const pentaclesEn: Record<string, CardText> = {
  'pentacles-01': {
    name: 'Ace of Pentacles',
    keywordsUpright: ['a concrete opening', 'a seed', 'material footing', 'a practical offer'],
    keywordsReversed: ['a missed opening', 'no follow-through', 'shaky footing', 'delayed start'],
    meaningUpright:
      'A tangible beginning: an offer, a resource, a first real foothold. Small and actual rather than large and possible.',
    meaningReversed:
      'Reversed, the opening exists and is not being taken up, or the ground under it is less solid than presented.',
    love: {
      upright: 'Something steady is starting. Let it build slowly.',
      reversed: 'Practical realities are being left out of the picture.',
    },
    career: {
      upright: 'A concrete opportunity. Take the first step this week.',
      reversed: 'An offer that stays vague past the point where it should be specific.',
    },
    study: {
      upright: 'Start with the applied version. It anchors everything after.',
      reversed: 'Preparing to start has replaced starting.',
    },
    finance: {
      upright: 'A new source or a first deposit. Set it up properly now.',
      reversed: 'The numbers behind the opportunity have not been shown.',
    },
    advice: {
      upright: 'Do the small physical version of it today.',
      reversed: 'Ask for the specifics before committing anything.',
    },
    symbols: ['the offered coin', 'the walled garden', 'the arched gate', 'the white lilies'],
  },

  'pentacles-02': {
    name: 'Two of Pentacles',
    keywordsUpright: ['juggling', 'flexibility', 'balancing demands', 'adapting'],
    keywordsReversed: ['dropping one', 'overcommitted', 'losing the rhythm', 'disorganised'],
    meaningUpright:
      'Two things being kept up at once, successfully, by staying in motion. It works while the rhythm holds.',
    meaningReversed:
      'Reversed, the rhythm has broken and something is about to be dropped — usually the quiet one.',
    love: {
      upright: 'Fitting the relationship around everything else. It is working, and it is effortful.',
      reversed: 'The relationship is the thing being dropped when the week gets full.',
    },
    career: {
      upright: 'Two roles or two projects held in balance. Keep the switching cost visible.',
      reversed: 'Context-switching is now the main expense. Sequence instead of parallelise.',
    },
    study: {
      upright: 'Studying alongside other obligations. Protect the smallest daily block.',
      reversed: 'Neither the study nor the other thing is getting full attention.',
    },
    finance: {
      upright: 'Cash flow is being managed actively. Keep a small buffer for the timing gaps.',
      reversed: 'Moving money to cover money. The pattern needs breaking, not managing.',
    },
    advice: {
      upright: 'Keep it moving, and write down what you are actually holding.',
      reversed: 'Choose which one to drop, rather than finding out.',
    },
    symbols: ['the infinity band', 'two coins', 'the rolling ships', 'the dancing stance'],
  },

  'pentacles-03': {
    name: 'Three of Pentacles',
    keywordsUpright: ['craft', 'collaboration', 'recognised skill', 'building to spec'],
    keywordsReversed: ['mismatched standards', 'unheard input', 'sloppy work', 'poor coordination'],
    meaningUpright:
      'Skilled work done with others who understand what is being built. The plan, the craft and the client are aligned.',
    meaningReversed:
      'Reversed, the parties are working to different standards, or the person with the skill is not being consulted.',
    love: {
      upright: 'Building something together, with each contribution visible.',
      reversed: 'Different ideas of what is being built. Compare them explicitly.',
    },
    career: {
      upright: 'Your specific craft is what is needed. Show the work.',
      reversed: 'Direction keeps changing after the work has begun.',
    },
    study: {
      upright: 'Practice with feedback from someone better is the accelerant.',
      reversed: 'Working alone means the errors keep getting reinforced.',
    },
    finance: {
      upright: 'Skill is convertible to income here. Price it properly.',
      reversed: 'Work delivered against an unclear brief is work delivered twice.',
    },
    advice: {
      upright: 'Agree the specification before building.',
      reversed: 'Get one review before going further.',
    },
    symbols: ['the stone arch', 'the mason\'s tools', 'the plan on the bench', 'three figures conferring'],
  },

  'pentacles-04': {
    name: 'Four of Pentacles',
    keywordsUpright: ['holding on', 'security', 'conserving', 'boundaries around resources'],
    keywordsReversed: ['grip loosening', 'hoarding', 'letting go', 'fear of loss'],
    meaningUpright:
      'Keeping tight hold of what you have. Sensible after scarcity, and it does restrict what can move.',
    meaningReversed:
      'Reversed, the grip is either loosening usefully or tightening past the point of usefulness.',
    love: {
      upright: 'Holding something back. Protective, and it limits the connection.',
      reversed: 'Opening up a little. Start with something small.',
    },
    career: {
      upright: 'Protecting your position. Check it is not also blocking your growth.',
      reversed: 'Holding information is costing you the role you want next.',
    },
    study: {
      upright: 'Consolidating what you know rather than adding to it. Valid for now.',
      reversed: 'Fear of looking uninformed is preventing the questions that would help.',
    },
    finance: {
      upright: 'Saving hard. Set a point where it converts into something.',
      reversed: 'Caution has become the only strategy, and it has its own cost.',
    },
    advice: {
      upright: 'Ask what the saving is for. Security without a purpose keeps growing.',
      reversed: 'Release one thing deliberately, and observe what happens.',
    },
    symbols: ['the clutched coin', 'the crown', 'coins underfoot', 'the city behind'],
  },

  'pentacles-05': {
    name: 'Five of Pentacles',
    keywordsUpright: ['shortage', 'exclusion', 'hardship', 'help unseen'],
    keywordsReversed: ['recovery', 'help accepted', 'coming inside', 'lingering scarcity'],
    meaningUpright:
      'A hard stretch, materially or in belonging. The lit window is right there and is not being looked at.',
    meaningReversed:
      'Reversed, conditions are improving, or the door is finally being used.',
    love: {
      upright: 'Feeling outside something. Say so rather than withdrawing further.',
      reversed: 'Support is available. Accepting it is the difficult part.',
    },
    career: {
      upright: 'A lean period. Ask for what is available rather than waiting to be offered it.',
      reversed: 'Things are picking up. Rebuild the reserve first.',
    },
    study: {
      upright: 'Lacking resources or support. Some of what you need is free and unasked for.',
      reversed: 'Help is arriving. Use it fully while it is there.',
    },
    finance: {
      upright: 'Genuine tightness. Prioritise ruthlessly and ask early.',
      reversed: 'Improving. Do not resume the old spending shape immediately.',
    },
    advice: {
      upright: 'Ask someone. The reluctance is costing more than the asking would.',
      reversed: 'Accept the offer as made, without discounting it.',
    },
    symbols: ['the lit window', 'the snow', 'two figures passing', 'the crutch'],
  },

  'pentacles-06': {
    name: 'Six of Pentacles',
    keywordsUpright: ['giving and receiving', 'measured generosity', 'balance of power', 'support'],
    keywordsReversed: ['strings attached', 'dependence', 'uneven exchange', 'giving to be owed'],
    meaningUpright:
      'Resources moving between people with the terms visible. The scales in the image matter as much as the coins.',
    meaningReversed:
      'Reversed, the exchange has conditions that were not stated, or the dependency has become structural.',
    love: {
      upright: 'Support flowing both ways over time, not necessarily in the same week.',
      reversed: 'One side is keeping an unspoken account.',
    },
    career: {
      upright: 'Mentoring, or being mentored. Both are useful here.',
      reversed: 'Help offered with an expectation attached. Clarify it.',
    },
    study: {
      upright: 'Teaching what you know consolidates it. Ask for help on the rest.',
      reversed: 'Reliance on one person has replaced building your own capability.',
    },
    finance: {
      upright: 'Lending or giving with explicit terms. Write them down even between friends.',
      reversed: 'An arrangement whose terms nobody wants to name.',
    },
    advice: {
      upright: 'State the terms out loud, including the generous ones.',
      reversed: 'Ask what is expected in return before accepting.',
    },
    symbols: ['the balance scales', 'the given coins', 'two kneeling figures', 'the merchant\'s robe'],
  },

  'pentacles-07': {
    name: 'Seven of Pentacles',
    keywordsUpright: ['waiting on growth', 'assessment', 'patience with investment', 'a pause to evaluate'],
    keywordsReversed: ['impatience', 'poor return', 'abandoning too early', 'sunk cost'],
    meaningUpright:
      'Stepping back to look at what has grown so far. Nothing is harvested yet; the question is whether to keep tending this crop.',
    meaningReversed:
      'Reversed, the return is not justifying the input — or it is, and impatience is about to end it early.',
    love: {
      upright: 'Take stock honestly. Effort and result are both measurable here.',
      reversed: 'Investing in something that has not moved in a long time.',
    },
    career: {
      upright: 'Assess the project against what it was supposed to produce.',
      reversed: 'The role has stopped compounding. Decide rather than drift.',
    },
    study: {
      upright: 'Progress is slower than the effort suggests, and it is still progress.',
      reversed: 'Judging results too early is the main obstacle to getting them.',
    },
    finance: {
      upright: 'Review the position. Reviewing is not the same as changing it.',
      reversed: 'Time to cut what has not performed, on the evidence not the mood.',
    },
    advice: {
      upright: 'Set a review date and a criterion, then stop checking.',
      reversed: 'Ask whether you would start this today, knowing what you know.',
    },
    symbols: ['the leaning figure', 'the loaded vine', 'the hoe', 'coins on the leaves'],
  },

  'pentacles-08': {
    name: 'Eight of Pentacles',
    keywordsUpright: ['practice', 'repetition', 'apprenticeship', 'improving the craft'],
    keywordsReversed: ['going through the motions', 'perfectionism', 'no feedback', 'losing interest'],
    meaningUpright:
      'Doing the same thing again, deliberately, until it is good. Unglamorous and the only method that works here.',
    meaningReversed:
      'Reversed, the repetition has lost its aim — either polishing past the point of return or working without checking the result.',
    love: {
      upright: 'Small repeated attentions matter more than large occasional ones.',
      reversed: 'Going through the routine without being present in it.',
    },
    career: {
      upright: 'Deliberate practice on one specific skill will show within weeks.',
      reversed: 'Busy work is filling the hours meant for improvement.',
    },
    study: {
      upright: 'Drill it. This is the stage where repetition is the whole technique.',
      reversed: 'Perfecting the notes instead of practising the skill.',
    },
    finance: {
      upright: 'Steady contributions. The mechanism matters more than the amount.',
      reversed: 'Optimising small line items while ignoring the large one.',
    },
    advice: {
      upright: 'Pick one skill and repeat it for two weeks.',
      reversed: 'Get feedback. Practice without it just entrenches the error.',
    },
    symbols: ['the workbench', 'eight coins', 'the chisel', 'the town in the distance'],
  },

  'pentacles-09': {
    name: 'Nine of Pentacles',
    keywordsUpright: ['self-sufficiency', 'earned comfort', 'independence', 'refinement'],
    keywordsReversed: ['dependence', 'comfort without meaning', 'over-work', 'isolation in success'],
    meaningUpright:
      'Something built by yourself that now sustains you. The quality of it is the point, not the quantity.',
    meaningReversed:
      'Reversed, the independence has become isolation, or the comfort was bought at a price not yet counted.',
    love: {
      upright: 'Being complete on your own is what makes the relationship a choice.',
      reversed: 'Self-sufficiency being used to avoid needing anyone.',
    },
    career: {
      upright: 'Your own work, on your own terms. Protect the arrangement.',
      reversed: 'Success that requires all of your time is a job with better branding.',
    },
    study: {
      upright: 'Self-directed learning is working. Trust the structure you built.',
      reversed: 'Studying alone has become a way of not being assessed.',
    },
    finance: {
      upright: 'Financial independence, or a clear step toward it.',
      reversed: 'Lifestyle has quietly grown to match the income.',
    },
    advice: {
      upright: 'Enjoy the thing you built. That is part of the return.',
      reversed: 'Let someone in. Independence is not supposed to be total.',
    },
    symbols: ['the walled vineyard', 'the hooded falcon', 'the ripe grapes', 'the single figure'],
  },

  'pentacles-10': {
    name: 'Ten of Pentacles',
    keywordsUpright: ['lasting structure', 'family and legacy', 'accumulated stability', 'the long horizon'],
    keywordsReversed: ['family friction over resources', 'a fragile structure', 'short-termism', 'inherited constraint'],
    meaningUpright:
      'Something built to outlast the person who built it: a household, an institution, a durable arrangement.',
    meaningReversed:
      'Reversed, the structure looks solid and depends on one thing — or what was inherited is constraining rather than supporting.',
    love: {
      upright: 'A relationship considered in decades rather than months.',
      reversed: 'Family expectations are shaping a decision that should be yours.',
    },
    career: {
      upright: 'Build something that runs without you. That is the work now.',
      reversed: 'The system depends entirely on one person. Usually you.',
    },
    study: {
      upright: 'Build the foundation you will still be using in ten years.',
      reversed: 'Optimising for the next exam at the cost of the actual capability.',
    },
    finance: {
      upright: 'Long-horizon planning, including the parts that outlive you.',
      reversed: 'Money between family members needs a written arrangement, not goodwill.',
    },
    advice: {
      upright: 'Make the decision on a ten-year frame.',
      reversed: 'Find the single point of failure and address that one.',
    },
    symbols: ['the archway', 'the ten coins arranged', 'the dogs', 'three generations'],
  },

  'pentacles-11': {
    name: 'Page of Pentacles',
    keywordsUpright: ['studious beginning', 'a practical plan', 'diligence', 'the first real attempt'],
    keywordsReversed: ['procrastination', 'planning without doing', 'lack of focus', 'unrealistic scope'],
    meaningUpright:
      'A beginner who is willing to do it properly. Slow, methodical, and likely to still be here in a year.',
    meaningReversed:
      'Reversed, the intention is genuine and the start keeps being scheduled for next week.',
    love: {
      upright: 'Building slowly and concretely. Small consistent actions.',
      reversed: 'Talking about the future without doing anything in the present.',
    },
    career: {
      upright: 'Learn the fundamentals of a new field properly. It will compound.',
      reversed: 'A plan with no first action attached to a date.',
    },
    study: {
      upright: 'Methodical beginner\'s work. It will look slow and it is not.',
      reversed: 'The schedule is more elaborate than the studying.',
    },
    finance: {
      upright: 'Start the habit small: the amount matters less than the regularity.',
      reversed: 'Researching options is standing in for opening the account.',
    },
    advice: {
      upright: 'Begin properly, at a size you can repeat.',
      reversed: 'Put one item on the calendar for today.',
    },
    symbols: ['the studied coin', 'the ploughed field', 'the young trees', 'the careful grip'],
  },

  'pentacles-12': {
    name: 'Knight of Pentacles',
    keywordsUpright: ['persistence', 'reliability', 'slow steady work', 'seeing it through'],
    keywordsReversed: ['stagnation', 'stubbornness', 'boredom', 'too slow to matter'],
    meaningUpright:
      'The least dramatic and most likely to finish. Progress here is measured in weeks and it does not stop.',
    meaningReversed:
      'Reversed, the steadiness has turned into standing still, and the routine is being kept for its own sake.',
    love: {
      upright: 'Dependability is the offering. It is worth more than it feels like.',
      reversed: 'The relationship has become entirely routine. Add one thing.',
    },
    career: {
      upright: 'Grind it out. This is a phase where consistency wins.',
      reversed: 'Doing it the established way past the point where it works.',
    },
    study: {
      upright: 'Daily, unspectacular, effective. Keep it exactly as it is.',
      reversed: 'The method stopped improving results some time ago.',
    },
    finance: {
      upright: 'Regular contributions and no clever moves. Correct approach.',
      reversed: 'Too conservative for too long is also a decision.',
    },
    advice: {
      upright: 'Keep going at the same pace. That is the whole strategy.',
      reversed: 'Change one variable to see if anything is still responsive.',
    },
    symbols: ['the standing horse', 'the ploughed furrows', 'the held coin', 'the oak leaves'],
  },

  'pentacles-13': {
    name: 'Queen of Pentacles',
    keywordsUpright: ['practical care', 'resourcefulness', 'grounded warmth', 'managing well'],
    keywordsReversed: ['self-neglect', 'over-responsibility', 'smothering', 'burnt-out capability'],
    meaningUpright:
      'Competence that shows up as care: the person who notices what is actually needed and quietly provides it.',
    meaningReversed:
      'Reversed, everyone is being looked after except the person doing the looking after.',
    love: {
      upright: 'Care expressed in practical acts. It counts, and it can also be said.',
      reversed: 'Doing everything for them is preventing them from doing it.',
    },
    career: {
      upright: 'You hold the operation together. Make sure that is visible and paid.',
      reversed: 'Absorbing everyone\'s workload is not sustainable and is not noticed.',
    },
    study: {
      upright: 'Practical, applied learning fits you. Build around real tasks.',
      reversed: 'Study keeps giving way to other people\'s needs.',
    },
    finance: {
      upright: 'Good household management. The details are where the gains are.',
      reversed: 'Spending on everyone else and nothing on yourself.',
    },
    advice: {
      upright: 'Do the practical thing. It is the most caring option available.',
      reversed: 'Put one thing on the list that is only for you.',
    },
    symbols: ['the carved throne', 'the held coin', 'the rabbit', 'the flowering arch'],
  },

  'pentacles-14': {
    name: 'King of Pentacles',
    keywordsUpright: ['established resource', 'stewardship', 'reliability at scale', 'mastery of the concrete'],
    keywordsReversed: ['rigidity about money', 'status anxiety', 'controlling through resources', 'complacency'],
    meaningUpright:
      'Long-accumulated capability, being managed rather than chased. This position is about maintaining and deploying, not acquiring.',
    meaningReversed:
      'Reversed, the security has become the identity — or resources are being used to control rather than to build.',
    love: {
      upright: 'Providing stability, and remembering that it is not the only thing being asked for.',
      reversed: 'Material provision standing in for presence.',
    },
    career: {
      upright: 'Steward what exists. Growth here comes from optimisation, not expansion.',
      reversed: 'Success achieved once is being defended instead of extended.',
    },
    study: {
      upright: 'Deepen the field you already know rather than adding a new one.',
      reversed: 'Expertise has become a reason not to be a beginner anywhere.',
    },
    finance: {
      upright: 'Sound, unexciting management. Exactly right.',
      reversed: 'Net worth is being used as a measure of worth.',
    },
    advice: {
      upright: 'Deploy what you have rather than acquiring more of it.',
      reversed: 'Ask what the security is protecting you from feeling.',
    },
    symbols: ['the vine-carved throne', 'the bull motif', 'the castle behind', 'the ripe grapes'],
  },
}
