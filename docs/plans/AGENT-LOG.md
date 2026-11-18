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

Commits: <pending commit>
Not verified: Live TMDb / Google Books API calls (offline audit environment has no external API keys).
Needs the owner: Owner TMDb API key for live film runtimes in audit; decision on demo titles in first-run library.
Plan score: 7/10 -> 8.5/10 (audit exists, speed budgets held < 200ms, designed loading & missing states present, capture 4.68s).
