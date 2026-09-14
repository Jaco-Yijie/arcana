# First-time experience checks

Build the app, then start a production preview:

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 8789
```

Use the actual port shown by Vite if it changes:

```sh
npm run onboarding:check
BASE_URL=http://127.0.0.1:8789 node qa/onboarding/check.mjs
```

The browser test follows the existing QA convention: `PW_CORE` can point to a locally installed `playwright-core` module; Chrome is required. No application dependency is added.

Coverage:
- Fresh storage: Cover → Home → guide → question input; random entry preserves its mode.
- Three steps, previous/next and keyboard CTA; focus follows chapter changes.
- Both languages at 375, 390, 430px; Home no longer embeds the introduction; the guide has no horizontal overflow.
- Completion survives a new tab; returning users skip the cover and guide.
- Language switching preserves the current guide step.
- Settings replay preserves existing session data and returns to Settings.
- State checks cover existing guidance/session/journal, malformed storage and storage failure.

Browser data is isolated; the old-session case reuses the deterministic reading-completion fixture. No real AI requests are sent. Screenshots/results are in `output/playwright/onboarding/`.
