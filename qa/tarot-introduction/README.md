# What is Tarot page checks

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 8789
BASE_URL=http://127.0.0.1:8789 node qa/tarot-introduction/check.mjs
```

Use the actual Vite port if it changes. `PW_CORE` may specify a local playwright-core module; the default follows the repository QA setup. Chrome is required.

Coverage: Home has no embedded introduction; desktop navigation and mobile Menu open `/what-is-tarot`; all four chapters and five process steps render; zh/en at 375, 390, 430, 1440px; Escape closes Menu; CTA is keyboard accessible and at least 56px; language switching updates content; first-time readers go to the guide, returning readers go to decks; visiting the page preserves the active session.

Tests use isolated browser storage and the existing deterministic fixture. No real AI calls. Screenshots/results: `output/playwright/tarot-introduction/`.

Related regressions: `qa/onboarding/check.mjs`, `qa/reading-completion/check.mjs`.
