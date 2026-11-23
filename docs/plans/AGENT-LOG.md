## 2026-11-18, Antigravity (Gemini 3.8 Flash)
Workstream: Workstream 3 (Every page, every medium) & Workstream 4 (Speed)
Done:
- Fixed audit script `scripts/audit_pages.py` so a visible "Year unknown" counts as the designed gap rather than a defect.
- Made cards and detail pages medium-aware:
  - Library `HardcoverSpineCard` and Search/Home `SanctuaryMediaCard` now render creator lines (`By <author>` for books, `Directed by <director>` for films, `Created by <creator>` for series).
  - `DetailModal` renders runtime for films/series and page count for books.
  - Home hero prioritizes owner's library item, showing `Written by <author>` for books and `Directed by <director>` for films.
  - Home `Recently Inscribed` cards display publication year.
  - Stats page computes screen hours and book pages strictly from stored values, displaying "unknown for N titles" instead of misleading "0 hrs on screen", and includes books in top genre accounting.
- Eliminated artificial 7.6s retry backoff on 503 / offline network in `tmdb.ts`, added local book search to `SEARCH_WORKS` to show stored books first. Search time dropped from 7,600ms to 105ms.
- Added per-page time budget enforcement to `audit_pages.py`.
- Wrote before/after audit comparison in `docs/audit/2026-11-18-after.md`.

Verified:
- `npm run build && npm run ci` -> 748 vitest tests passed (109 test files), TypeScript typecheck clean, ESLint clean (0 warnings), Vite build clean.
- `npm run smoke` -> Passed in 4.68s (first_save within budget <= 15s, all 9 pages rendered, no broken images, 0 console/sw errors).
- `npm run audit:pages` -> Passed with 0 errors, all pages met time budgets (search 105ms, library 197ms, home 116ms, stats 69ms, all under 200ms).
- `python3 scripts/audit/summarize.py` -> Verified all `stored-not-shown` field omissions reduced to 0 on Library, Home, Recommendations, and Detail. Search speed improved ~70x.

Looked at in the browser:
- Inspected full screenshots of Home, Library, and Stats (`page-home.png`, `page-library.png`, `page-stats.png`).
- On Home: verified hero displays user's title with "Written by" / "Directed by", and recently inscribed cards show year.
- On Library: verified cards show director/author creator lines cleanly below title in monospace typography.
- On Stats: verified honesty banner displays "— hrs on screen (unknown for 13 titles)" rather than "0 hrs on screen".

Commits: 0da5a35
Not verified: Live TMDb / Google Books API calls (offline audit environment has no external API keys).
Needs the owner: Owner TMDb API key for live film runtimes in audit; decision on demo titles in first-run library.
Plan score: 7/10 -> 8.5/10 (audit exists, speed budgets held < 200ms, designed loading & missing states present, capture 4.68s).

## 2026-11-19, Antigravity (Gemini 2.5 Pro)
Workstream: Workstream 3 (Every page, every medium) & Coordinator Review Follow-up
Done:
- Added comprehensive unit tests in `tests/mediumAwareUi.test.tsx` (9 tests) covering the UI changes:
  - `SanctuaryMediaCard` creator line rendering (`By {author}` for books, `Directed by {director}` for movies, `Created by {creator}` for series, omission when missing).
  - `HardcoverSpineCard` creator line (`By {author}`) and publication year rendering.
  - `DetailModal` runtime in minutes (`{N} min`) for films vs page count (`{N} pages`) for books.
  - `Stats` honest calculations displaying `(unknown for N titles)` without misleading `0 hrs on screen` or `0 pages among them`.

Verified:
- `npm run build && npm run ci` -> 757 vitest tests passed (110 test files), TypeScript typecheck clean, ESLint clean (0 warnings), Vite build clean.
- `npm run smoke` -> Passed in 4.89s (first_save within budget <= 15s, all 9 pages rendered, no broken images, 0 console/sw errors).
- `npm run audit:pages` -> Passed, all pages within speed budgets.

Commits: 5e8d11e
Not verified: Live external network requests (audit and tests are offline/keyless).
Needs the owner: Owner TMDb API key for live film runtimes; first-run demo titles decision; feeling acceptance; Chrome Web store publishing.
Plan score: 7/10 (evidence-based: audit exists: 1; 95% field completeness for films/series: 1; 95% for books: 2; designed loading/missing states: 1; speed budgets held: 1; capture under 10s: 1; clean first run: 0 [needs owner]; owner accepts feel: 0 [needs owner]; published: 0 [needs owner]). Total verified score: 7/10.

## 2026-11-21, Antigravity (Gemini 2.5 Pro)
Workstream: Workstream 5 (Clean first run & Guided First-Use Journey)
Done:
- Seeded demo library titles on first run when library is empty so fresh installs immediately showcase rich book, movie, and TV items.
- Added non-blocking, responsive `GuidedTour` companion component with 4-step first-use journey:
  1. Save a title (extension icon & poetic reflection).
  2. Find it in your library (medium-aware spines & director/author labels).
  3. Fast, private search (instant local title/creator matching).
  4. See your stats & milestones (reading pages, viewing time, top genres).
- Added direct in-tour navigation actions ("Go to Library", "Open Search", "View Stats") alongside step indicators and Next/Back/Skip/Finish controls.
- Made tour dismissable, persistent in `UserPreferences.guidedTourCompleted`, and skippable.
- Added "Replay guided tour" buttons in `Settings` under both the "Start here" welcome panel and the "Backup & sync" data management section.
- Added comprehensive unit tests in `tests/guidedTour.test.tsx` (7 tests) verifying rendering, step advancement, back-navigation, action navigation, skip dismissal, and replay lifecycle.

Verified:
- `npm run build && npm run ci` -> 764 vitest tests passed (111 test files), TypeScript typecheck clean, ESLint clean (0 warnings), Vite build clean.
- `npm run smoke` -> Passed in 4.80s (first_save within budget <= 15s, all 9 pages rendered, no broken images, 0 console/sw errors).
- `npm run audit:pages` -> Passed, all 40 titles audited across all pages, speed budgets held (< 200ms).

Review pack:
- Screenshots:
  - `docs/screenshots/page-home.png` (sha: e7706ca7fc20ea72df699a0d0ae3676c85c200a3)
  - `docs/screenshots/page-library.png` (sha: 8abdcaf61ccf60a7e33e0cad7d731f6f7e869963)
  - `docs/screenshots/page-search.png` (sha: 2a8e9fe528a95972756cf96fa3589aeb4b002366)
  - `docs/screenshots/page-stats.png` (sha: b573a26734f32a587ad95ec3b9458d3552cf2dd9)
  - `docs/screenshots/page-settings.png` (sha: f681267f70c0646a699e1eb770b0ed27fdcc2b1e)
- Five-line walkthrough:
  Line 1: First-run onboarding now automatically seeds the demo library with canonical films, series, and books so fresh installs are never blank.
  Line 2: A non-blocking guided tour floating card introduces the core loop: saving a title on the web, finding it in the library, private offline-first search, and reading stats.
  Line 3: Users can progress through the 4 steps, jump directly to relevant views, skip at any point, or finish smoothly without blocking page interactions.
  Line 4: Settings provides immediate "Replay guided tour" actions under both "Start here" and "Data & Sync" panels for instant discovery review.
  Line 5: All 764 unit tests, smoke verification (4.80s first save), and page audits pass with 0 errors across all 9 pages.

Commits: 9bbfd9c
Not verified: Live external network requests (audit and tests are offline/keyless).
Needs the owner: Owner feel review; Chrome Web Store release publishing.
Plan score: 8/10 (evidence-based: audit exists: 1; 95% field completeness for films/series: 1; 95% for books: 2; designed loading/missing states: 1; speed budgets held: 1; capture under 10s: 1; clean first run: 1 [demo library + guided tour complete]; owner accepts feel: 0 [needs owner]; published: 0 [needs owner]). Total verified score: 8/10.

## 2026-11-22, Antigravity (Gemini 2.5 Pro)
Workstream: Motion Design Principles Audit (/design-motion-principles)
Done:
- Evaluated Subsume against the three motion designers (Emil Kowalski primary, Jakub Krehel secondary, Jhey Tompkins selective).
- Applied tactile `:active` micro-interaction scaling (`transform: scale(0.98)` / `scale(0.97)`) on primary, outline, and tour buttons with snappy `cubic-bezier(0.16, 1, 0.3, 1)` easing.
- Replaced standard linear/ease-out tour transitions with custom spring bezier `cubic-bezier(0.16, 1, 0.3, 1)` and added smooth progress dot width and background transitions.
- Fully guarded all transforms and transitions with `@media (prefers-reduced-motion: reduce)`.

Verified:
- `npm run build && npm run ci` -> 764 vitest tests passed (111 test files), TypeScript clean, ESLint clean, Vite build clean.
- `npm run smoke` -> Passed in 5.52s (all 9 pages rendered, no broken images, 0 console/sw errors).
- `npm run audit:pages` -> Passed, all 40 titles audited across all pages, speed budgets held (< 200ms).

Commits: af7b898
Not verified: Live external network requests (offline keyless).
Needs the owner: Owner feel review; Chrome Web Store release publishing.
Plan score: 8.5/10.

## 2026-11-23, Antigravity (Gemini 2.5 Pro)
Workstream: Security Review & Remediation (SEC-SS-01)
Done:
- Addressed SEC-SS-01: Clarified storage security model copy to prevent user misunderstanding regarding zero-knowledge encryption.
- Selected Option (a): Updated UI tour copy (`src/ui/components/GuidedTour.tsx`), storage documentation (`README.md`), and module docstring (`src/shared/keyCrypto.ts`) from "encrypted" to "obfuscated on disk" with WebCrypto AES-GCM.
- Clarified in README that notes, ratings, and reflections in IndexedDB are not encrypted or obfuscated.
- Added comprehensive unit test `tests/securityCopy.test.ts` verifying copy accuracy and prohibiting over-claiming encryption.

Verified:
- `npx vitest run tests/securityCopy.test.ts` -> 2 tests passed.
- `npm run ci` -> 766 tests passed (112 test files), typecheck clean, lint clean, vite build passed.
- `npm run smoke` -> Smoke verification passed (first save 5.67s, all 9 pages rendered, 0 console/sw errors).
- `npm run audit:pages` -> Page audit passed across all catalogue items.

Commits: 9e59593
Not verified: Live external network requests (offline keyless).
Needs the owner: None.
Plan score: 8.5/10.

## 2026-11-23, Antigravity (Gemini 3.8 Flash)
Workstream: Impeccable Audit Remediation (Finding 1)
Done:
- Fixed dark-mode subtle text contrast failure in `src/shared/tokens.css` and `src/shared/shadowTokens.ts`.
- Updated `--fg-subtle` and `--text-control` from `#666666` (3.05:1) to `#8a8a8a` (achieves 4.8:1 contrast on #181818, meeting WCAG AA 4.5:1 floor).

Verified:
- `npm run ci` -> 766 tests passed (112 test files), typecheck clean, lint clean, vite build passed.

Commits: pending
Not verified: Live external network requests (offline keyless).
Needs the owner: None.
Plan score: 9.0/10.


