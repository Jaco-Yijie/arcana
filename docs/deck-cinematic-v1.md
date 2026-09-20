# Arcana — Deck-Aware Cinematic Hero V1

Implemented on top of the existing uncommitted user, admin, intake, visual-system and reading changes. Those systems and card asset manifests were preserved. This report concerns this turn's cinematic changes only.

## Registry and availability

The registry contains ten decks. `isDeckPlayable` currently permits five: `legacy-moonlight`, `legacy-classic`, `legacy-forest`, `legacy-celestial`, `legacy-shadow`. The artwork decks `ethereal`, `elysian`, `opaline`, `wonderland`, `classic` do not have approved complete playable sets. They receive independent scenery profiles, but remain disabled and labelled “筹备中 / In preparation” in the Home switcher. No card artwork is borrowed from another deck.

## Scene comparison

| Deck | Background world | Motif / texture | Motion | CSS 3D behavior | Reading atmosphere |
|---|---|---|---|---|---|
| 空灵 / ethereal | Open moonlit cloud strata | Veils / grain | 18s veil drift | 7° fan, center Z55 | Blue-gray, diffuse veils |
| 极乐之影 / elysian | Eclipse inside a columned temple | Heraldry / engraving | 24s orbit | 5° fan, center Z45 | Olive gold, recessed pillars |
| 蛋白潮汐 / opaline | Pearl above layered tidal water | Ripples / water | 14s tide | 9° fan, center Z60 | Pearl violet, quiet wave bands |
| 仙境之影 / wonderland | Night forest with thorn portal | Flowers / fibres | 19s organic sway | 11° fan, center Z50 | Violet forest, faint branches |
| 经典 / classic | Window, lamp-like light and open folio | Book corners / fibres | Static architecture | 6° fan, center Z35 | Dark amber, manuscript warmth |
| 月光 / legacy-moonlight | Crescent observatory above mountain steps | Lunar orbit / grain | 16s floating | 8° fan, center Z65 | Midnight blue, soft lunar motif |
| 古典 / legacy-classic | Engraved solar diagram | Sun rays / engraving | 28s orbital | 5° fan, center Z40 | Antique gold, restrained solar lines |
| 森语 / legacy-forest | Tree cathedral with diagonal canopy light | Ferns / fibres | 20s branch sway | 10° fan, center Z55 | Moss green, quiet woodland shadow |
| 星图 / legacy-celestial | Angular stellar observatory and nebula | Polyhedron / grain | 22s breathing | 7° fan, center Z70 | Indigo, subdued star geometry |
| 幽影 / legacy-shadow | Dark mirror threshold between curtains | Narrow light slit / engraving | 26s breathing | 4° fan, center Z45 | Near-black violet, muted mirror frame |

Background images plus transparent foregrounds are original SVG paths, not variations of a common moon graphic. QA screenshots deliberately hide cards and copy so composition can be compared independently.

## Behavior

Home now fills the viewport width and layers scenery, directional light, deck texture, foreground art, three real hero cards and UI. Brand and CTA no longer wait on the old multi-second reveal sequence. Navigation has deck-colored translucent glass; login/admin links, mobile menu and language controls are preserved.

The profile defines background media (`image`, `video` with poster, or `procedural`), overlay, colors, texture, motion personality, parallax distance, three card IDs and per-deck card pose. Video slots are supported but no video is configured or downloaded. Video failure uses its poster and then the procedural fallback; mobile/reduced-motion playback pauses.

A selection acquires a synchronous lock before starting any work. Only the requested world's background, foreground and three thumbnail cards are prepared. When ready, old and new layers crossfade for 1000ms; at most two worlds and two card groups are mounted during the fade. On completion the outgoing group is unmounted. Failed or timed-out preparation keeps the original selection and displays a translated retry message. Initial background failure retains a deck-specific SVG signature behind functional controls. Slow requests show a loading status; preparation has an 8-second ceiling, separate from the 1-second visual transition.

Desktop fine pointers update CSS variables via an event-driven requestAnimationFrame, with no idle pointer loop: background 3px, cards 8–10px, foreground 15–18px. Card perspective, rotateY, rotateZ and Z35–70 create depth without WebGL. Different decks use floating, orbital, tide, branch sway, breathing or static motion.

`DeckAtmosphere` uses the existing effective-deck hook, so Spread follows current selection and locked Shuffle/Draw follow the frozen session. Reading receives the session deck override even after completion. Reading scenery is 24% opacity, foreground 22%, light 20%; overlay motion runs four times slower. Existing dark reading paper, text and AI/streaming logic remain intact.

Mobile retains scenery, card poses, foreground art and crossfade, but removes pointer movement, continuous card float, extra lighting and glass blur. Reduced motion stops continuous movement and keeps a 180ms opacity transition. The switcher scrolls horizontally and exposes native buttons, pressed states, focus rings and loading/error announcements. All new UI strings use the existing single-language i18n resources; no paired-language product copy was introduced.

## Files changed in this turn

Existing files:
- `src/pages/HomePage.tsx`
- `src/components/immersive/useHeroDepth.ts`
- `src/atmosphere/DeckAtmosphere.tsx`
- `src/main.tsx`
- `src/i18n/locales/zh-CN.json`
- `src/i18n/locales/en-US.json`
- `package.json` (adds cinematic test to build; no dependencies)
- `scripts/release-check.ts` (profile-based card budget, locale-aware font preload, translated-question privacy assertion; total bundle budget retained)

New files:
- `src/atmosphere/cinematic/profiles.ts`
- `src/atmosphere/cinematic/variables.ts`
- `src/atmosphere/cinematic/CinematicWorld.tsx`
- `src/atmosphere/cinematic/DeckAtmosphereSwitcher.tsx`
- `src/atmosphere/cinematic/TransitionLock.ts`
- `src/atmosphere/cinematic/useCinematicTransition.ts`
- `src/styles/cinematic.css`
- `public/assets/cinematic/{deckId}.svg` and `{deckId}-overlay.svg` for all ten IDs; asset README
- `tests/cinematic.test.ts`
- `qa/cinematic/check.mjs`, `qa/cinematic/measure.mjs`
- this report

QA artifacts are under `output/playwright/cinematic/`. The extra reading specificity evaluation also wrote `qa/reading-specificity/results.json`; it did not change prompts or AI behavior.

## Local measurements

Production build served by Vite preview, desktop Chrome, 1440×960, fresh browser contexts, no network throttling. Single-run numbers are indicative, not field Core Web Vitals or mobile GPU guarantees.

| Metric | Before | After |
|---|---:|---:|
| LCP | 2116ms | 212ms |
| CLS | 0.0000575 | 0.0000508 |
| 2-second RAF sampling | ~60 FPS | ~60 FPS |
| Loaded img resource bytes | 30,876 | 31,622 |
| Main JS | 316.38 KB | 323.86 KB |
| Main JS gzip | 102.91 KB | 105.48 KB |
| Main CSS | 93.64 KB | 103.44 KB |
| Main CSS gzip | 18.69 KB | 20.45 KB |
| Active videos | 0 | 0 |

All new SVG scenery totals 47,895 bytes across twenty files. This is the entire library, not the first-screen download. Main bundle delta is about 7.4 KB raw / 2.6 KB gzip. No dependencies or fonts were added. LCP improvement chiefly reflects removal of the old delayed brand reveal; it is not evidence of an equivalent network-speed improvement.

## Validation and remaining issues

Passed: typecheck, lint (existing warnings), build; build includes i18n, deck, layout, artwork, design and five new cinematic tests. Offline reading evaluation: 120 assertions; reading prompt tests: 42; intake tests: 23; engine: 64; performance: 30. Browser checks cover all ten scene screenshots, four real deck changes, locking, lazy requests, failure/retry, initial-media fallback, live language switching, Chinese/English at 375/390/430px, reduced motion, and Spread/Shuffle/Draw/completed Reading deck mapping.

Release check is NOT fully green: 69/70 pass. The unchanged 760 KiB total-JS budget fails at about 1424 KiB across all chunks. The baseline already contained about 1416 KiB, including lazy admin charts and language bundles. This turn adds about 8 KiB to total JS. The budget was not raised, and unrelated admin/i18n features were not removed to hide the failure.

An extra `reading:specificity` script was mistakenly included with offline checks; it actually issued 15 real model requests and finished before the stop attempt. It passed 131/134 checks; failures concern invented numeric detail and a templated relationship recommendation. This task does not alter AI content logic, so those failures were recorded rather than changing the prompt. No further remote model evaluation was run.

The five incomplete artwork decks remain unavailable for real readings. Their new backgrounds are ready, but complete approved card assets are still required. No deployment or Git push was performed for this task.

## Publication scope

The publication branch is based on GitHub `0a50bde` and applies only the cinematic changes above. Unpublished local account/admin work remains in the original workspace. Both normal and Streamlit builds pass on this publication branch, and `streamlit_build/` is regenerated for Community Cloud. The earlier measurements describe the original local workspace, not the smaller publication branch. The existing Streamlit single-chunk size warning remains visible.
