# 最终人工裁决 · Visual Semantic V1 QA

7/7 已应用，HUMAN_REVIEW=0；人工判断优先，原 Generated / Reviewer / Judge 完整保留。

review-003：仅确认草地上的布与杯子，不确认底部支撑材质；不添加石头事实。review-005：只修正 QA uncertainDetails，Runtime 完全不变。

## review-001 · legacy-shadow/cups-01

**Conflict Field**：scene/head covering

**Generated Semantic（保留原始记录）**：

A hooded, faceless figure kneels in a dark stone passage, holding a chalice from which water pours through their cupped hands into a channel below, while a pale bird hovers in the lit wall behind.

**Reviewer Opinions**：

- reviewer-b：兜帽/披风覆盖头部
- reviewer-e：可见垂落头发，无法辨认兜帽边缘

**Original Judge Opinion**：

The two reviewers directly contradict each other on the head: reviewer-b's frozen observation records 'a hood/mantle', reviewer-e records hair with no resolvable hood. I overturn reviewer-b — at 7x with brightening it is hair, not fabric. Separately, the demonstrably false 'trace of violet' was raised by only one reviewer, so it fails the dual-agreement bar even though I measured it as wrong. Nothing here clears AUTO_CORRECT.

**Human Final Decision**：

头发裸露，没有兜帽；面部仍不可辨认，保留 faceless。

**Review Layer before → after**：

- A hooded, faceless figure → A faceless figure with visible loose hair and no hood covering the head

- QA figures.0.role：kneeling hooded figure → kneeling figure with visible loose hair and no hood
- QA figures.0.posture：kneeling, head bowed so the face is entirely hidden by dark hair and hood, both hands raised holding a chalice → kneeling, head bowed so the face is entirely hidden by dark hair, both hands raised holding a chalice


**Runtime After Correction（真实 deep 投影）**：

```json
{
  "scene": "A faceless figure with visible loose hair and no hood covering the head kneels in a dark stone passage, holding a chalice from which water pours through their cupped hands into a channel below, while a pale bird hovers in the lit wall behind.",
  "keyObjects": [
    "stemmed chalice with textured, mottled surface",
    "stream of water falling from the chalice",
    "cupped hands catching the water",
    "stone channel or gutter running toward the viewer",
    "cobbled stone paving"
  ],
  "spatialRelations": [
    "the figure sits between the dark left-hand depth and the lit wall on the right",
    "the bird hovers above and to the right of the figure's head",
    "the water falls from the chalice through the hands into the channel in the lower centre"
  ],
  "visualTensions": [
    "bright falling water against an almost entirely black surround",
    "the pale hovering bird against the heavy, motionless figure"
  ],
  "emphasizedAspects": [
    "something opening and giving out more than can be held",
    "capacity and flow rather than a relationship between two people",
    "the vessel as the source of what is offered"
  ],
  "deckSpecificMotifs": [
    "monochrome near-greyscale rendering with a trace of violet"
  ]
}
```

## review-003 · legacy-moonlight/cups-10

**Conflict Field**：scene/keyObjects/spatialRelations · cup support

**Generated Semantic（保留原始记录）**：

A couple stands with their backs to the viewer on a misty shore, watching two children run toward a distant castle while a rainbow arcs overhead and a table of cups glows in the foreground.

**Reviewer Opinions**：

- reviewer-c：Comparison pass；盲观察描述地面铺布
- reviewer-e：杯子站在草地铺布上，未确认桌子

**Original Judge Opinion**：

Reviewer-c returned pass and reviewer-e alone raised the table-versus-cloth point, so the dual-agreement bar for AUTO_CORRECT fails by the stated exclusion — even though c's own frozen observation also describes a cloth on the ground and never mentions a table. The 'table' wording is load-bearing in scene, keyObjects, spatialRelations and visualTensions, so dropping a field would destroy good content and a patch would touch five places; that is a human call.

**Human Final Decision**：

确认杯子在草地上的布上；未确认桌子，底部支撑物及材质不确定，不推定石头。

**Review Layer before → after**：

- a table of cups glows in the foreground → cups resting on a cloth spread on the grass glow in the foreground
- a second cluster of glass goblets on a draped table in the foreground → a second cluster of glass goblets resting on a cloth spread on the grass in the foreground
- a draped cloth over a low table → a cloth spread on the grass with the cups resting on it
- the couple stands between the foreground table and the children → the couple stands between the foreground cloth with cups and the children
- the table of cups sits behind them → the cups resting on the cloth sit behind them

- QA confidence.uncertainDetails.1：exact count of goblets on the foreground table → exact count of goblets resting on the foreground cloth; the exact support beneath the cloth is unclear
- QA foreground.0：a low table draped in pale patterned cloth → a pale patterned cloth spread on the grass; the exact support beneath it is unclear
- QA foreground.1：a cluster of glass goblets on the table → a cluster of glass goblets resting on the cloth

- QA uncertain：support beneath the foreground cloth
- QA uncertain：material of that support
- 仅过滤条目 emphasizedAspects：ordinary domestic warmth in the shared table and running children

**Runtime After Correction（真实 deep 投影）**：

```json
{
  "scene": "A couple stands with their backs to the viewer on a misty shore, watching two children run toward a distant castle while a rainbow arcs overhead and cups resting on a cloth spread on the grass glow in the foreground.",
  "keyObjects": [
    "a second cluster of glass goblets resting on a cloth spread on the grass in the foreground",
    "a rainbow band",
    "a full moon",
    "a lit lantern with a metal frame",
    "a cloth spread on the grass with the cups resting on it"
  ],
  "spatialRelations": [
    "the couple stands between the foreground cloth with cups and the children",
    "the children run ahead of the couple toward the water",
    "the sky-borne goblets arc above the couple's heads"
  ],
  "visualTensions": [
    "the couple faces away from the viewer while the cups resting on the cloth sit behind them",
    "the children move outward toward the horizon while the adults stand still"
  ],
  "emphasizedAspects": [
    "a settled, long-standing bond shown by the couple's relaxed closeness",
    "continuity across generations"
  ],
  "deckSpecificMotifs": [
    "watercolour wash texture with soft edges",
    "floral wreath and trailing ribbon details"
  ]
}
```

## review-004 · legacy-classic/swords-08

**Conflict Field**：scene/spatialRelations · sword arrangement

**Generated Semantic（保留原始记录）**：

A blindfolded woman in a long pale gown stands bound at the waist and arms in a marshy field, encircled by upright swords driven into the ground, with a hilltop castle under a breaking sky behind her.

**Reviewer Opinions**：

- reviewer-a：Comparison pass；盲观察为左右两组剑
- reviewer-d：剑只在左右，前后为开放通道

**Original Judge Opinion**：

Reviewer-a returned pass and only reviewer-d raised the ring-versus-flanking point, so AUTO_CORRECT is excluded by rule — although a's own frozen observation also lists only a LEFT group and a RIGHT group and never a blade behind her. I additionally disagree with both reviewers on the count: they report 'at least 7, possibly 8'; I resolve nine distinct hilts with nine separate blades. Two independent reasons for a human to look.

**Human Final Decision**：

确认左5右4，形成开放夹道，没有完整环绕；数量以 Artwork 为准。

**Review Layer before → after**：

- encircled by upright swords driven into the ground → flanked by five upright swords to her left and four to her right, forming an open passage
- arranged in a loose ring around the figure → arranged with five to the left and four to the right, leaving an open passage
- the woman stands at the centre with swords planted to her left, right and behind her → five swords stand to the left and four to the right of the woman, leaving an open passage with no complete ring behind her
- the tight ring of blades around the figure against the wide open plain beyond → the two flanking groups of blades beside the figure against the wide open plain beyond
- the encircling enclosure of the swords → the flanking arrangement of five swords to the left and four to the right

- QA composition.openness：enclosed at the centre by the ring of swords, open toward the distant horizon → open passage between flanking sword groups, open toward the distant horizon
- QA confidence.uncertainDetails.0：exact number of swords fully resolvable in the ring → five swords are confirmed on the left and four on the right, forming an open passage


**Runtime After Correction（真实 deep 投影）**：

```json
{
  "scene": "A blindfolded woman in a long pale gown stands bound at the waist and arms in a marshy field, flanked by five upright swords to her left and four to her right, forming an open passage, with a hilltop castle under a breaking sky behind her.",
  "keyObjects": [
    "cloth blindfold tied over the eyes, its tail trailing to the right",
    "thick rope coiled several times around the waist and pinning the arms",
    "upright swords driven point-down into the ground, arranged with five to the left and four to the right, leaving an open passage",
    "long pale gown with patterned hem",
    "bare feet in wet mud"
  ],
  "spatialRelations": [
    "five swords stand to the left and four to the right of the woman, leaving an open passage with no complete ring behind her",
    "the castle sits far behind her on the left horizon",
    "the water channel runs from the left middle distance toward the lower foreground"
  ],
  "visualTensions": [
    "the two flanking groups of blades beside the figure against the wide open plain beyond",
    "the bright light in the upper left against the massed dark cloud"
  ],
  "emphasizedAspects": [
    "the constraint is real and physically rendered through rope and blindfold",
    "the flanking arrangement of five swords to the left and four to the right",
    "the bowed, still posture of being bound"
  ],
  "deckSpecificMotifs": [
    "fine engraved cross-hatching in the manner of an old printed book",
    "deep wine-red accents on the sword grips"
  ]
}
```

## review-005 · legacy-moonlight/swords-06

**Conflict Field**：confidence.uncertainDetails · sword count（原生成自述；不进入 Prompt）

**Generated Semantic（保留原始记录）**：

A pale-robed figure stands poling a small wooden boat across still water at night, a second seated figure and a row of upright swords riding in the bow, with a distant spired castle on the far shore.

**Reviewer Opinions**：

- reviewer-b：可辨五把；无法可靠确认是否有第六把
- reviewer-d：可辨五把；无法确认第六把

**Original Judge Opinion**：

Two separate problems and they pull apart. On the count both reviewers independently resolved five and rejected six, and I agree — but neither would assert five, and the guidance says not to write in a number nobody will stand behind. On the lantern the reviewers flatly contradict each other about the boat's orientation: reviewer-b places the prow at the right (making the lantern the bow), reviewer-d's own observation places the prow at the left (making the lantern the stern, i.e. the existing text correct). That contradiction, unaddressed, blocks an auto-write on this file.

**Human Final Decision**：

五把剑清晰可辨，无法可靠确认额外一把；原错误仅在 QA uncertainDetails，不新增 Runtime 描述。

**Review Layer before → after**：

- Runtime 不变；仅修正下述 QA 字段。

- QA confidence.uncertainDetails.0：exact number of swords standing in the bow (appears to be six, some overlapping) → five swords are clearly visible; no additional sword can be reliably confirmed


**Runtime After Correction（真实 deep 投影）**：

```json
{
  "scene": "A pale-robed figure stands poling a small wooden boat across still water at night, a second seated figure and a row of upright swords riding in the bow, with a distant spired castle on the far shore.",
  "keyObjects": [
    "small wooden boat with carved prow and stern post",
    "long slender pole held by the standing figure",
    "row of upright swords standing in the bow of the boat",
    "hanging lantern with warm glow at the boat's stern",
    "garlands of vines and small white blossoms draped along the hull"
  ],
  "spatialRelations": [
    "the boat sits diagonally across the lower half, bow toward the right",
    "the standing figure occupies the left of the boat, the seated figure the centre, the swords the right",
    "the castle sits on the horizon at the right, beyond the water"
  ],
  "visualTensions": [
    "the boat's forward diagonal against the still, level horizon",
    "the single warm lantern glow against the cool blue night"
  ],
  "emphasizedAspects": [
    "a crossing in progress, moving away from one shore toward another",
    "the burden carried along rather than left behind",
    "a gentle, unhurried transition"
  ],
  "deckSpecificMotifs": [
    "translucent ribbon-veils streaming from the figures and boat",
    "vine and blossom garlands wound around the hull"
  ]
}
```

## review-009 · legacy-moonlight/wands-04

**Conflict Field**：keyObjects · garlanded pole count

**Generated Semantic（保留原始记录）**：

Under a floral arch of four slender poles, a group of pale-robed women raise small cups in a moonlit garden beside a misty lake and a distant town.

**Reviewer Opinions**：

- reviewer-a：三根
- reviewer-d：两根

**Original Judge Opinion**：

The reviewers disagree with each other on the count (reviewer-a resolves three, reviewer-d resolves two) and I land on three, overturning reviewer-d — the centre shaft is a genuine separate pole. Nobody, including me, can establish the asserted four. More seriously, reviewer-d's suggested patch ('two of them raising cups') would write a new error into the data: the left figure's cup is visible. Nothing here may be applied automatically.

**Human Final Decision**：

确认3根主要花环杆；去除原4根和左右各2根断言，不猜未确认分布。

**Review Layer before → after**：

- four slender poles → three slender poles
- the four poles frame the scene, two at left and two at right → three slender poles frame the scene

- QA confidence.uncertainDetails.0：exact number of poles resolved as four, but the two rear poles are partly obscured by garland → three main garlanded slender poles can be reliably confirmed


**Runtime After Correction（真实 deep 投影）**：

```json
{
  "scene": "Under a floral arch of three slender poles, a group of pale-robed women raise small cups in a moonlit garden beside a misty lake and a distant town.",
  "keyObjects": [
    "three slender poles forming an arch",
    "garland of white flowers and leaves across the arch",
    "trailing pale ribbons and beaded chains",
    "hanging glass lanterns",
    "small cups held by the figures"
  ],
  "spatialRelations": [
    "three slender poles frame the scene",
    "the central figures stand between the poles, in front of the draped table",
    "the lake and town lie behind the arch, below the moon"
  ],
  "visualTensions": [
    "the solid vertical poles against the dissolving mist",
    "the close, intimate toast against the vast distant shore"
  ],
  "emphasizedAspects": [
    "gathering under a structure",
    "a moment of arrival being marked together",
    "a framework that holds and shelters"
  ],
  "deckSpecificMotifs": [
    "silver linework on pale ground",
    "ribbons and beaded chains trailing from the arch"
  ]
}
```

## review-010 · legacy-classic/swords-06

**Conflict Field**：scene · passenger head coverings

**Generated Semantic（保留原始记录）**：

A standing boatman poles a small wooden boat carrying two seated, hooded passengers and a cluster of upright swords across a wide river, with a stone tower on the left bank and low mountains on the far shore.

**Reviewer Opinions**：

- reviewer-b：中间乘客披风覆盖头肩
- reviewer-d：中间乘客裸露头发，另一名有兜帽

**Original Judge Opinion**：

Reviewer-b returned pass and described the centre passenger's cloak as 'draped over head and shoulders'; reviewer-d recorded it as bare-headed. They contradict each other, and reviewer-b passed, so the dual-agreement bar fails twice over. I overturn reviewer-b: it is hair, not a hood. Because a reviewer's frozen observation is on the other side, this needs a person rather than an automatic write.

**Human Final Decision**：

两名坐着乘客中仅一人戴兜帽，中间乘客头发裸露；不添加位置未明确的未佩戴帽子。

**Review Layer before → after**：

- two seated, hooded passengers → two seated passengers (one wearing a hood, the other with uncovered hair)



**Runtime After Correction（真实 deep 投影）**：

```json
{
  "scene": "A standing boatman poles a small wooden boat carrying two seated passengers (one wearing a hood, the other with uncovered hair) and a cluster of upright swords across a wide river, with a stone tower on the left bank and low mountains on the far shore.",
  "keyObjects": [
    "wooden rowing boat with plank hull and rope lashing",
    "long wooden pole held by the boatman",
    "cluster of upright swords standing in the boat",
    "stone tower with battlements on the left bank",
    "low mountain ridge on the far shore"
  ],
  "spatialRelations": [
    "the boatman stands behind and above the two seated passengers",
    "the swords stand between the seated passengers and the bow of the boat",
    "the tower sits on the left bank, behind and above the boat"
  ],
  "visualTensions": [
    "the boat's forward motion against the stillness of the seated figures",
    "the sharp vertical swords against the soft horizontal water and sky"
  ],
  "emphasizedAspects": [
    "a crossing in progress, moving away from what lies behind",
    "the burden carried along with the travellers",
    "an undramatic, steady passage rather than a decisive break"
  ],
  "deckSpecificMotifs": [
    "engraved cross-hatching and fine line shading"
  ]
}
```

## review-207 · legacy-moonlight/pentacles-06

**Conflict Field**：scene · lower-left kneeling figure head covering

**Generated Semantic（保留原始记录）**：

A tall, pale-robed woman stands holding a hanging balance in one hand and lowering a single pentacle-embossed coin toward two kneeling, veiled figures who raise their hands to receive it, in a misty moonlit garden by water.

**Reviewer Opinions**：

- reviewer-b：左下人物为 hooded pale mantle
- reviewer-d：左下可见编发和花，披肩从肩部开始

**Original Judge Opinion**：

Two issues, handled differently. (1) 'two kneeling, veiled figures': the reviewers contradict each other head-on — reviewer-d reports the left figure as bare-headed with braided flowered hair, reviewer-b records it as a 'hooded pale mantle'. My own zoom agrees with reviewer-d, but only one reviewer raised this, so AUTO_CORRECT criterion 2 is not met, and the claim sits inside the single scene blob, so MARK_UNCERTAIN would discard the entire scene line for one adjective — an unacceptable loss. A direct reviewer conflict over a one-word fact that a human settles at a glance belongs here. (2) 'lying on the draped cloth on the ground': I overturn reviewer-d. The draped translucent cloth is plainly there under the coins once contrast is raised; reviewer-b did not object, and reviewer-d's objection does not survive my own look. That keyObjects line should stand as written.

**Human Final Decision**：

左下编发裸露、没有面纱或兜帽；右侧头部有兜帽。

**Review Layer before → after**：

- two kneeling, veiled figures who raise their hands to receive it → two kneeling figures who raise their hands to receive it, the left with visible braided hair and the right wearing a hood

- QA figures.2.role：kneeling veiled figure, left → kneeling figure with visible uncovered braided hair, left
- QA figures.1.role：kneeling veiled figure, right → kneeling hooded figure, right
- QA foreground.3：folds of the kneeling figures' veils → folds of the right kneeling figure’s hood and garments


**Runtime After Correction（真实 deep 投影）**：

```json
{
  "scene": "A tall, pale-robed woman stands holding a hanging balance in one hand and lowering a single pentacle-embossed coin toward two kneeling figures who raise their hands to receive it, the left with visible braided hair and the right wearing a hood, in a misty moon…",
  "keyObjects": [
    "hanging two-pan balance with chains, held by the standing woman",
    "single round coin with a star/pentacle design being offered",
    "round coins with star/pentacle designs lying on the draped cloth on the ground",
    "coins resting in the balance pans",
    "glowing lantern at lower right"
  ],
  "spatialRelations": [
    "the standing woman towers over both kneeling figures",
    "the balance hangs between the standing woman and the kneeling pair",
    "the offered coin sits in the gap between the standing woman's hand and the right kneeling figure's cupped hands"
  ],
  "visualTensions": [
    "the balance hangs level while the coin is being given from one hand only",
    "the standing figure's height contrasts with the low kneeling postures"
  ],
  "emphasizedAspects": [
    "resources moving between people",
    "the visible terms of the exchange, shown as a balance held in view",
    "giving and receiving as a face-to-face gesture"
  ],
  "deckSpecificMotifs": [
    "watercolour-soft edges with low mist near the horizon"
  ]
}
```

