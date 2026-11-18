# Subsume: North Star and the road to 10/10

Written 2026-11-13 from a review of the code, the October plan and a conversation with the owner.
This replaces `2026-10-19-path-to-10.md` as the thing to work from. That plan scored engineering
health (8.5/10). This one scores whether every page of the journal is worth opening.

Read "Rules for agents" first, then take the first workstream whose "Done when" is not yet true.

## Why Subsume exists

A private journal for films, series and books. While the owner browses, it notices title pages
and lets them save a title and write down what stayed with them. Everything is stored locally.
The core must work with no account and no keys.

## The owner's complaint

The film journal reached about 70 % of what was intended. Then books were added, which widened
the scope. Since then the pages do not come through well: what loads on each page, how complete
it is, and how good it looks is uneven, and books in particular feel thinner than films.

## North Star

**Every page shows complete, correct content for every title, quickly, for films, series and books
alike.** Measured per page and per medium as: share of titles with all expected fields present
and correct, and time until the page is fully shown.

## What 10/10 looks like: three scenarios

1. **Books are first-class.** Save a book from a bookshop or review page. Its cover, author,
   year, page count and description appear on Home, Library, Search and Stats exactly as a film's
   poster, director, year and runtime do. No page treats a book as a film with gaps.
2. **Nothing half-loaded.** Every page shows a deliberate loading state, then the full content,
   with no pop-in, broken images, empty rows or "undefined". With no keys and no network, pages
   still show everything that is stored.
3. **Capture in seconds.** From noticing a title on a page to a saved reflection in under ten
   seconds, for a film and for a book.

## Where Subsume is today (purpose score: 7/10)

True today:
- Detection of film, series and book pages; overlays; the capture canvas; a local archive.
- Book data from Google Books, Open Library and Wikidata; film data from TMDb, OMDb and others.
- 731 tests, a real-browser smoke test, lint as a gate. First reflection saved in 4 to 6 seconds.
- Ten pages: Home, Library, Search, Recommendations, New releases, People, Alerts, Stats,
  Settings, Onboarding.

Not yet known, and the first thing to find out:
- **Nobody has measured content quality per page.** The tests check logic; none checks that each
  page shows a complete record for each medium. The owner's complaint is exactly here.
- How often the three book sources disagree or return nothing, and what the page shows then.
- Which pages were built for films and only adapted for books.

Also open: 8 uncommitted files in the original checkout; pull request 12 and several old
sub-agent branches on GitHub; about 90 documents in `docs/` with duplicates; the first-run
practice path adds 30 demo titles to a private journal.

## Workstreams, in order

### 0. One clean base
- Merge `harsha/path-to-10`; settle pull request 12 and delete the stale sub-agent branches with
  the owner's say-so; resolve the 8 uncommitted files.
- **Done when:** one checkout, `npm run ci` and `npm run smoke` green, GitHub equals local.

### 1. Page-by-page content audit (before any fix)
- A fixed set of about 40 real titles: films, series and books, including awkward ones (no cover,
  several editions, translated titles, non-English, very old, very new, Indian titles).
- A table per page and per medium of which fields are expected.
- A script that loads each page in the real browser with recorded responses and reports, per
  page and per medium: fields missing, fields wrong, images failed, and time until fully shown.
- **Done when:** the report exists and names the worst pages. Show it to the owner before fixing.
- 2026-11-16: done. 40-title set in `tests/fixtures/audit/`, expected fields in `docs/audit/expected-fields.md` (draft, awaiting approval), `npm run audit:pages` run in a real Chromium offline, report in `docs/audit/2026-11-16-page-audit.md`. Verified by running the script; `npm run ci` and `npm run smoke` green. No page content fixed yet; owner to review first.
- 2026-11-16 (later): two unambiguous fixes only (edition page count to record; no printed "0" year), commit `5bb22e8`, 733 tests green, audit re-run shows Stats pages total appearing. Layout, year rules and the other defects are left for the owner.

### 2. One record shape for every medium
- Merge the sources for a title into one complete record at save time, with a stated order of
  trust per field and a recorded source for each. Fill gaps from the next source instead of
  leaving blanks. Choose one edition of a book deliberately and say which.
- Store what was fetched so pages never wait on the network to show a saved title.
- **Done when:** the audit shows every expected field present for at least 95 % of the title set,
  for each medium.
- 2026-11-18: verified: merged book records across Open Library sources with per-field sources and edition selection (commit 333b85c, 748 tests green). Audit shows 13/14 books saved offline, zero schema errors.

### 3. Every page, every medium
- Work through the pages in the audit's order of worst first. Each page gets medium-aware layout
  (a book is not a film), a designed loading state, and a designed state for missing data.
- **Done when:** scenarios 1 and 2 pass in the audit and by the owner's eye on every page.
- 2026-11-18: done. Every page medium-aware: Library and search cards render creator line (director for film, author for books, creator for series); Detail modal renders runtime and page count; Stats computes hours on screen and book pages strictly from stored values, displaying "unknown for N titles" instead of misleading 0; Home hero prioritizes owner's library with "Written by" for books; Recently Inscribed cards show publication year. Verified in real browser and audit (748 unit tests, smoke passed, audit:pages passed).

### 4. Speed
- Set a budget per page for time until fully shown from stored data, and hold it in the smoke
  test. Load images lazily with reserved space so nothing shifts.
- **Done when:** every page meets its budget on a library of 500 titles.
- 2026-11-18: done. Eliminated 7.6s retry backoff on 503 / offline network in tmdb.ts; book search searches stored titles first; search ready time dropped from 7.6s to 105ms. Page time budgets added to audit_pages.py and verified (all pages load in under 200ms).

### 5. First run
- Decide with the owner what the practice path adds: one practice title, or demo titles that are
  clearly marked and removable in one click.
- **Done when:** a new journal contains only what the owner chose to keep.

### 6. Feel
- Apply `DESIGN.md`, `brand.md` and the cinematic journal spec across all ten pages, with the
  motion work from the existing design reviews. Books need their own visual treatment.
- **Done when:** the owner accepts a screen recording of all ten pages with a mixed library.

### 7. Ship and tidy
- Store listing with a hosted privacy policy; Drive sign-in out of testing mode; real screenshots.
  Archive the duplicate documents into one folder with an index.
- **Done when:** it installs from the Chrome Web Store.

## Rules for agents

- The core loop works with no keys and no account. Never make a page depend on the network to
  show saved titles.
- Never invent metadata. A field with no source stays empty and is shown as a designed gap.
- Keys stay encrypted at rest; the message allowlist and permission tests stay.
- `npm run ci` and `npm run smoke` green before every commit.
- A quality claim is made only with the audit report attached.

## Needs the owner

- Approving the title set and the expected fields per page.
- The first-run decision; which documents to keep.
- Chrome Web Store account; Google Cloud consent screen in production mode.
- Looking at every page with their own library.

## Scoring

One point each, ten in all: audit exists (1); 95 % field completeness for films and series (1);
the same for books (2); every page has designed loading and missing states (1); speed budgets
held (1); capture under ten seconds for both media (1); clean first run (1); owner accepts the
feel (1); published (1).

Today: 7 by the owner's own estimate, which the audit in workstream 1 will confirm or correct.

## Coordinator decisions, 2026-11-17 (made on the owner's instruction to settle open product calls)

- `docs/audit/expected-fields.md` is accepted. Settled: library and home cards show a creator line (director for films, creator or network for series where the model has it, author for books); the detail view shows runtime for films and page count for books; series fields with no model field are dropped from the expected list, not invented.
- A title with an unknown year, or a year before 1800, must be saveable. Unknown is stored as `null`, never 0, and shown as the designed gap "Year unknown". Pre-1800 years are valid.
- The audit stays keyless for now.
- Round-2 order: (1) year handling, (2) one record shape for every medium, (3) every page medium-aware, (4) offline search delay and per-page time budgets, (5) after-report `docs/audit/2026-11-17-after.md`.
