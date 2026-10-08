# 视觉语义人工抽查清单

生成时间：2026-10-08T08:23:23.668Z
Vision Prompt：`v2-prior-guard` · `6a8c183f714f3bb9…`
抽查 **95 / 390** 条（固定种子，每次同一批）

置信度分布：high 50 · medium 45 · low 0
按牌组：legacy-celestial 18 · legacy-classic 10 · legacy-forest 10 · legacy-moonlight 22 · legacy-shadow 35

## 抽样规则

- 全部 `medium` 与 `low` 置信度条目（模型自己说不确定的）
- 每副牌至少 10 张 `high`，按先验风险排序
- 高风险优先：编号小阿卡纳（牌号 ≠ 物件数量）、月亮/太阳/星星/高塔/恶魔/皇帝/女皇/正义/力量/恋人、宝剑组、多人物场景

## 逐条核对四件事

1. `scene` 与 `keyObjects` 里的东西，图上**真的有**吗？
2. **数量**对吗？牌名里的数字不代表画面里的数量（例：Six of Wands 未必画 6 根）。
3. 有没有 Rider-Waite 里有、而这张图上**没有**的东西被写进来？
   重点看：月相 · 太阳 · 王冠 · 光环 · 翅膀 · 蒙眼布 · 马 · 塔 · 王座 · 门 · 路 · 水 · 山 · 各花色数量
4. `uncertainDetails` 里该有的东西有没有漏（看不清却写死了）？

## 1. legacy-celestial / cups-03  ·  `high`

图片：`public/assets/decks/legacy-celestial/cards/cups-03.webp`

- **scene**: Three women in flowing star-flecked gowns stand barefoot on a wet reflective terrace, raising three golden chalices together beneath a vast nebula sky ringed by constellation lines and astrological circles.
- **keyObjects**: three golden chalices held aloft and touching; constellation lines linking gold star points; concentric astrological ring diagram across the sky; small crescent moon at upper left; small pale disc at upper right; domed colonnaded pavilion with a lit lantern at right; cluster of dark grapes and pomegranates at lower left; cut pomegranate showing seeds
- **spatialRelations**: the three chalices meet at the centre of the upper third, directly beneath the brightest star; the three figures form a triangle around the central raised cups; the pavilion sits behind and to the right of the right-hand figure; the fruit cluster lies in the near foreground below the left figure
- **uncertainDetails**: the small pale disc at upper right may be a moon or a planet; the exact number of constellation lines is not resolvable; the left-hand horizon structures are only faintly legible
- deckSpecificMotifs: constellation lines drawn between star points; concentric astrological ring diagram; gold star points scattered across the gowns; ornamental gold border with ruled edges
- emphasizedAspects: shared celebration among a group of three | ease and mutuality of the gathering | abundance freely present

## 2. legacy-celestial / cups-04  ·  `high`

图片：`public/assets/decks/legacy-celestial/cards/cups-04.webp`

- **scene**: A seated figure in dark robes leans on one hand beneath a great tree at night, while a luminous hand emerging from a nebula offers a golden cup toward him and three more cups stand on the cracked ground before him.
- **keyObjects**: golden chalice held by the luminous hand; three golden chalices standing in a row on the ground; large gnarled tree trunk and branches; armillary sphere on a stand at the right; circular astrolabe or star chart leaning at the left; stack of books beside the astrolabe; constellation lines and star points across the sky; small domed pavilion on the far shore
- **spatialRelations**: the tree occupies the left edge and arches over the seated figure; the luminous hand and its cup float to the right of the figure's head; the three ground cups sit in a row in the lower foreground, below and in front of the figure; the armillary sphere stands at the lower right, between the figure and the water
- **uncertainDetails**: whether the small pale disc at upper right is a crescent moon or a partially lit sphere; exact number of books in the left-hand stack; whether the leaning circular object at left is an astrolabe or a chart disc
- deckSpecificMotifs: constellation lines drawn as thin gold threads between stars; nebula rendered as a soft pink-violet cloud; gold star points scattered over cloth, stone and sky; ornamental gold border with the numeral IV and the card title
- emphasizedAspects: something is being offered and not seen | attention turned inward and downward | the offer arrives from outside the figure's own space

## 3. legacy-celestial / major-10  ·  `medium`

图片：`public/assets/decks/legacy-celestial/cards/major-10.webp`

- **scene**: A robed figure stands on a small round stone platform in a dark reflective lake, reaching up toward a large golden concentric ring-diagram suspended in a star-filled night sky, with constellation figures drawn in glowing lines around it.
- **keyObjects**: large golden concentric ring diagram with radial spokes and a bright centre point; small gold star points scattered across the sky; constellation line-drawings of a bull, a lion, a winged figure and a winged bird; two small armillary-sphere instruments on the platform; small lit lantern on the platform edge; glowing spheres or planets embedded in the ring and floating in the water; dark reflective water surface; gold border frame with the numeral X at the top and the title text at the bottom
- **spatialRelations**: the ring diagram occupies the upper two-thirds of the image, centred above the figure; the figure stands below the ring, its raised hand nearly touching the ring's lower rim; constellation figures ring the outside of the diagram on left and right; the platform sits at the waterline with its reflection directly beneath it
- **uncertainDetails**: exact number of small spheres embedded in the ring; whether the two instruments on the platform are both armillary spheres; whether the winged upper-left figure holds a book or a tablet; exact count of constellation figures in the sky
- deckSpecificMotifs: constellation line-drawing style for figures; nebula clouds threaded through the ring; gold hairline border with corner star points; small gold star points as the only bright accents
- emphasizedAspects: something vast turning overhead that the figure does not control | the figure's own gesture as the one deliberate act in the scene | cycles and celestial order rendered as a visible mechanism

## 4. legacy-celestial / major-15  ·  `medium`

图片：`public/assets/decks/legacy-celestial/cards/major-15.webp`

- **scene**: Two robed figures stand on a star-charted floor beneath a nebula sky, flanking a horned mask that rests on a stone plinth between them.
- **keyObjects**: horned mask with two curved horns and dark eye openings; rectangular stone plinth or altar supporting the mask; heavy chain held overhead by the left figure; chain draped across the right figure's shoulders; hanging metal censer or lamp with a thin plume of smoke; gold constellation lines and star points across the sky; circular astrological chart lines engraved on the floor; small gold stars and spheres scattered on the floor
- **spatialRelations**: the plinth and horned mask sit at the centre, lower than the two figures' heads; the left figure stands closer to the viewer than the plinth; the right figure stands further back; the chain arcs from the left figure's raised hands across the upper left of the frame; the two figures face inward toward the central mask, framing it symmetrically
- **uncertainDetails**: whether the left figure's chain is attached to the plinth or only to the figure; exact number of small spheres on the floor; whether the pale disc at upper right is a moon or a planet; the identity of the small reddish disc in the sky
- deckSpecificMotifs: constellation lines linking gold star points; nebula wash in violet and magenta; engraved celestial charts on floor and sky; ornamental gold border with the numeral XV and the title
- emphasizedAspects: a visible arrangement of restraint that the figures themselves hold up | the hold as something chosen and maintained rather than imposed | the object of attention as a mask rather than a living antagonist

## 5. legacy-celestial / major-20  ·  `medium`

图片：`public/assets/decks/legacy-celestial/cards/major-20.webp`

- **scene**: A robed figure stands on a stone tower platform blowing a long horn toward a star-filled sky, while many smaller robed figures wade through dark water holding open tablets and scrolls.
- **keyObjects**: long horn with flared bell; open tablets and scrolls held by the figures; stone tower platform with arched niches; armillary sphere on a stand; small lantern on the platform edge; large studded chest in the foreground; small rowing boat with a lantern; concentric ring lines in the sky
- **spatialRelations**: the horn-blower stands above and left of the wading crowd; the wading figures are spread across the water between the tower and the horizon; the chest sits in the foreground below the tower platform; the boat floats at the lower right, separate from the waders
- **uncertainDetails**: exact number of wading figures; whether the spheres are moons or planets; whether the seated figures in the niches are distinct individuals; the precise shape of the horn's bell
- deckSpecificMotifs: constellation lines connecting star points; concentric celestial rings; small gold star points scattered across the sky; nebulae rendered in violet and blue haze
- emphasizedAspects: a summons that calls for a response | everything being brought into view at once | a moment of accounting before a wide sky

## 6. legacy-celestial / swords-01  ·  `high`

图片：`public/assets/decks/legacy-celestial/cards/swords-01.webp`

- **scene**: A robed figure stands on a circular stone platform at night, arm raised holding a glowing sword upright toward a starry sky, with a golden crown and laurel wreath of light suspended above the blade and a sunlit horizon behind.
- **keyObjects**: upright sword with a bright glowing blade and crossguard; golden crown outlined in light, floating above the sword tip; two curved laurel branches of light flanking the crown; armillary sphere on a stand at the left edge of the platform; open ringed armillary instrument on a stand at the right edge; small glass globe on a stand at lower right; two lit lanterns on the platform rim; circular engraved diagram inlaid in the platform floor
- **spatialRelations**: the sword blade rises vertically from the figure's hand through the centre of the image; the crown and laurel wreath sit directly above the sword tip, centred on the vertical axis; the figure stands between the two armillary instruments, which flank the platform left and right; the horizon line and its reflected light lie behind the figure, below the sword's midpoint
- **uncertainDetails**: whether the small dark discs at right are moons or planets; the exact number of lanterns on the platform rim; whether the emblem on the cloak is a compass rose or a chart
- deckSpecificMotifs: constellation lines linking small gold star points; fine gold astrolabe and compass rings framing the scene; nebula clouds in violet and gold; ornamental border with corner dials and a top numeral I
- emphasizedAspects: a single clear point held aloft | precision and sharpness of the raised edge | clarity set against a vast, indistinct field

## 7. legacy-celestial / swords-02  ·  `high`

图片：`public/assets/decks/legacy-celestial/cards/swords-02.webp`

- **scene**: A blindfolded figure in a star-patterned dark robe sits on a stone block before a night sea, holding two long swords crossed in an X across the chest, beneath a large crescent moon and a star-filled sky.
- **keyObjects**: two long straight swords crossed in an X; cloth blindfold over the eyes; stone slab seat with carved edge; brass armillary sphere on the lower left; lit lantern with a warm flame on the lower right; gold star points scattered across the robe; necklace with a small pendant; gold border frame with corner compass rosettes
- **spatialRelations**: the crossed swords overlap the figure's torso, their blades rising above the shoulders; the crescent moon sits directly above the figure's head, centred in the sky; the armillary sphere and the lantern flank the stone seat at the lower left and lower right; the sea horizon runs behind the figure at roughly shoulder height
- **uncertainDetails**: whether the small structures on the horizon are buildings or rock forms; the exact number of star points on the robe
- deckSpecificMotifs: constellation lines and star points overlaid on the sky; nebula haze in violet and blue; gold astrological diagram border with corner rosettes; star specks woven into the fabric of the robe
- emphasizedAspects: a decision held in balance | the balance maintained by not looking

## 8. legacy-celestial / swords-03  ·  `high`

图片：`public/assets/decks/legacy-celestial/cards/swords-03.webp`

- **scene**: A hooded figure sits at a stone table reading a document beneath a night sky in which a faceted crystal heart is pierced by three swords, with a ruined arch and a moonlit horizon behind.
- **keyObjects**: three swords with ornate hilts and glowing blades; large faceted crystal heart; open document held by the figure; stone table with a second paper and a small red seal; armillary sphere on the table; lit lantern on the ground at lower right; ruined stone arch on the right; constellation lines and gold star points
- **spatialRelations**: the three swords converge into the crystal heart at the upper centre; the heart floats above and behind the seated figure; the ruined arch stands to the right of the figure, at the water's edge; the lantern sits on the ground below and right of the table
- **uncertainDetails**: whether the smaller disc at mid left is a second moon or a lens flare; exact number of visible constellation stars; whether the red mark on the table paper is a seal or a stain
- deckSpecificMotifs: constellation lines linking gold star points; faceted crystal heart; astronomical instrument on the table; ornamental border with compass-like corner motifs
- emphasizedAspects: clarity arriving together with pain | something true being seen or read | the wound held in plain view

## 9. legacy-celestial / swords-04  ·  `high`

图片：`public/assets/decks/legacy-celestial/cards/swords-04.webp`

- **scene**: A robed figure lies supine on a stone slab in a dark vaulted chamber, beneath three swords mounted point-down on the wall and beside an arched window opening onto a star-filled nebula sky.
- **keyObjects**: three swords mounted vertically point-down on the wall; one sword inlaid horizontally across the front panel of the stone slab; dark robe patterned with gold constellation lines and star points; arched window filled with nebula and starfield; armillary sphere on a stand at the left of the slab; small caged lantern with a glowing light at the right of the slab; dark pillow beneath the figure's head; circular star-map inlay on the floor
- **spatialRelations**: the three wall swords hang above and to the right of the reclining figure; the window occupies the full left edge, its light falling across the figure's head and shoulder; the caged lantern sits at the far right end of the slab, opposite the armillary sphere at the left; the floor star-map lies below and in front of the slab, centred under the composition
- **uncertainDetails**: whether the pale spheres in the window are ringed planets or lens flares; exact number of star points on the robe is unresolvable; the small dark shapes at the lower left of the window may be trees or stonework
- deckSpecificMotifs: gold constellation lines drawn across the robe and floor; nebula-filled window with ringed planetary spheres; gold geometric star-chart circles inscribed on the wall; ornamental gold border with corner star points
- emphasizedAspects: a deliberate stop, shown as a body at complete rest | stillness held inside an enclosed, protected interior | nothing being solved — no action, no motion in the scene

## 10. legacy-celestial / swords-05  ·  `high`

图片：`public/assets/decks/legacy-celestial/cards/swords-05.webp`

- **scene**: A cloaked figure stands on a wet stone platform holding three swords while two smaller figures walk away toward a glowing horizon beneath a star-filled sky.
- **keyObjects**: three swords held point-down in one hand; two swords lying flat on the stone floor; circular astrological floor engraving; gold-framed border with corner compass rosettes; Roman numeral V at top centre; text 'Five of Swords' at bottom; domed colonnaded structure at left; armillary sphere on a stand at left
- **spatialRelations**: the sword-bearer stands between the viewer and the departing pair; the two loose swords lie in the lower right foreground, closer to the viewer than the standing figure; the departing figures are small and distant, near the horizon line on the right; the domed structure sits behind and to the left of the standing figure
- **uncertainDetails**: whether the small pale disc in the upper right is a moon or a planet; exact number of swords held, which may be three or four due to overlap; whether the tiny marks near the water line are figures or rocks
- deckSpecificMotifs: constellation lines drawn across the sky; spiral galaxy rendered in violet; gold astrological floor diagram; ornamental gold border with compass rosettes
- emphasizedAspects: the dispute is already over and others are walking away | the winner stands alone holding what was won | weapons set down rather than raised

## 11. legacy-celestial / swords-06  ·  `medium`

图片：`public/assets/decks/legacy-celestial/cards/swords-06.webp`

- **scene**: Two cloaked figures sit in a wooden rowboat on dark water, one rowing, beneath a star-filled night sky with a low glow at the horizon and a small domed pavilion on the far shore.
- **keyObjects**: wooden rowboat with visible planking and ribs; long wooden oar held by the standing figure; upright sword blades set along both gunwales; star-and-constellation pattern on the seated figure's cloak; small domed pavilion on the far shore; gold star points scattered across the sky; faint circular orbital rings drawn in the sky; decorative gold border frame with corner compass motifs
- **spatialRelations**: the boat occupies the lower centre, its bow toward the viewer; swords rise vertically on the left and right sides of the boat, framing the figures; the pavilion sits on the right shore at the level of the horizon glow; the Milky Way band runs diagonally from upper left down toward the horizon glow
- **uncertainDetails**: exact number of sword blades visible, as some overlap the gunwales and figures; whether the pale spheres in the sky are moons or planets; whether the seated figure's cloak pattern is embroidered or painted stars
- deckSpecificMotifs: constellation lines linking gold star points; faint concentric orbital rings around celestial bodies; star-patterned cloth on the seated figure; gold corner compass and arc motifs in the border
- emphasizedAspects: a crossing in progress over dark water | the burden travelling with the travellers, carried upright in the boat | movement that is steady and unhurried rather than dramatic

## 12. legacy-celestial / swords-07  ·  `medium`

图片：`public/assets/decks/legacy-celestial/cards/swords-07.webp`

- **scene**: A cloaked figure walks away from a tent encampment at night, carrying a bundle of swords, while two more swords stand upright on a table in the left foreground beneath a star-filled sky with a low sun over distant mountains.
- **keyObjects**: bundle of swords held against the figure's shoulder; two upright swords standing point-up in cylindrical holders on a table; wooden table draped with a star-patterned cloth; large dark tent with a circular chart-like emblem on its side; small lanterns on the ground near the tent; scattered small cylindrical weights or cups on the tabletop; shallow water channel running through the rocks; gold border frame with corner compass diagrams and the numeral VII
- **spatialRelations**: the table with the two upright swords sits in the left foreground, in front of and below the tent; the figure occupies the centre-right, between the tent on the left and the water and mountains on the right; the tent rises on the left, its peak reaching roughly two-thirds of the image height; the low sun sits on the horizon at the right, behind the water and mountain ridge
- **uncertainDetails**: exact number of swords in the carried bundle (appears to be five, possibly six); whether the small pale disc upper-left is a moon or a planet; whether the small objects on the tabletop are weights, cups or candle stubs; whether the upright objects on the table are two swords or a sword and a similar blade
- deckSpecificMotifs: constellation lines connecting star points across the sky; faint circular astrological or orbital diagrams overlaid on the starfield; gold star points scattered across cloth, cloak and sky; ornate gold border with corner compass rosettes
- emphasizedAspects: departure from a camp while carrying something away | a deliberate, unhurried exit rather than a confrontation | something left behind at the point of origin

## 13. legacy-celestial / swords-08  ·  `medium`

图片：`public/assets/decks/legacy-celestial/cards/swords-08.webp`

- **scene**: A barefoot woman in a dark star-flecked gown walks forward along a wet stone path between two rows of upright swords, lifting a pale cloth from her eyes, toward a small domed lit building under a star-filled sky.
- **keyObjects**: pale cloth held across the eyes; upright swords with round pommels and crossguards; rectangular stone plinths beneath the swords; small domed building with a lit arched doorway; wet reflective ground; constellation lines and star points; ringed planet in the upper right sky; gold border with the numeral VIII and the title Eight of Swords
- **spatialRelations**: swords flank the woman in two roughly parallel rows, left and right; the domed building sits behind her, centred on the path's vanishing point; the cloth is held at eye level between her raised hands; the star field fills the sky above and behind all figures
- **uncertainDetails**: exact number of swords visible, as several are cropped or overlap the frame edge; whether the small discs in the sky are moons or distant planets; whether the pale band across the eyes is a cloth or a veil
- deckSpecificMotifs: constellation lines drawn between star points; nebula clouds in violet and magenta; gold geometric border with corner compass diagrams; star points scattered across the gown's fabric
- emphasizedAspects: the blindfold slipping away | an opening ahead rather than a closed wall | movement out of constraint

## 14. legacy-celestial / swords-09  ·  `high`

图片：`public/assets/decks/legacy-celestial/cards/swords-09.webp`

- **scene**: A lone figure sits slumped at a desk in a dark observatory-like chamber, head propped on one hand over an open book, while nine glowing swords hang point-down in a grid of arched niches behind him under a starry sky.
- **keyObjects**: nine downward-pointing swords with ornate gold hilts, each suspended in its own arched niche; open handwritten book on the desk; lit lantern with a warm flame at the desk's left; quill pen in the figure's hand; armillary sphere on the left of the desk; second armillary sphere and a globe on the right of the desk; closed books and loose papers on the desk; dark robe patterned with small gold stars
- **spatialRelations**: the nine swords form a three-by-three grid of niches filling the upper two-thirds of the frame, directly above and behind the seated figure; the figure sits at the base of the niche wall, dwarfed by the grid; the desk and its instruments occupy the bottom band of the image in front of the figure; the starry sky and a crescent moon flank the niche structure at the outer edges
- **uncertainDetails**: whether the small round shapes inside the niches are moons or decorative discs; exact number of loose papers and closed books on the desk; whether the horizon structures are buildings or trees
- deckSpecificMotifs: constellation lines and star points drawn across the sky and inside the niches; gold ornamental border with tick marks and small stars; celestial instruments (armillary spheres, globe) as desk props; star-patterned robe
- emphasizedAspects: the small hours of the night as the setting | genuine distress held in the body rather than in events | thoughts pressing in from above, many and identical

## 15. legacy-celestial / swords-10  ·  `high`

图片：`public/assets/decks/legacy-celestial/cards/swords-10.webp`

- **scene**: A cloaked figure stands on a stone observatory platform facing a glowing horizon, with a ring of upright swords and a fallen cloak and map arranged on the circular floor behind them beneath a star-filled sky.
- **keyObjects**: ten upright swords set point-up in a ring of stone sockets; dark tattered cloak lying spread on the platform floor; torn parchment map with drawn markings; circular stone platform engraved with concentric rings and small symbols; armillary-sphere instrument on a pedestal at left; domed colonnaded pavilion at left; broken column at right; gold border frame with the numeral X at the top
- **spatialRelations**: the ring of swords encircles the fallen cloak and map in the lower half of the image; the figure stands beyond the sword ring, between it and the horizon; the pavilion and armillary sphere sit to the left of the figure, the broken column to the right; the platform edge forms a horizontal band separating the floor from the distant water and mountains
- **uncertainDetails**: exact count of swords is ten but some blades overlap the platform edge in shadow; the two pale spheres at upper left may be moons or planets, phase not clearly resolvable; small engraved symbols on the platform are too faint to identify
- deckSpecificMotifs: constellation lines drawn between star points; diagonal nebula band across the sky; gold geometric border with astrological-style markings; engraved circular diagram on the platform floor
- emphasizedAspects: a conclusion already reached and left behind | the absence of any remaining defence or struggle | turning toward what comes after the ending

## 16. legacy-celestial / wands-04  ·  `high`

图片：`public/assets/decks/legacy-celestial/cards/wands-04.webp`

- **scene**: Four figures gather at night on a stone platform beneath a garlanded four-post canopy, with a star-filled nebula sky and a lake reflecting lantern light behind them.
- **keyObjects**: four tall wooden posts wrapped in vines and ribbons; floral garland strung between the posts; small lanterns hanging on the posts; two lanterns on the ground flanking the platform; low table or cloth spread with fruit, bottles and a bowl; stone platform with inlaid circular pattern; backpack carried by the left figure; platter of fruit held by the right figure
- **spatialRelations**: the four posts frame the group, two on each side of the platform; the garland arcs across the upper middle of the composition; the food spread sits on the ground between the two pairs of figures; the lake and distant shore lie behind the platform, below the sky
- **uncertainDetails**: whether the pale disc at upper left is a moon or a planet; exact number of small lanterns hanging on the posts; identity of the small objects on the ground spread
- deckSpecificMotifs: constellation lines drawn over the sky; gold star points scattered across the field; ringed planet with orbiting spheres; ornamental corner frames with compass-like arcs
- emphasizedAspects: arrival at a place prepared for gathering | a structure that holds and shelters those beneath it | the moment being marked with shared food and light

## 17. legacy-celestial / wands-05  ·  `medium`

图片：`public/assets/decks/legacy-celestial/cards/wands-05.webp`

- **scene**: Five cloaked figures stand in a ring on a stone plaza, each holding a glowing-tipped staff angled inward toward a luminous point at the centre of a large engraved circular diagram, beneath a star-filled night sky.
- **keyObjects**: five long staffs with glowing tips; large engraved circular diagram on the paving; central bright point of light where the staff tips converge; domed pavilion with a wheel-like instrument at left; column topped by a ringed sphere at right; ruined stone blocks and broken masonry; low horizon of water with a bright glow at the skyline; gold border frame with corner compass rosettes and the numeral V
- **spatialRelations**: the five staffs radiate inward and their lit tips meet near the centre of the circle; the figures form a rough ring around the engraved diagram; the pavilion and the columned monument flank the scene at left and right; the water horizon and distant hills sit behind the figures, below the star field
- **uncertainDetails**: whether the fifth figure at bottom centre is fully distinct from the lower-left and lower-right figures; exact count of staffs resolvable where tips overlap at the centre; whether the two small spheres are moons or planets; whether the wheel-like object in the pavilion is an instrument or a window
- deckSpecificMotifs: constellation lines linking star points across the sky; gold geometric border with compass rosettes and corner dials; engraved astrolabe-like circular diagram on the ground; very small gold star points scattered over the whole image
- emphasizedAspects: several forces converging at once on one point | no single figure dominating the others

## 18. legacy-celestial / wands-10  ·  `medium`

图片：`public/assets/decks/legacy-celestial/cards/wands-10.webp`

- **scene**: A cloaked figure seen from behind walks a starlit stone path toward a distant domed city, carrying a large bundle of glowing-tipped staffs bound across their back.
- **keyObjects**: bundle of long staffs with glowing amber tips; rope lashings crossing the figure's back and shoulders; tattered dark cloak with frayed hem; cobbled stone path; domed and towered city with lit windows; crescent moon; constellation lines and star points; circular astrological chart lines
- **spatialRelations**: the bundle fans outward above and to both sides of the figure's head; the city sits low and to the right, beyond the figure; the path runs from the bottom edge up to the figure's feet; the moon hangs in the upper-left sky above the staff tips
- **uncertainDetails**: exact number of staffs in the bundle; whether the moon is waxing or waning; whether the figure's face is turned at all; whether the water before the city is a river or a lake
- deckSpecificMotifs: constellation lines drawn between star points; gold star points scattered across the cloak and sky; circular astrological chart overlays; ornamental gold border with corner compasses
- emphasizedAspects: the load being carried | the destination close at hand | nothing set down

## 19. legacy-classic / swords-01  ·  `high`

图片：`public/assets/decks/legacy-classic/cards/swords-01.webp`

- **scene**: A young figure in a blue tunic and red cloak stands on a rocky height, holding a long sword aloft in a burst of light while papers, chains and books scatter and fall around them.
- **keyObjects**: long straight double-edged sword held point-up; wreath of leaves encircling the blade near its midpoint; red cloak streaming to the left; scattering loose papers and folded sheets; broken chains and a coiled rope-like chain; open wooden chest spilling books and papers; scattered closed books on the ground; small ring or circlet among the falling papers
- **spatialRelations**: sword rises above the figure's head into the brightest part of the sky; wreath sits on the blade between the hilt and the tip; falling papers and chains occupy the right half of the frame, below the sword; open chest and books lie at the lower right, at the figure's feet
- **uncertainDetails**: exact nature of the small ring among the falling papers; whether the coiled material is rope or chain throughout
- deckSpecificMotifs: fine cross-hatched engraving texture; ornamental corner flourishes and a numbered top cartouche; aged-paper tonality with gilt-edged border; title band lettered at the base
- emphasizedAspects: a single clean edge held up as a point of clarity | separation from accumulated clutter, bindings and written matter | precision as the source of relief

## 20. legacy-classic / swords-02  ·  `high`

图片：`public/assets/decks/legacy-classic/cards/swords-02.webp`

- **scene**: A blindfolded woman in a pale gown and blue-grey cloak sits on a stone block before a night sea, holding two crossed swords, with a crescent moon and stars above.
- **keyObjects**: two long straight swords crossed in an X before the figure's chest; cloth blindfold bound across the eyes; stone block seat with a moulded plinth base; low stone parapet or wall behind the seat; crescent moon in the upper right sky; two small four-pointed stars in the upper sky; paved stone floor with weeds and small flowers at the edges; decorative floral corner ornaments and a title cartouche reading Two of Swords
- **spatialRelations**: the crossed swords overlap the figure's torso, their blades rising above her shoulders; the stone block sits in front of a low parapet, with the sea beyond it; the crescent moon hangs above and to the right of the figure's head; the figure is centred between two flanking rocky headlands on the horizon
- **uncertainDetails**: exact count of small stars in the sky; whether the small flowers at the pavement edges are a single species
- deckSpecificMotifs: fine engraved cross-hatching imitating an old printed book plate; ornate floral corner pieces and a ruled double border; Roman numeral II in a top cartouche; title banner reading Two of Swords at the foot
- emphasizedAspects: the balance held by the blindfold rather than by sight | a decision suspended in stillness | deliberate refusal to look

## 21. legacy-classic / swords-03  ·  `high`

图片：`public/assets/decks/legacy-classic/cards/swords-03.webp`

- **scene**: A seated woman in a red cloak covers her face with one hand while three swords stand driven into a large heart on the ground before her, in steady rain beside a stormy coast.
- **keyObjects**: three swords standing point-down in a large red heart; large red heart split by a vertical crack; carved stone bench with ornamental relief; long red cloak over a pale embroidered gown; bare-branched tree at the left edge; stone ruin or wall behind the tree; distant castle on a sea cliff; rain streaks across the whole scene
- **spatialRelations**: the heart with the swords sits on the ground in front of and below the seated woman; the woman is framed between the bare tree at the left and the open sea at the right; the castle sits far in the distance on the right, beyond the shoreline; the stone bench runs behind the woman, separating her from the ruin wall
- **uncertainDetails**: whether the pale shape behind the tree is a wall or a ruined structure; the exact number of small yellow flowers at the lower left
- deckSpecificMotifs: engraved cross-hatching and fine line shading; ornate floral border with roman numeral III at the top; aged ivory paper stock with dark gilt edging; printed title band reading THREE OF SWORDS
- emphasizedAspects: pain that has already landed and is being felt bodily | the wound as a visible, physical fact rather than a metaphor | the isolation of the one who receives the blow

## 22. legacy-classic / swords-04  ·  `high`

图片：`public/assets/decks/legacy-classic/cards/swords-04.webp`

- **scene**: A young man lies with eyes closed on a stone slab beneath a stained-glass window, while four swords hang and rest around him in a vaulted stone chamber.
- **keyObjects**: three swords hanging vertically on the stone wall; one sword lying flat on the slab beside the man; red cushion under the man's head; arched stained-glass window; stone slab with carved arcade beneath; stone block wall; Roman numeral IV at top; title banner reading Four of Swords
- **spatialRelations**: the three wall swords hang above and to the right of the reclining man; the fourth sword lies on the slab in front of and below the man's body; the window is at the upper left, casting light diagonally across the wall; the man's head rests at the left end of the slab, feet toward the right
- **uncertainDetails**: whether the wall swords are three or four in number, as the hanging group is partly overlapped by shadow; the exact count of swords in the image as a whole
- deckSpecificMotifs: engraved hatching and cross-hatching; gilt-edged ivory card border with floral corner ornaments; Roman numeral IV in a top cartouche; title banner in a bottom cartouche
- emphasizedAspects: a deliberate stop, shown as a still, closed-eyed body | rest that is contained and protected within an enclosed space | nothing being solved during the pause

## 23. legacy-classic / swords-05  ·  `high`

图片：`public/assets/decks/legacy-classic/cards/swords-05.webp`

- **scene**: A young man in a torn red tunic stands on a stony shore holding three swords while two figures walk away along the water's edge, with two more swords lying on the ground before him.
- **keyObjects**: three swords held by the foreground man (one in hand, two against his chest); two swords lying crossed on the ground at lower left; torn red-brown tunic with ragged hem; leather belt with a hanging pouch; cloth wrappings around the man's lower leg; stony dirt path; shallow waterline behind the path; ornamental border with floral corner motifs and a V at the top
- **spatialRelations**: the foreground man occupies the right half and overlaps the sky and water; the two departing figures are small and set far to the left, separated from him by open ground; the two fallen swords lie in the lower-left foreground, in front of and below the standing man; the waterline runs horizontally behind the path, with mountains beyond it
- **uncertainDetails**: whether the two swords on the ground are crossed or simply overlapping; whether the small pouch at the man's belt is a separate object or part of the belt
- deckSpecificMotifs: fine cross-hatched engraving style; aged paper texture with a printed-book border; floral corner ornaments framing the image; roman numeral V in a cartouche at the top
- emphasizedAspects: the win has already happened and the field is emptying | the winner stands alone with what he took | weapons remain as residue after the dispute

## 24. legacy-classic / swords-06  ·  `high`

图片：`public/assets/decks/legacy-classic/cards/swords-06.webp`

- **scene**: A standing boatman poles a small wooden boat carrying two seated, hooded passengers and a cluster of upright swords across a wide river, with a stone tower on the left bank and low mountains on the far shore.
- **keyObjects**: wooden rowing boat with plank hull and rope lashing; long wooden pole held by the boatman; cluster of upright swords standing in the boat; stone tower with battlements on the left bank; low mountain ridge on the far shore; cloth bundle or sack in the bottom of the boat; small belt pouch at the boatman's waist; reddish-brown cloak over the boatman's shoulders
- **spatialRelations**: the boatman stands behind and above the two seated passengers; the swords stand between the seated passengers and the bow of the boat; the tower sits on the left bank, behind and above the boat; the far shore and mountains lie beyond the boat, across the water
- **uncertainDetails**: exact number of swords standing in the boat; whether the pale bundle in the boat is a sack or folded cloth
- deckSpecificMotifs: engraved cross-hatching and fine line shading; ornamental corner flourishes and ruled border; Roman numeral VI in a top cartouche; printed title band at the foot
- emphasizedAspects: a crossing in progress, moving away from what lies behind | the burden carried along with the travellers | an undramatic, steady passage rather than a decisive break

## 25. legacy-classic / swords-07  ·  `high`

图片：`public/assets/decks/legacy-classic/cards/swords-07.webp`

- **scene**: A young man in a blue tunic and red scarf walks away from an open tent, carrying a bundle of swords, while two more swords stand planted in the ground behind him and a castle sits on a hill in the distance.
- **keyObjects**: bundle of swords held against the chest, blades crossing and hilts fanning upward; two swords planted point-down in the ground at lower left; large open tent with draped fabric and a hanging banner; lit lantern on a table inside the tent; castle on a distant hill; belt pouch at the man's hip; cloth wraps around the man's lower legs; ornamental border with floral corner motifs and the numeral VII
- **spatialRelations**: the man stands between the tent on the left and the open ground on the right; the two planted swords lie in the lower-left foreground, behind and below the man; the tent occupies the left half of the frame, its opening facing the man; the castle sits small in the upper-right distance, beyond the man's path
- **uncertainDetails**: exact number of swords in the carried bundle; whether the two planted swords are the same type as those carried
- deckSpecificMotifs: engraved cross-hatching and fine line shading; aged paper texture with gilt-edged border; floral corner ornaments framing the numeral and title; wine-red banner and scarf accents
- emphasizedAspects: taking something and slipping away rather than confronting | a planned, deliberate exit | the workaround carried out in motion

## 26. legacy-classic / swords-08  ·  `high`

图片：`public/assets/decks/legacy-classic/cards/swords-08.webp`

- **scene**: A blindfolded woman in a long pale gown stands bound at the waist and arms in a marshy field, encircled by upright swords driven into the ground, with a hilltop castle under a breaking sky behind her.
- **keyObjects**: cloth blindfold tied over the eyes, its tail trailing to the right; thick rope coiled several times around the waist and pinning the arms; upright swords driven point-down into the ground, arranged in a loose ring around the figure; long pale gown with patterned hem; bare feet in wet mud; shallow water channel winding across the field; grasses and reeds at the field edges; decorative floral corner ornaments and the numeral VIII in the border
- **spatialRelations**: the woman stands at the centre with swords planted to her left, right and behind her; the castle sits far behind her on the left horizon; the water channel runs from the left middle distance toward the lower foreground; the blindfold knot and its loose end trail off to the right of her head
- **uncertainDetails**: exact number of swords fully resolvable in the ring; whether the trailing cloth at her head is the blindfold's end or a strand of hair
- deckSpecificMotifs: fine engraved cross-hatching in the manner of an old printed book; aged ivory paper with dark gilt-edged border; deep wine-red accents on the sword grips; floral corner ornaments framing the numeral and title
- emphasizedAspects: the constraint is real and physically rendered through rope and blindfold | the encircling enclosure of the swords | the bowed, still posture of being bound

## 27. legacy-classic / swords-09  ·  `high`

图片：`public/assets/decks/legacy-classic/cards/swords-09.webp`

- **scene**: A person sits up in bed at night, face buried in both hands, in a stone-walled room where nine swords hang in a vertical column on the wall beside an arched window opening onto a moonlit sky.
- **keyObjects**: nine swords mounted horizontally in a vertical column on the stone wall; wooden bed with turned posts and rumpled pillows; dark heavy blanket; glass oil lamp with a lit flame on a small wooden nightstand; stack of closed books on the nightstand; arched window opening in the stone wall; stone masonry wall; framed border with IX at the top and Nine of Swords at the bottom
- **spatialRelations**: the nine swords occupy the upper right wall, stacked one above the other; the arched window sits to the left of the swords, showing the night sky; the seated figure is below the swords, centred in the lower half; the lamp and books sit on the nightstand at the lower right, beside the bed
- **uncertainDetails**: whether the moon is a crescent or partly obscured by cloud; the exact number of books in the nightstand stack
- deckSpecificMotifs: engraved cross-hatching linework; gilt-edged ornamental border with floral corner motifs; IX numeral and title band in old printed-book typography
- emphasizedAspects: the small hours of the night as the setting | distress held privately and alone | the mind's own preoccupation pressing in from the dark

## 28. legacy-classic / swords-10  ·  `high`

图片：`public/assets/decks/legacy-classic/cards/swords-10.webp`

- **scene**: A prone figure lies face-down on stony ground with ten swords driven upright into the back, beneath a heavy clouded sky breaking into a low sunset over the sea.
- **keyObjects**: ten upright swords with round pommels and straight crossguards; dark reddish-brown cloak or mantle over the figure's back; grey-blue garment on the arms and legs; pale cuffs at both wrists; scattered stones and pebbles on the ground; sparse tufts of grass at lower left; printed border with floral corner ornaments; Roman numeral X at top and the words TEN OF SWORDS at the bottom
- **spatialRelations**: the swords are clustered in a fan across the figure's back, tallest near the centre; the figure lies in the foreground, the sea and horizon behind it; a rocky cliff rises at the left edge, meeting the water at the horizon; the sunset glow sits at the horizon on the right of centre, behind the sword cluster
- **uncertainDetails**: exact count of swords is ten as resolved, though the central cluster overlaps slightly; whether the pale band at the wrists is skin or fabric cuff; the precise nature of the reddish mass over the back, read as a cloak
- deckSpecificMotifs: fine cross-hatched engraving texture throughout; aged paper border with floral corner scrollwork; printed title and numeral in a classic serif face; restricted sepia-and-ink colour scheme
- emphasizedAspects: a conclusion that is already complete | total cessation of struggle | nothing further left to defend

## 29. legacy-forest / swords-01  ·  `high`

图片：`public/assets/decks/legacy-forest/cards/swords-01.webp`

- **scene**: A young figure in woodland clothing stands on a forest path, gripping a vine with one hand and raising a long sword aloft in the other, while a black bird perches on a mossy trunk above and light falls through the canopy.
- **keyObjects**: long straight double-edged sword with a crossguard and wrapped grip; small leafy sprig growing along the sword blade near the hilt; thick twisted vines and roots forming an arch around the figure; narrow dirt path receding into the trees; black bird perched on a moss-covered trunk; cluster of pale mushrooms at the lower left; small white star-shaped flowers among the undergrowth; carved wooden-look border frame with the numeral I at the top and the title text at the bottom
- **spatialRelations**: the sword is raised above and to the right of the figure's head, its tip near the top of the frame; the bird sits on a trunk in the upper left, above and behind the figure; the vine arch curves around the figure from lower left up over the right side; the path runs from beneath the figure's feet back into the centre of the image
- **uncertainDetails**: whether the sprig is attached to the blade or merely overlapping it; exact number of mushrooms and flowers in the foreground
- deckSpecificMotifs: wood-grain and carved-branch border framing; fern and seed-pod ornaments in the border corners; moss and vine textures covering every surface; small white star-flowers recurring in the undergrowth
- emphasizedAspects: a single clear edge held up and apart from the surrounding tangle | clarity arriving as a distinct, isolated gesture

## 30. legacy-forest / swords-02  ·  `high`

图片：`public/assets/decks/legacy-forest/cards/swords-02.webp`

- **scene**: A blindfolded woman in layered green and cream robes sits on a mossy rock at the edge of a woodland pool, holding two swords crossed over her chest, beneath a crescent moon and a pale sky.
- **keyObjects**: cloth blindfold over the eyes; two swords with ornate hilts, crossed over the chest; moss-covered boulder serving as a seat; woodland pool of still water; crescent moon in the sky; white star-shaped flowers in the lower left; mushrooms in the lower corners of the border; leafy sprigs tucked in the woman's hair
- **spatialRelations**: the woman occupies the centre, overlapping the water behind her; the two swords cross diagonally in front of her torso; the pool lies to the right and behind her, meeting a rocky far bank; the moon sits in the upper right sky above the treeline
- **uncertainDetails**: whether the small white flowers are a specific species; the exact number of mushrooms depicted in the border
- deckSpecificMotifs: botanical border of ferns, mushrooms and seed pods; wood-grain and vine framing around the card; moss and lichen textures on stone; soft misty forest depth
- emphasizedAspects: a decision held in balance | the balance maintained by the blindfold rather than by looking

## 31. legacy-forest / swords-03  ·  `high`

图片：`public/assets/decks/legacy-forest/cards/swords-03.webp`

- **scene**: A rain-soaked woman in a green cloak bends over a large wooden panel on which a red heart-shaped patch is pierced by three swords, set in a misty forest clearing.
- **keyObjects**: large weathered wooden panel or board; red heart-shaped patch of cloth or leather stitched onto the panel; three swords with round pommels driven into the patch; coarse thread and stitching along the patch edges; wicker basket at right holding folded cloth; wicker basket at left behind the woman; ceramic jug and shallow bowl at lower left; spool of dark thread beside the bowl
- **spatialRelations**: the panel occupies the centre and lower right, angled toward the viewer; the woman stands to the left of the panel, her hands at its upper edge; the three swords are clustered in the middle of the heart patch, the central one upright and the outer two angled inward; baskets and vessels flank the panel at ground level on both sides
- **uncertainDetails**: whether the heart patch is cloth, leather or painted wood; whether the small box at lower right is a chest or a book; the exact number of mushrooms in the lower-left cluster
- deckSpecificMotifs: botanical border of ferns, mushrooms and berries; rain as a continuous visual texture; hand-stitched, repaired cloth as a recurring material; muted, painterly forest realism
- emphasizedAspects: something true and painful made visible | the clarity of the wound and the pain arriving together | the wound as an object that is tended rather than hidden

## 32. legacy-forest / swords-04  ·  `high`

图片：`public/assets/decks/legacy-forest/cards/swords-04.webp`

- **scene**: A sleeping figure lies on a mossy forest floor beneath a weathered plank wall where three swords hang, with a fourth sword resting on the ground beside him.
- **keyObjects**: three swords hanging vertically on the plank wall; one sword lying horizontally on the ground in the lower foreground; weathered horizontal wooden planks forming a wall; rolled cloth bundle used as a headrest; draped cloth and belt at the sleeper's waist; hanging metal ornaments with feathers and a woven disc; pale capped mushrooms in the lower-left corner; bracket fungi on the lower-right border
- **spatialRelations**: the three hanging swords are mounted above and behind the sleeper's head and torso; the fourth sword lies below the sleeper, parallel to his body; the plank wall closes the left and centre of the frame while open forest recedes to the right; mushrooms and a dark pool occupy the bottom edge in front of the sleeper
- **uncertainDetails**: whether the hanging ornaments are purely decorative or carry symbolic intent; exact number of mushrooms in the lower-left cluster
- deckSpecificMotifs: botanical border of ferns, mushrooms and seed pods; wood-grain and moss textures throughout; Roman numeral IV in the top border; hand-lettered card title in the bottom border
- emphasizedAspects: a deliberate stop | stillness held in a sheltered place | weapons set aside rather than in use

## 33. legacy-forest / swords-05  ·  `high`

图片：`public/assets/decks/legacy-forest/cards/swords-05.webp`

- **scene**: A kneeling figure in a moss-green cloak gathers swords on a wet forest path while a second cloaked figure walks away into the misty trees.
- **keyObjects**: two swords held upright by the kneeling figure; two swords lying flat on the wet ground in the foreground; long dark cloak with ragged hem; leather belt pouch; small shoulder satchel on the departing figure; waterlogged path with standing puddles; fallen brown leaves; ornamental border with fern fronds and mushrooms
- **spatialRelations**: the kneeling figure occupies the left half, the departing figure the right background; the two fallen swords lie in the immediate foreground, below and in front of the kneeling figure; the path runs from the lower foreground diagonally back toward the departing figure; the kneeling figure is larger and nearer; the departing figure is smaller and further away
- **uncertainDetails**: whether the two upright blades are held as a pair or one is being sheathed; exact number of swords visible if any are partly hidden by the cloak
- deckSpecificMotifs: wood-grain and vine border framing the scene; fern fronds worked into the border corners; mushrooms drawn at the lower border; Roman numeral V in a cartouche at the top
- emphasizedAspects: the aftermath of a dispute rather than the dispute itself | a cost paid in solitude and in what is left behind | the departure of the other party

## 34. legacy-forest / swords-06  ·  `high`

图片：`public/assets/decks/legacy-forest/cards/swords-06.webp`

- **scene**: A cloaked figure stands in a wooden rowboat on a calm forest river, poling forward while a rack of upright swords is mounted in the boat's bow, sunlight filtering through dense green foliage.
- **keyObjects**: wooden rowboat with visible plank hull; rack of upright swords mounted across the boat's bow; long wooden pole held by the figure; small lantern hanging at the boat's prow; moss-covered tree stump with bracket fungi; cluster of pale mushrooms; white daisy-like flowers; tall ferns
- **spatialRelations**: the figure stands behind the sword rack, which occupies the boat's forward half; the pole crosses diagonally from the figure's hands down into the water at the right; the boat sits in the lower-left to centre of the frame, water extending to the right; the sunlit far bank lies beyond the water in the upper right
- **uncertainDetails**: exact number of swords in the rack, as several overlap and are partly hidden by the figure; whether the small pale shapes at the boat's prow are a lantern or a tied bundle
- deckSpecificMotifs: botanical border of ferns, catkins and mushrooms framing the card; mushrooms and bracket fungi recurring in border and foreground; muted watercolour-and-ink rendering of woodland
- emphasizedAspects: a gradual crossing away from a shaded place toward a lighter one | the burden carried along in the boat rather than left behind | movement that is steady and unhurried, not dramatic

## 35. legacy-forest / swords-07  ·  `high`

图片：`public/assets/decks/legacy-forest/cards/swords-07.webp`

- **scene**: A ragged, green-cloaked figure walks away from a small forest campsite, carrying a bundle of swords on his back while glancing back over his shoulder.
- **keyObjects**: bundle of swords strapped to the figure's back; wooden rack holding upright swords; canvas tent pitched among trees; stone-ringed campfire with charred wood; wicker basket on the ground; cooking pot and vessels near the tent; hanging dried herbs at the tent pole; fallen branches and leaf litter on the path
- **spatialRelations**: the figure is closer to the viewer than the tent and rack; the sword rack stands left of the tent, in front of it; the campfire sits between the tent and the walking figure; the figure's outstretched hand touches a tree trunk at the right edge
- **uncertainDetails**: exact number of swords in the back bundle (several overlap); exact number of swords in the wooden rack; whether the small dark shapes in the basket are objects or shadow
- deckSpecificMotifs: botanical border of ferns, seed pods and mushrooms; parchment-toned card frame with roman numeral VII; moss-and-woodgrain palette; storybook woodland realism
- emphasizedAspects: leaving a situation quietly rather than confronting it | carrying away what was taken | a backward glance that registers awareness of what is left

## 36. legacy-forest / swords-08  ·  `high`

图片：`public/assets/decks/legacy-forest/cards/swords-08.webp`

- **scene**: A barefoot, blindfolded woman in layered pale and green robes stands on a muddy forest path between two rows of upright sword-topped wooden posts, framed by an ornate botanical border.
- **keyObjects**: cloth blindfold wound around the head with a long trailing end; long pale cloth strip hanging from her hands down across her skirt; upright sword-topped wooden posts flanking the path; mossy muddy path with standing water; layered pale and green robes with a belt and small pouch; bare feet
- **spatialRelations**: the woman stands between two rows of posts, three or four posts to her left and three to her right; the posts recede into the foliage on both sides, taller in the foreground; the path runs from the lower foreground back into the misty centre; the trailing blindfold cloth and the hand-held cloth cross in front of her body
- **uncertainDetails**: exact number of posts on each side, as some are cropped or merge with foliage
- deckSpecificMotifs: sword blades replaced by carved wooden posts with metal pommels; botanical border of ferns, mushrooms, lily of the valley and rosehips; Roman numeral VIII in the top border; title banner reading Eight of Swords
- emphasizedAspects: being bound and blindfolded | the constraint being real but partial | the presence of open space around the figure

## 37. legacy-forest / swords-09  ·  `high`

图片：`public/assets/decks/legacy-forest/cards/swords-09.webp`

- **scene**: A woman sits on the edge of a bed in a rustic wooden room, face buried in her hands, while a rack of swords hangs on the wall behind her and daylight enters through a curtained window.
- **keyObjects**: wooden wall rack holding upright swords with dark blades and brass-toned hilts; bed with dark green coverlet and embroidered pillow; multi-paned window with pale curtain; potted ferns on the windowsill; small clay jug on a low table; lit candle stub on a dish; wicker baskets holding leafy plants; sprigs of fern and mushrooms in the border
- **spatialRelations**: the sword rack occupies the upper-left wall, behind and above the seated woman; the window sits to the right of the woman, its light falling across her back and the bed; the low table with jug and candle sits in the lower-left foreground, in front of the bed; baskets of greenery flank the lower corners, one left and one right
- **uncertainDetails**: exact number of swords on the wall rack, as several overlap and fade into shadow; whether the small dish object beside the candle is a second vessel or part of the candle holder
- deckSpecificMotifs: botanical border of ferns, hops and mushrooms; moss-and-wood-grain rustic interior; amber shafts of light through foliage; hand-drawn engraved linework
- emphasizedAspects: sleepless night-time distress | the mind turned inward and hidden | a private, enclosed hour

## 38. legacy-forest / swords-10  ·  `high`

图片：`public/assets/decks/legacy-forest/cards/swords-10.webp`

- **scene**: A cloaked figure kneels on a forest floor at dawn, holding out a dark cloth toward a sunlit valley, with ten sheathed swords laid in two rows on the mossy ground before them.
- **keyObjects**: ten sheathed swords with ornate hilts and scabbard tips, laid flat in two rows of five; large woven wicker basket with a strap; small wooden cup; cloth-wrapped bundle; dark green cloak spread between the figure's hands; mushrooms with pale caps growing among the ferns; fern fronds; moss and ivy ground cover
- **spatialRelations**: the two rows of swords occupy the lower half of the frame, below the kneeling figure; the basket sits between the swords and the figure's knees; the figure is silhouetted against the bright gap in the trees; the sunlit valley lies beyond and below the tree line, framed by trunks
- **uncertainDetails**: whether the small dark object beside the basket is a cup or a folded pouch; exact count of mushrooms in the border
- deckSpecificMotifs: botanical border of ferns, seed pods and mushrooms framing the scene; muted woodcut-like linework over painterly greens; Roman numeral X at the top of the frame; title banner reading Ten of Swords at the base
- emphasizedAspects: a finished state, shown as weapons laid down and no longer held | release and relief, shown in the open, unguarded posture and the cloth offered outward

## 39. legacy-moonlight / cups-03  ·  `high`

图片：`public/assets/decks/legacy-moonlight/cards/cups-03.webp`

- **scene**: Three young women in pale flowing gowns stand on a balustraded terrace at night, raising three stemmed goblets together beneath a crescent moon, with a fruit-laden table in the lower right foreground.
- **keyObjects**: three stemmed glass goblets held aloft; crescent moon; stone balustrade with turned balusters; draped table with a platter of grapes and round fruit; ornate glass decanter; small lit candle in a glass holder; flowering vines and blossoms framing the border; Roman numeral III at the top of the frame
- **spatialRelations**: the three goblets meet and nearly touch at the upper centre of the image; the three figures form a loose ring, the centre one with her back to the viewer; the table with fruit and decanter sits in the lower right, below and in front of the figures; the balustrade runs horizontally behind the figures, separating them from the water
- **uncertainDetails**: exact number of grapes and round fruits on the platter; whether the small glass object beside the decanter is a candle or a lamp; fine detail of the jewellery and chains on the figures' backs
- deckSpecificMotifs: silver linework and translucent ribbon trails; ornamental floral border with a numeral at the top and title at the bottom; low mist band at the horizon; gossamer, near-transparent drapery
- emphasizedAspects: shared company and easy togetherness | a moment of mutual acknowledgement and celebration | abundance freely laid out and offered

## 40. legacy-moonlight / cups-04  ·  `high`

图片：`public/assets/decks/legacy-moonlight/cards/cups-04.webp`

- **scene**: A seated, downcast figure rests beneath a blossoming tree beside a misty lake while a luminous spirit figure leans from the clouds offering a single cup above three cups arranged on the ground.
- **keyObjects**: one cup held out by the spirit figure; three cups standing in a row on the ground; blossoming tree with pale flowers; crescent moon; long trailing ribbons; scattered pale blossoms and small purple flowers
- **spatialRelations**: the offered cup floats above and to the right of the seated figure's head; the three ground cups sit in a row in front of the seated figure, lower right of the tree; the tree trunk rises along the left edge, arching over the seated figure; the lake and distant shore lie behind the seated figure to the right
- **uncertainDetails**: exact number of small blossoms; whether the faint shapes on the horizon are trees or mist
- deckSpecificMotifs: silver linework borders with floral corner ornaments; Roman numeral IV at the top; card title lettering at the bottom; translucent ribbon-like drapery
- emphasizedAspects: an offer that goes unseen | attention turned inward and downward | the tangible presence of what is already held

## 41. legacy-moonlight / cups-09  ·  `medium`

图片：`public/assets/decks/legacy-moonlight/cards/cups-09.webp`

- **scene**: A pale-haired woman in a translucent gown sits behind a draped stone ledge lined with glass goblets, a crescent moon and clouded sky above a shimmering sea.
- **keyObjects**: glass goblets with pale liquid arranged along the ledge; goblet held in the woman's raised hand; draped stone ledge or parapet; sheer fabric and ribbons trailing over the ledge edge; white roses and small blossoms in the lower left; hanging wisteria vines framing the top corners; crescent moon; domed pavilion with columns at the right
- **spatialRelations**: the woman sits behind the ledge, which runs diagonally across the lower half; the goblets are lined along the ledge in front of her; the pavilion stands behind and to the right of the woman; the sea and horizon lie behind the ledge, below the sky
- **uncertainDetails**: exact number of goblets visible; whether the pale shapes in the sky are birds or clouds; the precise contents of the goblets
- deckSpecificMotifs: silver linework border with IX at the top; wisteria and rose garlands framing the scene; translucent, mist-soft rendering; pale, almost colourless figure and drapery
- emphasizedAspects: a comfortable, settled situation | quiet enjoyment of what has been obtained | an abundance of gathered vessels

## 42. legacy-moonlight / cups-10  ·  `medium`

图片：`public/assets/decks/legacy-moonlight/cards/cups-10.webp`

- **scene**: A couple stands with their backs to the viewer on a misty shore, watching two children run toward a distant castle while a rainbow arcs overhead and a table of cups glows in the foreground.
- **keyObjects**: ten stemmed glass goblets arranged in an arc across the sky; a second cluster of glass goblets on a draped table in the foreground; a rainbow band; a full moon; a lit lantern with a metal frame; a draped cloth over a low table; a distant castle with a spire; scattered pale blossoms and foliage
- **spatialRelations**: the couple stands between the foreground table and the children; the children run ahead of the couple toward the water; the sky-borne goblets arc above the couple's heads; the castle sits across the water at the right horizon
- **uncertainDetails**: exact count of goblets in the sky arc; exact count of goblets on the foreground table; whether the small pale shapes near the children are petals or birds; identity of the distant building's function
- deckSpecificMotifs: silver filigree border with a numeral X at the top; watercolour wash texture with soft edges; floral wreath and trailing ribbon details; mist-veiled horizon
- emphasizedAspects: a settled, long-standing bond shown by the couple's relaxed closeness | ordinary domestic warmth in the shared table and running children | continuity across generations

## 43. legacy-moonlight / major-15  ·  `medium`

图片：`public/assets/decks/legacy-moonlight/cards/major-15.webp`

- **scene**: A horned, long-haired figure in translucent drapery sits on a stone plinth in shallow water, wrapped in fine chains, beneath a full moon in a misty blue night.
- **keyObjects**: two curved horns rising from the head; fine silver chains draped across the back, arms and lap; a padlock resting on the plinth among the chains; a stone plinth with fluted sides standing in water; a fallen horn-shaped object lying in the water at lower right; a small flame burning low at the left among the flowers; pale blossoms and vines at the left and right edges; a full moon disc in the upper right sky
- **spatialRelations**: the figure sits above the water on the plinth, which is the visual centre of gravity; chains run from the figure's shoulders and lap down over the plinth and into the water; the moon sits high and to the right, behind and above the figure's head; flowering vines frame the figure on both left and right margins
- **uncertainDetails**: whether the padlock is attached to the chains or merely resting on the plinth; the exact number of chains crossing the figure's back; whether the fallen horn-shaped object is a horn or a separate vessel; the identity of the small pale shapes drifting in the sky
- deckSpecificMotifs: silver linework border with vine ornament; roman numeral XV at the top and card title at the bottom; watercolour wash texture with soft edges; chains rendered as fine jewellery-like links rather than heavy iron
- emphasizedAspects: something has a hold | the hold is worn lightly, as ornament rather than force | the arrangement is chosen and quietly endured

## 44. legacy-moonlight / pentacles-06  ·  `high`

图片：`public/assets/decks/legacy-moonlight/cards/pentacles-06.webp`

- **scene**: A tall, pale-robed woman stands holding a hanging balance in one hand and lowering a single pentacle-embossed coin toward two kneeling, veiled figures who raise their hands to receive it, in a misty moonlit garden by water.
- **keyObjects**: hanging two-pan balance with chains, held by the standing woman; single round coin with a star/pentacle design being offered; round coins with star/pentacle designs lying on the draped cloth on the ground; coins resting in the balance pans; glowing lantern at lower right; stone balustrade and steps at left; crescent moon in the sky; flowering vines and blossoms framing the left edge
- **spatialRelations**: the standing woman towers over both kneeling figures; the balance hangs between the standing woman and the kneeling pair; the offered coin sits in the gap between the standing woman's hand and the right kneeling figure's cupped hands; coins on the ground lie in the foreground below all three figures
- **uncertainDetails**: exact number of coins on the ground cloth; whether the balance pans hold one coin each or are empty; whether the distant structure is a castle or a rocky islet
- deckSpecificMotifs: silver linework border with vine and blossom ornament; Roman numeral VI in a decorative cartouche at the top; title text 'Six of Pentacles' at the bottom; watercolour-soft edges with low mist near the horizon
- emphasizedAspects: resources moving between people | the visible terms of the exchange, shown as a balance held in view | giving and receiving as a face-to-face gesture

## 45. legacy-moonlight / pentacles-08  ·  `medium`

图片：`public/assets/decks/legacy-moonlight/cards/pentacles-08.webp`

- **scene**: A pale-haired young woman in a translucent gown sits at a wooden workbench engraving a round metal disc with a hammer and chisel, while a full moon and a distant lit city glow behind her.
- **keyObjects**: hammer held in her right hand; chisel or graver held in her left hand; several round engraved metal discs laid on the bench; metal cup holding slender tools; lit glass lantern with a warm flame; draped pale cloth over the bench edge; wooden workbench; flowering branches and wisteria vines
- **spatialRelations**: the woman sits behind the bench, her hands and tools above the discs; the lantern stands at the right end of the bench, beyond the tool cup; the moon hangs in the upper right sky above the distant city; the city and its reflection lie in the mid-distance behind the bench
- **uncertainDetails**: exact number of engraved discs visible on the bench; whether the tool cup holds chisels or other implements; whether the pale shapes in the water are reflections or mist
- deckSpecificMotifs: silver linework border with VIII and title; translucent layered fabric rendered in fine line; wisteria and blossom framing; mist-softened horizon
- emphasizedAspects: repeated, patient work on one object at a time | close, unhurried attention to detail | the unglamorous, solitary nature of the task

## 46. legacy-moonlight / pentacles-10  ·  `medium`

图片：`public/assets/decks/legacy-moonlight/cards/pentacles-10.webp`

- **scene**: A pale, mist-veiled family group gathers in a moonlit garden beside a colonnade and a still lake, with a scatter of gold pentacle discs laid on the ground before them and a white dog resting at the right.
- **keyObjects**: gold pentacle discs with engraved five-pointed stars; pale cloth or veil spread on the ground beneath the discs; stone colonnade with tall arches; hanging wisteria-like flower clusters; glowing lantern on a stone ledge at the right; white dog lying at the lower right; domed pavilion across the water at the left; pale blossoms and foliage around the group
- **spatialRelations**: the discs lie in the lower foreground, closest to the viewer; the kneeling woman and the dog flank the discs on left and right; the seated elder and child sit behind the discs, mid-ground; the standing figure with the infant is set highest and furthest right, framed by the arch
- **uncertainDetails**: exact number of pentacle discs visible, as some overlap and fade at the edges; whether the small figure held by the standing figure is an infant or a young child; whether the pale shapes at the far left are figures or foliage
- deckSpecificMotifs: silver linework border with a star at top and bottom; Roman numeral X at the top of the frame; card title lettered at the bottom; veil-like translucent drapery on the figures
- emphasizedAspects: a gathered household spanning generations | tangible, carefully laid-out wealth or legacy | continuity across time, shown by the moonlit, timeless setting

## 47. legacy-moonlight / swords-01  ·  `high`

图片：`public/assets/decks/legacy-moonlight/cards/swords-01.webp`

- **scene**: A pale-haired figure in flowing translucent robes stands on a stone plinth holding a large upright sword whose blade passes down through a floating crown, in a misty moonlit blue landscape.
- **keyObjects**: large two-handed sword with ornate crossguard, held vertically; crown of pointed metalwork pierced by the blade; stone plinth with carved tracery; long translucent veil or drapery streaming around the figure; scattered pale petals and leaf-like fragments; small white birds in flight; flowering branch with pale blossoms at lower left; arched stone frame at upper left
- **spatialRelations**: the sword is held in front of the figure's torso, blade descending past her waist; the crown sits low on the blade, below the hands, above the plinth; the plinth occupies the lower centre, the figure standing on its top edge; the moon disc sits behind and above the figure's head, upper right of centre
- **uncertainDetails**: whether the small pale shapes near the blade are petals or torn paper; the exact number of birds in flight; the faint structures at the right horizon may be towers or cloud forms
- deckSpecificMotifs: silver filigree linework; translucent layered drapery; floating petals and paper-like fragments; ornamental border with a numeral I and the card title
- emphasizedAspects: a single clear edge held upright and still | separation, shown as the blade passing cleanly through the crown

## 48. legacy-moonlight / swords-02  ·  `high`

图片：`public/assets/decks/legacy-moonlight/cards/swords-02.webp`

- **scene**: A pale-haired woman in a translucent gown sits on a stone ledge before a moonlit sea, a cloth band over her eyes and two long swords crossed in front of her chest.
- **keyObjects**: two long straight swords with silver hilts, crossed in an X in front of the figure; pale cloth band covering the eyes; stone ledge or step beneath the figure; stone balustrade post at the left edge; crescent moon in the upper right sky; small white blossoms on a branch at the upper left; scattered pale petals drifting in the air; jewelled pendant and chain at the figure's neck and waist
- **spatialRelations**: the crossed swords sit between the viewer and the figure's torso; the crescent moon hangs above and to the right of the figure's head; the balustrade post stands at the left edge, level with the figure's shoulder; the sea horizon runs behind the figure at roughly shoulder height
- **uncertainDetails**: whether the pale band is a separate cloth or a veil woven into the hair; the exact number of small blossoms on the upper-left branch
- deckSpecificMotifs: silver linework on a deep blue-lavender night ground; translucent layered veils and mist; ornamental floral border with a numeral medallion
- emphasizedAspects: a decision held in balance | the balance maintained by not looking

## 49. legacy-moonlight / swords-03  ·  `medium`

图片：`public/assets/decks/legacy-moonlight/cards/swords-03.webp`

- **scene**: A pale-haired young woman in a translucent gown stands in soft rain beside a moonlit balustrade, holding a folded letter while two ornate swords stand point-upward among flowers below her.
- **keyObjects**: folded letter or paper held in both hands; two upright swords with ornate silver hilts and crossguards; thin thorny bramble circlet woven into her hair; long trailing translucent veil or ribbon; stone balustrade with a carved urn; white blossoms and buds at lower right; rain streaks across the sky; ornamental border frame with the numeral III at top and the title text at bottom
- **spatialRelations**: the woman occupies the left half; the swords and balustrade occupy the right; the two swords rise from the lower right, crossing the lower half of her gown; the balustrade and urn sit behind and to the right of the swords; the moon hangs in the upper right, above the water and balustrade
- **uncertainDetails**: whether the circlet in her hair is thorned bramble or a beaded vine; whether the small pale shapes near the water are birds or petals; the exact number of blossoms at the lower right; whether the object in her hands is a letter, a card, or folded cloth
- deckSpecificMotifs: silver filigree linework; ornamental floral border frame; veil and ribbon dissolving into mist; rain and moonlit water as recurring atmosphere
- emphasizedAspects: something painful received and held close, in the form of a written message | clarity arriving with pain, shown as bare upright blades in open light | grief held privately and quietly rather than dramatically

## 50. legacy-moonlight / swords-04  ·  `high`

图片：`public/assets/decks/legacy-moonlight/cards/swords-04.webp`

- **scene**: A pale-haired figure in translucent white drapery lies asleep on a stone ledge beneath an arched window, while three swords hang point-down in the air above her and a fourth sword rests flat on the step below.
- **keyObjects**: three swords suspended point-down in the window opening; one sword lying horizontally on the stone step below the sleeper; ornate cushion with tassel under the sleeper's head; stone ledge or slab; arched window frame with tracery; pale blossoms and vines; sheer draped fabric over the ledge; Roman numeral IV at the top of the frame
- **spatialRelations**: the three hanging swords are centred in the window opening directly above the sleeping figure; the horizontal sword lies on the step below and in front of the sleeper; the sleeper's body spans the width of the ledge, head at left, feet toward the right; flowering vines frame the arch on both left and right sides
- **uncertainDetails**: whether the pale disc behind the arch is a moon or a light source; whether the surface at the bottom edge is water or polished stone
- deckSpecificMotifs: silver filigree linework; floral vine border framing the arch; translucent layered drapery; misty low horizon over water
- emphasizedAspects: a deliberate stop, shown as undisturbed sleep | stillness held in place, shown by the suspended blades | nothing being solved during the pause

## 51. legacy-moonlight / swords-05  ·  `high`

图片：`public/assets/decks/legacy-moonlight/cards/swords-05.webp`

- **scene**: A pale-haired figure in a translucent gown stands on a misty shore holding two swords, while a second figure walks away across shallow water toward a moonlit horizon, with three more swords lying crossed on the ground among flowers.
- **keyObjects**: two swords held upright by the foreground figure; three swords lying crossed on the ground; large pale moon in the upper right sky; scattered pale blossoms among the fallen swords; long translucent ribbons trailing through the air; shallow water with soft reflections; low rocks at the water's edge; ornamental border with a V at the top and the title text at the bottom
- **spatialRelations**: the foreground figure stands between the viewer and the departing figure; the fallen swords lie in the lower foreground, below and in front of the standing figure; the moon sits high in the upper right, above the departing figure; the waterline separates the near shore from the distant horizon
- **uncertainDetails**: exact number of blossoms in the lower left; whether the small pale shapes near the moon are birds or petals
- deckSpecificMotifs: translucent layered gowns with trailing ribbons; silver linework and watercolour softness; ornamental floral border framing the scene; low mist along the horizon
- emphasizedAspects: something spent or left behind after a conflict | distance between two parties after a dispute | the residue of a finished argument

## 52. legacy-moonlight / swords-06  ·  `high`

图片：`public/assets/decks/legacy-moonlight/cards/swords-06.webp`

- **scene**: A pale-robed figure stands poling a small wooden boat across still water at night, a second seated figure and a row of upright swords riding in the bow, with a distant spired castle on the far shore.
- **keyObjects**: small wooden boat with carved prow and stern post; long slender pole held by the standing figure; row of upright swords standing in the bow of the boat; hanging lantern with warm glow at the boat's stern; garlands of vines and small white blossoms draped along the hull; crescent moon in the upper right sky; distant spired castle on the far shore; floating pale petals on the water surface
- **spatialRelations**: the boat sits diagonally across the lower half, bow toward the right; the standing figure occupies the left of the boat, the seated figure the centre, the swords the right; the castle sits on the horizon at the right, beyond the water; the moon hangs above and to the right of the castle
- **uncertainDetails**: exact number of swords standing in the bow (appears to be six, some overlapping); whether the seated figure's face is veiled or simply turned away; whether the trailing white shapes are fabric, mist, or both
- deckSpecificMotifs: silver filigree border with VI and the card title; translucent ribbon-veils streaming from the figures and boat; vine and blossom garlands wound around the hull; pale floral sprays framing the lower corner
- emphasizedAspects: a crossing in progress, moving away from one shore toward another | the burden carried along rather than left behind | a gentle, unhurried transition

## 53. legacy-moonlight / swords-07  ·  `medium`

图片：`public/assets/decks/legacy-moonlight/cards/swords-07.webp`

- **scene**: A pale-haired figure in flowing translucent robes walks away along a misty shoreline, carrying a bundle of swords, while two more swords lie on the ground behind them and pale tents glow in the distance.
- **keyObjects**: bundle of several swords held against the body; two swords lying crossed on the ground in the lower right; long translucent layered robes; laced boots; glowing lantern on a post; pale draped tents with pennant poles; crescent moon; flowering branches and blossoms
- **spatialRelations**: the figure stands between the water on the left and the tents on the right; the two fallen swords lie in the foreground below and behind the walking figure; the tents and lantern sit in the right mid-ground, further back than the figure; the crescent moon hangs in the upper left sky
- **uncertainDetails**: exact number of swords in the carried bundle; whether the two lower swords are crossed or merely overlapping; whether the distant structure is a tent or a pavilion
- deckSpecificMotifs: silver filigree border with VII at the top; ornamental vine and blossom framing; sheer layered fabric rendered in translucent washes; low horizon mist
- emphasizedAspects: departing quietly with something taken | a backward glance that keeps watch on what is left behind | a route that skirts the camp rather than entering it

## 54. legacy-moonlight / swords-08  ·  `high`

图片：`public/assets/decks/legacy-moonlight/cards/swords-08.webp`

- **scene**: A pale, long-haired figure stands barefoot in shallow rippling water among upright swords, her eyes covered by a translucent cloth, her arms bound to her body with vines, beneath a large crescent moon in a misty blue night.
- **keyObjects**: translucent pale cloth covering the eyes; vine and cord bindings wound around the torso and arms; upright swords standing in the water; large crescent moon; rippling water surface; small pale flowers in the lower corners; ornamental border with the numeral VIII at the top; title text 'Eight of Swords' at the bottom
- **spatialRelations**: the figure stands amid the swords, which surround her at varying distances; the crescent moon sits high behind her right shoulder; swords in the lower foreground are larger and closer to the viewer than those behind her; the water plane extends from the bottom edge to a misted horizon behind the figure
- **uncertainDetails**: exact number of swords standing in the water; whether the pale band across the eyes is cloth or a wreath of blossoms; whether the trailing shapes at the left are ribbons or branches
- deckSpecificMotifs: silver filigree linework; water reflections rendered as fine concentric rings; vine-and-ribbon binding motif; ornamental floral border framing the card
- emphasizedAspects: the constraint is real and visible on the body | the blindfold as the blocking of sight | a surrounding ring of blades that is present but not touching

## 55. legacy-moonlight / swords-09  ·  `high`

图片：`public/assets/decks/legacy-moonlight/cards/swords-09.webp`

- **scene**: A long-haired figure in a pale gown sits on a bed with her face buried in her hands, while a row of swords hangs on the wall behind her and a full moon shines through an open window onto a misty shore.
- **keyObjects**: nine swords mounted horizontally on the wall; bed with layered translucent drapery; pillows behind the figure; open window with sheer lace curtain; full moon; small lit lantern on a tray at lower right; pale blossoms and foliage at lower left; carved metal bedpost at lower right
- **spatialRelations**: the swords are stacked in a vertical column on the wall to the left of the figure; the figure sits between the sword wall and the window; the moon and shoreline are seen through the window opening to the right; the lantern sits on the floor level below and right of the bed
- **uncertainDetails**: exact count of swords is nine but the lowest blades are partly obscured by the figure's hair; whether the small lights on the far shore are lamps or reflections
- deckSpecificMotifs: silver filigree linework; sheer lace and tulle textures; ornamental border with IX numeral and card title; low mist over the distant water
- emphasizedAspects: the solitary night hour | grief held privately and physically | the mind's preoccupation made visible as blades at the bedside

## 56. legacy-moonlight / swords-10  ·  `medium`

图片：`public/assets/decks/legacy-moonlight/cards/swords-10.webp`

- **scene**: A pale-haired figure in translucent white and lilac drapery lies face-down in shallow water, a cluster of silver swords rising from her back, beneath a crescent moon and a soft dawn sky.
- **keyObjects**: cluster of silver swords rising from the figure's back; crescent moon; thin chains draped between the sword hilts; small white blossoms woven into the hair; pale peony-like flowers at lower left; translucent ribbon trailing across the water; shallow rippling water; ornamental border with the numeral X at the top
- **spatialRelations**: the swords fan upward and outward from the figure's back, tallest at the centre; the figure lies between the foreground flowers and the distant horizon; the crescent moon sits upper left, above the cloud bank; the sun glow on the horizon sits to the right of the figure's head
- **uncertainDetails**: exact number of swords, as several overlap and fade into mist; whether the chains are attached to the hilts or the drapery; whether the bright horizon is a rising or setting light
- deckSpecificMotifs: silver linework on pale washes; translucent layered drapery; floral garland in the hair; ornamental botanical border
- emphasizedAspects: a conclusive ending, shown as a body at rest | stillness after struggle | release of defence

## 57. legacy-moonlight / wands-04  ·  `medium`

图片：`public/assets/decks/legacy-moonlight/cards/wands-04.webp`

- **scene**: Under a floral arch of four slender poles, a group of pale-robed women raise small cups in a moonlit garden beside a misty lake and a distant town.
- **keyObjects**: four slender poles forming an arch; garland of white flowers and leaves across the arch; trailing pale ribbons and beaded chains; hanging glass lanterns; small cups held by the figures; round table draped in pale cloth with a lantern and flowers; full moon; low lantern on the ground at lower right
- **spatialRelations**: the four poles frame the scene, two at left and two at right; the central figures stand between the poles, in front of the draped table; the lake and town lie behind the arch, below the moon; the moon sits in the upper right sky, above the town
- **uncertainDetails**: exact number of poles resolved as four, but the two rear poles are partly obscured by garland; number of small cups held by the figures; identity of the faint figures at the right edge; whether the small round object at centre is a table or a low stand
- deckSpecificMotifs: silver linework on pale ground; ribbons and beaded chains trailing from the arch; glass lanterns hung and set on the ground; low mist near the horizon
- emphasizedAspects: gathering under a structure | a moment of arrival being marked together | a framework that holds and shelters

## 58. legacy-moonlight / wands-05  ·  `medium`

图片：`public/assets/decks/legacy-moonlight/cards/wands-05.webp`

- **scene**: Five pale-robed, flower-crowned young women stand in shallow misted water among tall wooden poles, raising and crossing them beneath a crescent moon and a ruined colonnade.
- **keyObjects**: tall slender wooden poles with small twigs and leaves; long translucent ribbons trailing from the poles; flower crowns and small blossoms in the women's hair; sheer layered pale gowns; shallow water with ripples and floating petals; white blossoms on dark rocks at lower left; thin silver border frame with the numeral V at top; ruined arcade of columns at upper right
- **spatialRelations**: the poles converge and cross in the upper centre, forming an X above the figures; the central figure stands nearest the viewer, the others arranged in a loose ring around her; the ruined colonnade sits behind the figures at the upper right; the flowered rocks occupy the lower left corner, in front of the standing figures
- **uncertainDetails**: exact number of poles, several overlap and fade into mist; whether a fifth figure is partly hidden behind the central one; whether the pale disc is a crescent moon or a partly veiled full moon
- deckSpecificMotifs: silver linework border with botanical corner ornaments; flower crowns and trailing ribbons; mist-veiled ruined architecture; petals drifting through the air
- emphasizedAspects: several forces pushing at once with no agreed order | movement that is chaotic rather than hostile

## 59. legacy-moonlight / wands-08  ·  `medium`

图片：`public/assets/decks/legacy-moonlight/cards/wands-08.webp`

- **scene**: A pale-haired figure in a flowing gown stands on a flowered ledge holding a blossoming staff, while a flight of long flowering wands streaks diagonally across a moonlit sky above a misty river landscape.
- **keyObjects**: long slender wands with small white blossoms and trailing ribbons; one upright blossoming staff held in the figure's hand; large pale moon disc in the upper right sky; stone arch bridge over water at right; white roses and small pale flowers on the ledge; ornamental border frame with the numeral VIII at the top; title text 'Eight of Wands' at the bottom
- **spatialRelations**: the streaking wands run parallel diagonally from upper left to lower right, crossing the whole sky; the moon sits behind and above the wand flight in the upper right; the figure stands below the wand flight, her staff rising into the same diagonal axis; the bridge and river lie in the mid-distance to the right of the figure
- **uncertainDetails**: exact number of streaking wands (several overlap and fade at the edges); whether the small pale dots in the sky are stars or paint texture; whether the figure's staff is one of the flying wands or a separate object
- deckSpecificMotifs: silver linework and filigree border; translucent ribbon trails streaming from the wands; blossom-tipped wands; low mist over water
- emphasizedAspects: simultaneous movement of many things at once | swift, unstoppable forward motion | a brief open window of momentum

## 60. legacy-moonlight / wands-09  ·  `medium`

图片：`public/assets/decks/legacy-moonlight/cards/wands-09.webp`

- **scene**: A pale-haired woman in a flowing translucent gown leans against a tall ribbon-wrapped staff on a misty height, surrounded by a grove of slender poles beneath a gibbous moon.
- **keyObjects**: tall slender staffs rising vertically, several wrapped with pale ribbons and trailing chains; the staff the woman leans on, hung with a small crescent pendant and a ring; pale blossoms with soft petals growing at the lower left; a gibbous moon in the upper right sky; a decorative border frame with the numeral IX at the top and the title at the bottom
- **spatialRelations**: the woman stands among the staffs, with poles both in front of and behind her; the moon sits high in the upper right, above the water and distant hills; the staffs form a loose vertical screen between the viewer and the misty landscape; flowers cluster at the lower left, at the base of the nearest staffs
- **uncertainDetails**: exact number of staffs visible, as several overlap and fade into mist; whether the small pendant on the leaned staff is a crescent or a ring; whether faint shapes in the lower right mist are birds or foliage
- deckSpecificMotifs: silver linework and ornamental border framing; ribbons and trailing chains bound around the staffs; sheer layered veils drifting around the figure; low mist softening the horizon
- emphasizedAspects: still standing after a long distance travelled | leaning on what remains as support | watchfulness held quietly rather than as open alarm

## 61. legacy-shadow / cups-01  ·  `medium`

图片：`public/assets/decks/legacy-shadow/cards/cups-01.webp`

- **scene**: A hooded, faceless figure kneels in a dark stone passage, holding a chalice from which water pours through their cupped hands into a channel below, while a pale bird hovers in the lit wall behind.
- **keyObjects**: stemmed chalice with textured, mottled surface; stream of water falling from the chalice; cupped hands catching the water; stone channel or gutter running toward the viewer; cobbled stone paving; arched doorway in the wall behind; Roman numeral I at the top of the card; title text 'Ace of Cups' at the bottom
- **spatialRelations**: the figure sits between the dark left-hand depth and the lit wall on the right; the bird hovers above and to the right of the figure's head; the water falls from the chalice through the hands into the channel in the lower centre; the arched doorway recedes behind the figure's left shoulder
- **uncertainDetails**: whether the pale shape in the upper right is a bird or a winged figure; whether the faint forms on the left are steps or wall shadow; the exact number of visible stone courses in the channel; whether the figure's hands are bare or gloved
- deckSpecificMotifs: monochrome near-greyscale rendering with a trace of violet; heavy film-grain and weathered-stone texture; ornamental corner marks and a thin double border; Roman numeral and title set in a serif face
- emphasizedAspects: something opening and giving out more than can be held | capacity and flow rather than a relationship between two people | the vessel as the source of what is offered

## 62. legacy-shadow / cups-06  ·  `medium`

图片：`public/assets/decks/legacy-shadow/cards/cups-06.webp`

- **scene**: Two dark-robed figures stand facing each other in a dim stone chamber, exchanging a small cup with a flower laid across its rim, beneath a row of five lit niches.
- **keyObjects**: small stemmed cup held between the two figures; pale flower resting across the cup's rim; five wall niches each holding a stemmed goblet; stone wall with rectangular recesses; staircase at the right; cracked stone floor; Roman numeral VI at the top; text 'SIX OF CUPS' at the bottom
- **spatialRelations**: the two figures face each other across the cup at the centre; the row of five niches runs horizontally above the figures' heads; the staircase rises behind the right-hand figure; the floor's lit patch lies between and below the two figures
- **uncertainDetails**: whether the flower is held in the left figure's fingers or simply laid on the cup; the exact number of steps on the right-hand staircase; whether the faint shapes at the lower left are branches or cracks
- deckSpecificMotifs: heavy black robes with frayed, trailing hems; goblets set into wall niches rather than held; aged, distressed card border
- emphasizedAspects: an exchange between two people | something small and tender being offered and received | a remembered, enclosed place

## 63. legacy-shadow / cups-07  ·  `medium`

图片：`public/assets/decks/legacy-shadow/cards/cups-07.webp`

- **scene**: A lone ragged figure stands before a dark stone wall of arched niches, each holding a chalice, reaching toward one while touching another with a cloth.
- **keyObjects**: seven arched wall niches; chalices set in the niches; small serpent coiled above the chalice in the upper-left niche; small tower or turret above the chalice in the second upper niche; crown above the chalice in the third upper niche; leafy branch or plant above the chalice in the upper-right niche; key above the chalice in the lower-left niche; cloth held in the figure's right hand
- **spatialRelations**: four niches in an upper row, three in a lower row; the figure overlaps the lower-middle niche, standing between the two rows; the raised left hand reaches the upper-left niche; the lower-right niche holds a chalice with a dark oval disc above it
- **uncertainDetails**: the exact object above the lower-right chalice reads as a dark oval disc; whether the upper-left niche's serpent is a snake or a curved ornament; the precise number of niches fully visible at the left edge
- deckSpecificMotifs: niche-as-display-case arrangement; VII numeral at top; Seven of Cups title at bottom; aged parchment border
- emphasizedAspects: a set of distinct attractive options laid out for view | the act of reaching toward one possibility while touching another | options presented as static objects rather than plans

## 64. legacy-shadow / cups-11  ·  `medium`

图片：`public/assets/decks/legacy-shadow/cards/cups-11.webp`

- **scene**: A lone figure in a dark, tattered robe stands on a wet shore at night, holding a small cup from which a fish-like shape and droplets rise, while a lit doorway glows in a rock face behind.
- **keyObjects**: small ornate cup held in both hands; fish-like form rising above the cup; scattered spray of droplets around the fish form; arched doorway set into a rock face; dark closed door within the arch; wet sand strewn with small dark stones; tattered robe with long frayed strands trailing to the ground; Roman numeral XI at the top of the card
- **spatialRelations**: the figure stands in front of the water, with the sea behind and to the left; the lit doorway sits to the right of the figure, further back in depth; a band of reflected light runs from the doorway across the wet sand toward the lower right; the cup is held between the figure's face and the doorway, at the centre of the lit area
- **uncertainDetails**: whether the shape rising from the cup is a fish or a flame-like form; whether the droplets are water or sparks; whether the faint points in the sky are stars or image grain; the exact number of stones on the sand
- deckSpecificMotifs: near-monochrome black and silver rendering; aged paper border with worn corners; Roman numeral at the top and title at the bottom; fine speckled grain across the dark areas
- emphasizedAspects: a small, unguarded emotional opening | sincerity and inexperience | something delicate being held and offered

## 65. legacy-shadow / cups-13  ·  `medium`

图片：`public/assets/decks/legacy-shadow/cards/cups-13.webp`

- **scene**: A long-haired woman in a dark gown sits on a carved stone throne, head bowed, working with a small tool at an ornate lidded vessel resting on her lap, beside dark water under a large pale sphere.
- **keyObjects**: ornate footed metal vessel with a hinged lid, resting on the figure's lap; small slender implement held in the right hand; carved stone throne with a shell-like fan motif on its backrest; thin circlet of dark thorny branches on the head; long dark gown with embroidered trim at the neckline and cuffs; large pale mottled sphere in the upper right sky; stone steps descending at the lower right; narrow spire silhouettes on the far right horizon
- **spatialRelations**: the throne and figure occupy the left two-thirds; the open sky and water fill the right; the pale sphere sits high right, above the spire silhouettes; the vessel is centred on the figure's lap, between her two hands; the steps descend from the throne's base toward the water at lower right
- **uncertainDetails**: whether the implement is a spoon, key or pin; whether the head ornament is a thorn circlet or a thin metal crown; whether the pale sphere is fully round or slightly cropped at the frame edge; the exact number of spire silhouettes on the right
- deckSpecificMotifs: monochrome black-and-silver rendering with only a trace of violet; aged, distressed card border with a thin inner rule; Roman numeral XIII at the top and the card title in serif capitals at the bottom; gothic architectural silhouettes of spires and towers
- emphasizedAspects: close, unhurried attention to a single vessel | stillness held inside a dark, enclosing setting | depth of feeling kept private and inward

## 66. legacy-shadow / cups-14  ·  `medium`

图片：`public/assets/decks/legacy-shadow/cards/cups-14.webp`

- **scene**: A crowned, bearded man in dark robes sits on a tall gothic throne at the edge of dark water, holding a chalice in one hand and a sword hilt in the other, with water spilling from a stone channel beside him.
- **keyObjects**: spiked crown; ornate chalice held in the right hand; vertical sword with visible hilt and crossguard; tall gothic throne with pointed arch back; fish-shaped pendant on a chain; stone platform and steps; stone channel with falling water; engraved robe trim
- **spatialRelations**: the king is framed by the throne back, which rises above his head; the chalice is held out to the left, away from the body; the sword is held low at the right, its blade descending past the throne base; the water channel and falling water sit at the lower right, below the sword hand
- **uncertainDetails**: whether the object in the left hand is a sword or a staff; the exact number of points on the crown; whether the pendant is a fish or another shape; the extent of the water channel behind the throne base
- deckSpecificMotifs: gothic architectural throne; fish pendant; water channel cut into the stone base; aged, grainy card border
- emphasizedAspects: feeling held in a vessel rather than spilled | composure maintained in a dark, enclosing setting | authority that is quiet and seated rather than active

## 67. legacy-shadow / major-03  ·  `medium`

图片：`public/assets/decks/legacy-shadow/cards/major-03.webp`

- **scene**: A crowned woman kneels in a dark overgrown garden beside a stone block, pressing her hands into the soil around a small seedling, with a lit arched doorway and a tall stone wall behind her.
- **keyObjects**: spiked crown of thin points on the woman's head; small seedling with a few leaves between her hands; stone block or ledge she kneels beside; carved disc bearing a circle-and-cross symbol, lower right; arched doorway emitting pale light; cascade of water falling from a stone basin at right; stand of ripe wheat at left; tall ivy-covered stone wall
- **spatialRelations**: the woman sits in the lower centre, the wall rising behind and above her; the lit doorway stands to the left of the woman, further back in depth; the wheat stand occupies the left foreground, the carved disc the right foreground; the water cascade and column sit at the right edge, behind the stone block
- **uncertainDetails**: whether the pale light in the doorway is a lamp, sky, or opening; exact number of points on the crown; whether the wheat is fully ripe or partly dry; the precise emblem on the broken disc
- deckSpecificMotifs: engraved circle-and-cross symbol on a broken stone disc; spiked crown of thin radiating points; ruined classical column and water basin; heavy ivy over masonry
- emphasizedAspects: tending growth slowly and by hand | supplying conditions rather than harvesting | patience within an enclosed, unhurried place

## 68. legacy-shadow / major-04  ·  `medium`

图片：`public/assets/decks/legacy-shadow/cards/major-04.webp`

- **scene**: A dark, near-monochrome depiction of a crowned figure seated on an ornate throne at the edge of a stone causeway, with a fortress on a crag in the distance.
- **keyObjects**: high-backed throne with carved ram-head armrests; circular ram-head emblem on the throne back; tall staff topped with a sphere; rectangular stone block or pillar at the figure's feet; stone causeway with cracked paving; flight of steps rising to a small arched gate; distant fortress with towers on a rocky crag; Roman numeral IV at the top of the frame
- **spatialRelations**: the throne and figure occupy the left foreground; the causeway runs from the lower right toward the distant fortress; the fortress sits above and behind the figure on the horizon; the staff rises vertically between the figure and the causeway
- **uncertainDetails**: whether the figure wears a crown or headpiece; exact number of towers on the distant fortress; whether the small arched structure is a gate or a doorway; the precise colour of the drapery in shadow
- deckSpecificMotifs: ram-head carving on the throne; Roman numeral at the top of the card; title text at the bottom; weathered, grungy border
- emphasizedAspects: established structure and seat of authority | a frame built and held

## 69. legacy-shadow / major-06  ·  `medium`

图片：`public/assets/decks/legacy-shadow/cards/major-06.webp`

- **scene**: Two ragged figures stand facing each other on a cracked stone path, holding hands beneath a luminous winged shape in a dark sky, flanked by two bare trees.
- **keyObjects**: cracked stone paving forming a path; two bare branching trees; small round fruits hanging on the left tree; a serpent coiled around the trunk of the left tree; a luminous winged shape in the sky; a pale mountain peak on the horizon; tattered cloth hanging between the joined hands; a rectangular border frame with the numeral VI at the top and the words THE LOVERS at the bottom
- **spatialRelations**: the two figures face each other across the centre of the path, hands meeting at the midpoint; the winged light sits directly above and between the two heads; the fruit-bearing tree with the serpent stands to the left of the left figure; the bare tree stands to the right of the right figure; the mountain peak rises in the distance directly behind the gap between the two figures
- **uncertainDetails**: whether the tattered cloth between the hands is a garment or a separate binding; the exact number of fruits on the left tree; whether the winged shape is a single form or two meeting plumes of light
- deckSpecificMotifs: monochrome near-black rendering with silver highlights; aged, distressed border with engraved-style lettering; winged light motif in the sky; serpent coiled on a tree trunk
- emphasizedAspects: two distinct presences held in a single joined gesture | a choice framed by two differing options, one bearing fruit and a serpent, one bare | a bond formed under a shared light rather than under external authority

## 70. legacy-shadow / major-10  ·  `medium`

图片：`public/assets/decks/legacy-shadow/cards/major-10.webp`

- **scene**: A lone ragged figure climbs stone steps in a dark vaulted interior and presses both hands against the hub of a huge carved stone wheel that fills the frame.
- **keyObjects**: large segmented stone wheel with radiating spokes; carved hub boss at the wheel's centre; stone stairway of several steps; carved relief panels on the wheel's rim segments; Roman numeral X at the top of the border; title text 'WHEEL OF FORTUNE' at the bottom
- **spatialRelations**: the wheel dominates the right two-thirds of the frame and extends beyond the top and right edges; the figure stands to the left of the hub, hands meeting it at mid-height; the steps rise from the lower left toward the wheel's centre; the numeral X sits above the wheel, the title below it
- **uncertainDetails**: the exact number of spokes and rim segments, which overlap in shadow; whether the carved shapes on the rim are distinct animals or worn ornament; whether the faint violet tint is intentional or a rendering artefact
- deckSpecificMotifs: monochrome light-and-dark rendering with almost no chroma; weathered stone texture on every surface; carved animal and serpent reliefs set into the wheel's segments; aged, distressed card border with serif title
- emphasizedAspects: something is turning and is larger than the person touching it | the part that is not yours to steer | effort applied at the centre of the mechanism

## 71. legacy-shadow / major-15  ·  `medium`

图片：`public/assets/decks/legacy-shadow/cards/major-15.webp`

- **scene**: Two ragged, barefoot figures stand chained to a stone block in a dim vaulted stone chamber, with a large dark horned silhouette looming on the wall behind them.
- **keyObjects**: stone block or plinth at centre with a carved five-pointed star on its front face; two heavy chains running from the block outward to each figure; metal ring or hoop held overhead by the left figure; small arched wooden door set into the left wall; carved Roman numeral XV at the top of the card; title text 'THE DEVIL' at the bottom; large dark horned silhouette cast on the rear wall; tattered, frayed garments on both figures
- **spatialRelations**: the stone block sits at the centre of the floor between the two figures; the chains slope down from each figure's neck and hands to the top of the block; the horned silhouette rises behind and above both figures, centred on the wall; the arched door is set low in the left wall, behind the left figure
- **uncertainDetails**: whether the left figure's overhead object is a ring, hoop or shallow vessel; whether the shadow on the wall is a cast silhouette or a painted shape; exact number of chain links and whether the chains attach at the neck or the hands
- deckSpecificMotifs: aged, scratched card border with worn edges; engraved-style monochrome rendering; Roman numeral and title set in a thin serif face
- emphasizedAspects: being bound or held by something | the arrangement being one the figures remain within | a heavy, enclosed atmosphere of constraint

## 72. legacy-shadow / major-21  ·  `medium`

图片：`public/assets/decks/legacy-shadow/cards/major-21.webp`

- **scene**: A lone figure seen from behind walks through a large leafy wreath-arch toward a distant city skyline, framed by four corner portrait panels and the Roman numeral XXI above the title The World.
- **keyObjects**: large wreath of leaves forming an arch; ribbon bow tied at the top of the wreath; two thin rods or batons held one in each hand; stone step or threshold beneath the figure; cracked paving stones in the foreground; four corner portrait panels; Roman numeral XXI; title text The World
- **spatialRelations**: the walker stands inside the wreath opening, framed by its leaves; the wreath arch spans the full height of the card, its bow at the top centre; the four portrait panels occupy the four corners outside the wreath; the distant city skyline sits behind and below the walker, beyond the threshold
- **uncertainDetails**: whether the two thin rods are batons, wands or walking sticks; whether the pale ground beyond the threshold is water or stone; exact number of leaves and their species in the wreath; whether the lower-left animal head is bovine or another horned creature
- deckSpecificMotifs: four corner portrait panels replacing a single surrounding figure; wreath rendered as dense dark foliage rather than a plain ring; engraved, weathered monochrome card texture
- emphasizedAspects: a completed circuit, shown as a closed wreath ring | crossing a threshold and moving on | the whole framed and set down as a finished panel

## 73. legacy-shadow / pentacles-03  ·  `medium`

图片：`public/assets/decks/legacy-shadow/cards/pentacles-03.webp`

- **scene**: Three figures work by dim light inside a dark stone archway beneath three pointed niches, each holding a disc engraved with a five-pointed star.
- **keyObjects**: three circular discs engraved with five-pointed stars; three pointed arch niches framing the discs; large stone archway; stone workbench on trestle legs; rectangular stone block being worked; chisel or punch held by the centre figure; large unrolled sheet held by the right figure; small hand tool lying on the bench
- **spatialRelations**: the three discs sit in a row above the archway, the middle one slightly higher; the archway encloses the three figures and the bench; the bench occupies the lower centre, between the left and right figures; the right figure stands slightly further back than the left
- **uncertainDetails**: whether the right figure's sheet shows a drawn plan or plain surface; exact number of small tools on the bench; whether the left figure's hand rests on a tool or the stone
- deckSpecificMotifs: gothic pointed-arch niches; pentacles rendered as weathered stone medallions; Roman numeral III at the top; title text at the bottom
- emphasizedAspects: skilled work carried out in a shared place | the plan or drawing held alongside the material being worked | craft and structure aligned under one roof

## 74. legacy-shadow / pentacles-07  ·  `medium`

图片：`public/assets/decks/legacy-shadow/cards/pentacles-07.webp`

- **scene**: A lone ragged figure stands in a dark walled garden at night, tending a thorny vine that climbs a trellis of pentacle discs, while three more pentacle-marked planter boxes lie in the foreground and a lit archway stands at the top of distant steps.
- **keyObjects**: trellis of square wooden panels bearing four pentacle discs; thorny climbing vine with a few small leaves; long-handled hoe leaning against the wall at left; three low rectangular planter boxes in the foreground, each holding one pentacle disc; stone stairway rising at right; arched stone gateway at the top of the stairs; roman numeral VII at the top of the frame; title text Seven of Pentacles at the bottom
- **spatialRelations**: the figure stands between the trellis wall on the left and the planter boxes on the right; the three planter boxes recede diagonally from bottom-centre toward mid-right; the stairway and archway sit in the upper-right background, behind and above the figure; the hoe leans against the wall to the left of the figure
- **uncertainDetails**: exact number of pentacles on the trellis (four resolved, possibly more in shadow); whether the small pale shapes in the planters are seedlings or debris; the faint light source beyond the archway
- deckSpecificMotifs: pentacles rendered as embossed discs set into wood and soil; garden reimagined as a walled, ruined courtyard; engraved sepia border with roman numeral and title
- emphasizedAspects: stepping back to look at what has grown so far | ongoing tending labour that has not yet yielded | the question of whether to keep tending

## 75. legacy-shadow / pentacles-09  ·  `medium`

图片：`public/assets/decks/legacy-shadow/cards/pentacles-09.webp`

- **scene**: A robed figure stands on a stone terrace at night, one arm raised toward a hovering bird, beneath a vine-covered wall set with pentacle medallions.
- **keyObjects**: five pentacle medallions set in arched niches along the upper wall; four pentacle medallions set in arched niches along the lower balustrade; a bird with spread wings hovering above the raised hand; a long dark patterned gown with a trailing hem; climbing vines with leaves and hanging grape clusters; stone steps at the left; a potted plant at the lower left; a low stone balustrade running to the right
- **spatialRelations**: the figure stands between the vine-covered wall on the left and the balustrade on the right; the bird hovers above and slightly right of the figure's outstretched hand; the upper row of medallions runs horizontally across the wall behind and above the figure; the lower row of medallions sits below the balustrade line, in front of and to the right of the figure
- **uncertainDetails**: exact count of pentacle medallions in the upper row (appears five); exact count in the lower row (appears four); whether the small dark shapes among the vines are grapes or shadow; species of the bird
- deckSpecificMotifs: pentacles rendered as medallions set into masonry niches; gothic arched stonework; heavy chiaroscuro with an aged, grainy surface
- emphasizedAspects: a self-made, enclosed world of one's own cultivation | refinement and care in what has been built

## 76. legacy-shadow / pentacles-10  ·  `high`

图片：`public/assets/decks/legacy-shadow/cards/pentacles-10.webp`

- **scene**: Three figures meet beneath a dark stone archway flanked by pentacle-set niches, with a dog seated at left and pentacle-marked stones laid across the floor, a distant castle visible through the arch.
- **keyObjects**: large stone archway; six pentacle medallions set in wall niches; four pentacle-carved floor stones; key held between two hands; cobbled stone floor; distant castle with lit windows; Roman numeral X at top; title text at bottom
- **spatialRelations**: the archway frames the three figures at centre; pentacle niches are stacked three-high on each side of the arch; the dog sits at floor level to the left of the elder; pentacle stones lie in the foreground below the figures
- **uncertainDetails**: exact number of pentacle medallions in the niches (six visible, some partly shadowed); whether the object passed between the hands is a key or a small rod; whether the woman's hand rests on the man's shoulder or arm
- deckSpecificMotifs: pentacles rendered as embossed medallions in wall niches; pentacles carved into floor slabs; aged parchment border with numeral and title text; monochrome near-greyscale rendering
- emphasizedAspects: handing on of something durable across generations | a built structure that outlasts its makers | inheritance as a formal, witnessed transfer

## 77. legacy-shadow / pentacles-13  ·  `medium`

图片：`public/assets/decks/legacy-shadow/cards/pentacles-13.webp`

- **scene**: A crowned, long-haired woman in a heavy dark gown crouches in a dim overgrown garden, one hand holding a pentacle-marked disc before an open arched door in a stone wall, the other hand reaching down toward a small uprooted seedling, while a rabbit sits at the lower right.
- **keyObjects**: round disc bearing a five-pointed star, held in the woman's hand; open arched wooden door set in a stone wall; small seedling with exposed bare roots on the ground; thin spiked stem or thorn lying across the ground near the seedling; crown of small points on the woman's head; stone wall with carved panels visible inside the doorway; rabbit; tall flowering plant stems at the left edge
- **spatialRelations**: the woman's body overlaps and partly occludes the open doorway; the disc is held between the woman's hand and the dark interior of the doorway; the seedling lies on the ground directly below the woman's outstretched lower hand; the rabbit sits to the right of the seedling, facing back toward the woman
- **uncertainDetails**: whether the carved panels inside the doorway are drawers, niches or relief carving; the exact number and shape of the points on the crown; whether the thorny stem is a separate object or part of the seedling; the identity of the large vessel silhouette at the top of the wall
- deckSpecificMotifs: engraved-style monochrome rendering with heavy grain and vignette; ornamental border frame with roman numeral XIII at the top; title lettering in small caps at the base; recurring motif of a star-marked disc
- emphasizedAspects: noticing what is actually needed and tending it directly | practical, hands-on provision in a domestic or garden setting | quiet competence rather than display

## 78. legacy-shadow / pentacles-14  ·  `medium`

图片：`public/assets/decks/legacy-shadow/cards/pentacles-14.webp`

- **scene**: A robed man stands in a dark stone courtyard, holding a pentacle disc in one hand while turning a spigot that pours grain into a barrel, with a bull's head carved above a barred archway and a distant castle on a hill.
- **keyObjects**: pentacle disc with a star inscribed; stone spigot pouring grain; wooden barrels; sacks on the ground; carved bull's head; barred archway; stone wall; distant castle
- **spatialRelations**: the man stands between the viewer and the stone wall; the pentacle disc is held out to the left of his body; the spigot is mounted on the wall to his right; the castle sits on a hill in the upper-left background
- **uncertainDetails**: the exact number of barrels; whether the disc is a pentacle or a coin; the material of the sacks
- deckSpecificMotifs: carved bull's head; barred archway; grain spigot; distant castle
- emphasizedAspects: maintaining and deploying resources | long-accumulated capability | management rather than acquisition

## 79. legacy-shadow / swords-01  ·  `high`

图片：`public/assets/decks/legacy-shadow/cards/swords-01.webp`

- **scene**: A lone hooded figure stands before a stone altar in a dark vaulted chamber, gripping the hilt of a glowing upright sword whose blade throws light onto a cracked, radiating wall behind it.
- **keyObjects**: upright sword with crossguard, wrapped grip and round pommel; stone block altar with a circular carved emblem on its top; glowing blade emitting light and small drifting sparks; bare branching twigs flanking the blade at crossguard height; cracked wall with radiating fracture lines; arched doorway with a short flight of steps; tall rectangular slab leaning at the left; Roman numeral I at the top of the frame
- **spatialRelations**: the sword stands vertically at the centre, its point rising above the figure's head; the figure stands to the left of the altar, hand on the hilt; the arched doorway and steps recede to the right of the altar; the cracked wall spreads behind and above the sword
- **uncertainDetails**: whether the branching forms beside the blade are twigs, thorns or a stylised wreath; whether the circular mark on the altar top is a carved emblem or a light reflection; whether the leaning slab at left is a door, mirror or plain stone panel
- deckSpecificMotifs: aged parchment border with worn edges; engraved Roman numeral at the top; title lettering at the bottom; monochrome silver-on-black rendering
- emphasizedAspects: a single decisive point of clarity | separation of one thing from its surroundings | precision as the source of relief

## 80. legacy-shadow / swords-02  ·  `high`

图片：`public/assets/decks/legacy-shadow/cards/swords-02.webp`

- **scene**: A dark-robed woman sits on a cracked stone pavement at night, one hand raised to her head and the other holding a downward-pointing sword, with a second sword planted in the ground beside her, a moonlit sea and a dark doorway behind her.
- **keyObjects**: two swords with plain crossguards and straight blades; woman's long dark gown with lace-textured skirt; arched doorway with a panelled door and a circular carved emblem above it; stone steps leading up to the doorway; cracked stone paving with a circular sun-like medallion on the left and a crescent medallion on the right; large gibbous moon; Roman numeral II at the top of the card; the words Two of Swords at the bottom
- **spatialRelations**: the woman sits between the two swords, which splay outward and downward to her left and right; the doorway and steps stand behind her to the left, the moonlit sea opens behind her to the right; the moon hangs in the upper right sky above the water; the two circular pavement medallions lie in the lower left and lower right foreground, flanking her shadow
- **uncertainDetails**: whether the faint shape on the right horizon is a ruin, a rock or a distant figure; the exact phase of the moon, which reads as gibbous but is partly veiled by cloud
- deckSpecificMotifs: aged parchment border with a thin inner rule and corner marks; Roman numeral at the top and card title at the bottom; engraved circular medallions set into the paving; monochrome silver-on-black rendering
- emphasizedAspects: a decision held in stillness rather than acted on | the refusal to look directly, shown by the lowered, unfocused gaze and the hand covering the brow | balance maintained by the body's poise rather than by any visible evidence

## 81. legacy-shadow / swords-03  ·  `high`

图片：`public/assets/decks/legacy-shadow/cards/swords-03.webp`

- **scene**: A hooded, long-haired figure in a tattered dark coat kneels behind a large bound bundle on a wet cobbled road, gripping the hilt of a sword driven into it while two further swords stand angled in the bundle, under a stormy night sky with a distant castle silhouette.
- **keyObjects**: three swords with ornate crossguards and pommels; large rounded bundle wrapped in coarse cloth and bound with cord; chains trailing from the bundle across the ground; wet cobblestone road; bare branching tree at left; distant castle silhouette at right; numeral III at the top of the card; title text Three of Swords at the bottom
- **spatialRelations**: the central sword is held upright by the figure and points down into the bundle; the two outer swords lean inward at angles, flanking the central blade; the bundle sits in the lower centre foreground, the figure rises behind it; the road recedes from the bundle toward the castle on the right horizon
- **uncertainDetails**: whether the bundle is cloth, sack or organic mass; exact number of birds in the sky; whether the chains are attached to the bundle or merely lying near it
- deckSpecificMotifs: weathered parchment border with fine corner linework; roman numeral at the top and title text at the foot; gothic castle silhouette on the horizon; tattered, frayed garment edges
- emphasizedAspects: something true and painful made visible as a fixed, physical fact | the pain and the clarity arriving together in one image | the wound held in place rather than removed

## 82. legacy-shadow / swords-04  ·  `high`

图片：`public/assets/decks/legacy-shadow/cards/swords-04.webp`

- **scene**: A barefoot figure lies on a stone slab in a dark vaulted chamber, bandaging a forearm, beneath three swords set upright in arched wall niches and a fourth sword resting on a stone ledge below.
- **keyObjects**: three upright swords set into arched wall niches; one sword lying flat on a stone ledge in the lower right; strip of pale cloth wound around the figure's forearm; cushion behind the figure's head; tall narrow arched window with leaded lattice glazing; raised stone slab with carved arcade beneath it; short flight of stone steps at lower left; Roman numeral IV at the top of the frame
- **spatialRelations**: the three niche swords are aligned in a row above and to the left of the figure; the fourth sword lies below the slab, on a ledge nearer the viewer; the window sits at the upper left, separated from the swords by dark wall; the steps descend from the slab toward the lower-left corner
- **uncertainDetails**: whether the pale strip is bandage or torn garment; exact number of steps visible at lower left
- deckSpecificMotifs: gothic arched niches and tracery; aged, cracked stone texture; engraved-style monochrome rendering; ornamental border with numeral and title
- emphasizedAspects: a deliberate stop in activity | stillness held inside an enclosed space | attention turned to tending the body rather than to action

## 83. legacy-shadow / swords-05  ·  `high`

图片：`public/assets/decks/legacy-shadow/cards/swords-05.webp`

- **scene**: A barefoot, ragged figure stands head-down on a wet stone causeway clutching a bundle of swords, while two distant figures walk away along the same path under a stormy, moonlit sky.
- **keyObjects**: bundle of swords held by the foreground figure; two swords lying crossed on the wet pavement in the foreground; wet stone-paved causeway; ragged, torn coat and bare feet of the foreground figure; Roman numeral V at the top of the frame; title text Five of Swords at the bottom
- **spatialRelations**: the sword-bearing figure is nearer the viewer and to the left; the two walkers are smaller and further along the causeway to the right; the two fallen swords lie on the ground below and in front of the standing figure; the causeway recedes from the lower foreground toward the horizon at centre-right; the moonlit break in the clouds sits above and behind the two departing figures
- **uncertainDetails**: exact number of swords in the bundle held by the figure (several, overlapping); whether the flat dark expanse behind the causeway is water or bare ground; whether the pale disc in the clouds is a moon or a light break in the cloud; whether the distant left silhouettes are ruins or rock
- deckSpecificMotifs: engraved-style dark border with worn, distressed edges; monochrome chiaroscuro rendering with almost no chroma; Roman numeral V centred at the top; serif title text centred at the bottom
- emphasizedAspects: the cost of the win, shown as a lone, ragged, barefoot figure left behind | the other parties walking away, the dispute already over for them | what was spent rather than what was gained

## 84. legacy-shadow / swords-06  ·  `high`

图片：`public/assets/decks/legacy-shadow/cards/swords-06.webp`

- **scene**: A standing figure poles a small stone-walled boat carrying a seated hooded figure across dark water, with six upright swords set along the boat's rim, beneath a pale glow between silhouetted spires.
- **keyObjects**: small boat with a rim of stacked stone blocks; six upright swords set along the boat's rim; long pole held by the standing figure; dark water surface; distant spire-like silhouettes; pale glow on the horizon; Roman numeral VI at top; text 'Six of Swords' at bottom
- **spatialRelations**: the standing figure occupies the left half of the boat, the seated figure the right; the swords ring the boat's near and far rims, framing both figures; the boat sits in the lower third of the frame, the horizon glow in the middle distance; spire silhouettes flank the glow on both left and right shores
- **uncertainDetails**: whether the seated figure's hands are visible beneath the cloak; whether the far shore silhouettes are buildings or rock spires; exact number of swords resolvable at the boat's far rim
- deckSpecificMotifs: stone-block boat rim; swords planted upright like a palisade; grainy aged-paper border with a thin inner rule; Roman numeral and title set in serif capitals
- emphasizedAspects: a crossing over water toward a distant shore | the swords travelling with the passengers | movement that is effortful and unhurried rather than dramatic

## 85. legacy-shadow / swords-07  ·  `medium`

图片：`public/assets/decks/legacy-shadow/cards/swords-07.webp`

- **scene**: A barefoot figure in a ragged cloak walks away across a cobbled courtyard at night, carrying a bundle of swords, between two small stone pyramid-shaped structures with dark doorways.
- **keyObjects**: bundle of several swords held against the figure's chest; two upright swords standing point-down in the ground, one at each side; two small pyramid-shaped stone structures with dark rectangular doorways; cobblestone paving; ragged tattered cloak; bare feet
- **spatialRelations**: the figure stands between the two pyramid structures, closer to the right one; one upright sword is planted to the left of the figure, the other to the right; the cobbled path curves from the right structure toward the lower left foreground; the light source sits high and behind the figure, above and left of centre
- **uncertainDetails**: exact number of swords in the carried bundle (several, overlapping); whether the two planted swords are identical in length to the carried ones; whether the upper-left texture is foliage, wall or pure shadow; whether the figure's feet are fully bare or wrapped
- deckSpecificMotifs: pyramid-shaped stone huts with dark doorways; swords planted point-down in the ground; tattered, fraying cloak; aged parchment border with roman numeral VII and the card title
- emphasizedAspects: departure from a place while carrying something away | moving quietly and unseen under cover of darkness | a backward glance that keeps watch on what is left behind

## 86. legacy-shadow / swords-08  ·  `high`

图片：`public/assets/decks/legacy-shadow/cards/swords-08.webp`

- **scene**: A barefoot figure in a tattered dark robe walks away from the viewer down a wet stone passage lined on both sides with upright swords, one hand raised to a band of cloth across the eyes, toward a pale glow between dark ruined walls.
- **keyObjects**: cloth band bound across the figure's eyes; four upright swords on the left; four upright swords on the right; cross-guards and round pommels on the sword hilts; tattered, frayed hem of the robe; wet, reflective stone paving; ruined wall masses flanking the passage; printed title text VIII and Eight of Swords
- **spatialRelations**: swords stand in two parallel rows flanking the figure, left and right; the figure is centred between the two rows, slightly closer to the left row; the rows of swords converge toward a bright gap in the distance; the figure's shadow falls forward and to the lower left across the paving
- **uncertainDetails**: whether the band across the face is a blindfold or a head covering; exact count of swords, as the outermost ones are partly lost in shadow
- deckSpecificMotifs: monochrome black-and-silver rendering with a faint violet cast; aged, scuffed card border with printed Roman numeral and title; wet reflective ground used as the only secondary light source
- emphasizedAspects: being bound and blindfolded | the constraint being real

## 87. legacy-shadow / swords-09  ·  `high`

图片：`public/assets/decks/legacy-shadow/cards/swords-09.webp`

- **scene**: A figure sits on the edge of a bed in a dark room, one arm raised to pull back a curtain at a tall window, while a nine-panel wall cabinet holding nine upright swords stands to the left.
- **keyObjects**: nine-panel dark wooden wall cabinet; nine upright swords displayed one per panel; bed with rumpled dark bedding; tall window with heavy dark curtains; small round clock on a bedside table; stack of books beside the clock; bare foot on the floor; tiled floor
- **spatialRelations**: the sword cabinet occupies the left wall, above and behind the bed; the figure sits between the bed and the window, facing away from the cabinet; the window opening sits to the right of the figure, curtain drawn back by the raised hand; the bedside table with clock and books sits at the far left edge, low against the wall
- **uncertainDetails**: whether the small object on the bedside table is a clock or a lamp; exact number of books in the stack; whether the faint violet tint is in the artwork or the border
- deckSpecificMotifs: swords mounted as a wall display in a grid cabinet; aged paper border with distressed edges; roman numeral IX at the top; barefoot figure in a night interior
- emphasizedAspects: the hour of night and the sleepless interior | the mind's inventory of blades kept within arm's reach | genuine distress held in a closed room

## 88. legacy-shadow / swords-10  ·  `high`

图片：`public/assets/decks/legacy-shadow/cards/swords-10.webp`

- **scene**: A lone figure crawls forward across a cracked stone plain toward a low horizon glow, while ten swords lie arranged in two rows on a dark cloth in the foreground.
- **keyObjects**: ten swords laid in two horizontal rows of five; dark cloth or hide beneath the swords; cracked stone paving; ruined stone columns on the left ridge; bare branching tree on the right ridge; roman numeral X at the top; title text 'TEN OF SWORDS' at the bottom
- **spatialRelations**: the swords occupy the lower foreground, closest to the viewer; the crawling figure lies between the swords and the horizon; ruined columns and a bare tree frame the horizon on left and right; the horizon light sits at the vertical center of the image
- **uncertainDetails**: whether the cloth beneath the swords is a garment or a hide; the exact number of swords resolvable in the lower row
- deckSpecificMotifs: weathered parchment border with worn corners; engraved-style monochrome rendering; roman numeral at the top and title at the bottom; swords with circular pommel emblems
- emphasizedAspects: the conclusive end of a struggle, shown by the abandoned weapons laid out behind | the faint relief at the bottom, shown by the low light the figure moves toward | nothing further left to defend

## 89. legacy-shadow / swords-14  ·  `medium`

图片：`public/assets/decks/legacy-shadow/cards/swords-14.webp`

- **scene**: A crowned, dark-robed figure stands in a shadowed stone interior, driving a sword point-down into a torn document on a stone slab while his other hand holds open an iron gate onto a storm-lit landscape.
- **keyObjects**: sword held point-down, its blade catching a bright highlight; torn paper or parchment sheet split by the blade; rectangular stone slab or altar with a carved butterfly on its front face; spiked iron gate held open at the right; spiked crown on the figure's head; heavy dark cloak with a jewelled clasp at the chest; stone-paved floor; Roman numeral XIV at the top of the card
- **spatialRelations**: the slab sits in the lower foreground, in front of the figure; the open gate occupies the right third of the image, framing the exterior; the figure stands between the dark interior wall on the left and the gate on the right; the distant castle sits behind the gate, lower than the figure's head
- **uncertainDetails**: whether the sheet is a single document or two overlapping sheets; the exact number of spikes on the crown; whether the butterfly is carved or inlaid
- deckSpecificMotifs: carved butterfly emblem on the altar face; spiked iron gate with spear-tipped finials; gothic spire skyline; aged, distressed card border with Roman numeral
- emphasizedAspects: a decision fixed and made visible, pinned to the page | authority exercised from a still, unreadable stance | the boundary between an interior of rule and an outside world

## 90. legacy-shadow / wands-04  ·  `medium`

图片：`public/assets/decks/legacy-shadow/cards/wands-04.webp`

- **scene**: Two long-haired figures in dark robes stand facing each other on a cracked stone street, both reaching up to a knotted garland strung between two vine-wrapped wooden poles, with a crenellated stone building behind them.
- **keyObjects**: two tall wooden poles wrapped in dark vines and foliage; a swag of dark foliage and cloth strung between the poles, meeting at a central knot; long tattered strips of fabric hanging from the central knot; cracked stone paving underfoot; a crenellated stone building with a dark arched doorway; faint draped cloths hanging on lines at the left and right edges
- **spatialRelations**: the two figures mirror each other symmetrically about the central knot; the poles frame the figures on the outer left and right; the stone building sits behind the figures at the end of the street; the central knot hangs directly above the midpoint between the two figures
- **uncertainDetails**: whether the draped cloths at the left and right edges are hanging laundry or banners; the exact number of poles, since the outer edges are cropped and shadowed; whether the pale patch on the paving is light or a lighter stone
- deckSpecificMotifs: vine-wrapped wooden poles; tattered hanging fabric strips; monochrome near-black rendering with a faint violet cast; ornate bordered card frame with a roman numeral at the top
- emphasizedAspects: a structure that stands and can be gathered under | a moment of shared acknowledgement between two people

## 91. legacy-shadow / wands-05  ·  `medium`

图片：`public/assets/decks/legacy-shadow/cards/wands-05.webp`

- **scene**: Five hooded figures stand in a ring around a dark circular pit in a cracked stone floor, each gripping one branch of a star-shaped bundle of thorny sticks that meets at the centre above the opening.
- **keyObjects**: five thorny sticks radiating from a single central crossing point; circular dark pit or well opening in the floor; cracked stone paving slabs; stone archway in the right wall; narrow barred window high on the left wall; roman numeral V at the top of the card; title text 'FIVE OF WANDS' at the bottom
- **spatialRelations**: the sticks cross at the centre directly above the pit opening; the figures form a rough ring around the pit, each at the outer end of one stick; the pit sits in the lower-middle of the frame, ringed by the figures; the archway and window are set into the walls behind the figures
- **uncertainDetails**: exact number of figures is hard to resolve in the shadow; four are clearly readable, a fifth may be merged with the upper figure; whether the central object is a well, pit or sunken basin; whether the sticks number five or more where they overlap at the centre
- deckSpecificMotifs: thorny, bark-textured sticks rather than clean wands; a well or pit as the centre of the scene; hooded, faceless figures; aged parchment border with worn edges
- emphasizedAspects: several forces pulling at once with no agreed order | a shared point of contact that no one controls | contained, enclosed setting rather than open ground

## 92. legacy-shadow / wands-06  ·  `medium`

图片：`public/assets/decks/legacy-shadow/cards/wands-06.webp`

- **scene**: A lone ragged figure walks a lit stone path toward a distant walled gate, holding a staff topped with a laurel wreath that a hand extends from a window above, while a row of tall bare poles stands in planters along the right side of the path.
- **keyObjects**: tall staff held by the walking figure; laurel wreath with trailing ribbon at the staff's top; sleeved arm extending from the window; row of tall bare poles set in square planters; stone-paved path; arched gateway in a distant wall; shoulder bag on the walking figure; Roman numeral VI at the top
- **spatialRelations**: the wreath-bearing staff is held between the walker and the window arm, at the path's left edge; the row of planted poles runs along the right side of the path, receding toward the gate; the path curves from the lower foreground up to the lit gateway in the background; the window arm reaches from above and to the left of the walker
- **uncertainDetails**: exact number of planted poles along the path (several, partially overlapping); whether the wreath is being placed on the staff or taken from it; whether the faint violet tint is intentional or a rendering artefact
- deckSpecificMotifs: engraved, etched linework with heavy grain; near-monochrome silver-on-black rendering; aged, distressed card border; classical Roman numeral and serif title lettering
- emphasizedAspects: public recognition being conferred from above | the work being seen and named by another | a solitary figure receiving an honour while continuing forward

## 93. legacy-shadow / wands-07  ·  `medium`

图片：`public/assets/decks/legacy-shadow/cards/wands-07.webp`

- **scene**: A lone figure stands on a raised stone platform holding a long staff horizontally, while several sharpened wooden stakes rise from the dark ground below.
- **keyObjects**: long staff held horizontally by the figure; raised stone platform of stacked rectangular blocks; several sharpened wooden stakes rising from the ground; dark opening or recess in the platform's front face; ornamental border frame with corner flourishes; Roman numeral VII at top; text 'SEVEN OF WANDS' at bottom
- **spatialRelations**: the figure stands above the stakes, which point upward toward the platform; the stakes are distributed across the lower half of the frame, surrounding the base of the platform; the platform occupies the middle of the image, its top surface catching the light; the figure is centred horizontally, slightly above the vertical midpoint
- **uncertainDetails**: exact number of stakes visible, as several are cropped or lost in shadow; whether the dark shape on the platform's front face is an opening or a shadow; whether the faint ground patterning is stonework or texture
- deckSpecificMotifs: engraved-style monochrome rendering; ornate bordered card frame with corner ornaments; Roman numeral and title in serif capitals
- emphasizedAspects: standing higher than the pressure | being outnumbered by what rises from below | a position that is held rather than given

## 94. legacy-shadow / wands-08  ·  `medium`

图片：`public/assets/decks/legacy-shadow/cards/wands-08.webp`

- **scene**: A lone figure stands at a lit arched gateway in a ruined stone wall, while eight long shafts streak diagonally across a dark sky toward a distant castle silhouette above a still river.
- **keyObjects**: eight elongated shafts with fletched ends crossing the sky; arched stone gateway with an iron grille; ruined stone wall with a crenellated top; distant multi-towered castle silhouette; still river surface; Roman numeral VIII at top; title text Eight of Wands at bottom
- **spatialRelations**: the shafts sweep from upper right down toward the left, converging near the gate; the figure stands between the gate opening and the viewer, silhouetted against the light; the castle sits on the far bank at the right, below the shafts' path; the river lies between the near ruin and the distant castle
- **uncertainDetails**: exact count of the streaking shafts (appears to be eight, some partially cropped or fading); whether the faint violet tint is in the artwork or the display; whether the figure is male or female; whether the light source is a lamp, fire, or opening beyond the gate
- deckSpecificMotifs: aged, distressed card border; engraved-style monochrome rendering; gothic ruin and castle architecture; Roman numeral and title set in serif capitals
- emphasizedAspects: simultaneous, rapid movement of many things at once | a brief opening through which passage must be taken | arrival and departure across a distance

## 95. legacy-shadow / wands-09  ·  `medium`

图片：`public/assets/decks/legacy-shadow/cards/wands-09.webp`

- **scene**: A lone ragged figure stands in a stone doorway holding a long staff, framed by rows of upright wooden poles set on stone blocks along a low wall, with a distant city visible through the opening.
- **keyObjects**: stone doorframe with a rectangular opening; long staff held diagonally by the figure; upright wooden poles mounted on square stone blocks; low stone wall running left and right; cobbled paving underfoot; distant city silhouette seen through the doorway; Roman numeral IX at the top; title text Nine of Wands at the bottom
- **spatialRelations**: the figure stands inside the doorway, framed by its jambs and lintel; rows of poles recede symmetrically to the left and right of the door; the distant city sits behind the figure, visible only through the opening; the figure's shadow stretches forward toward the viewer across the paving
- **uncertainDetails**: exact number of upright poles is hard to resolve in the shadow; whether the figure's hand touches the brow or the staff; the distant city is faint and partly obscured
- deckSpecificMotifs: engraved, weathered border frame; Roman numeral at the top and card title at the bottom; near-monochrome silver-on-black rendering
- emphasizedAspects: still standing after long effort | wariness and guarded posture | distance already travelled, with the way ahead visible
