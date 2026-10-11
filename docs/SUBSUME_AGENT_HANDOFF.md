# Subsume — Full Context Handoff for Agent Review

**Document purpose:** Give another agent (or engineer) enough context to review **information architecture**, **features**, **technical approach**, and **recommended next steps** without replaying the full chat history.

**Date written:** 2026-07-25  
**Product version:** 0.3.0  
**Primary branch tip:** `89dadc8` on `main` and `feat/books-expansion`  
**Remote:** https://github.com/harshabala/Subsume  
**Local repo:** `<local-path>`  
**Chrome test build:** `<local-path>` (Load unpacked this folder only)

---

## 1. What Subsume Is

**Subsume** is a **Chrome MV3 extension**: a private multi-medium sanctuary for **films, TV series, and books** — not a social tracker and not a generic notes app.

**North star:** Quality of reflection after a work stays with you. Emotion before metadata.

**Visual register:** **Gilded Night / Cinematic Sanctuary** — dark UI, Newsreader + Outfit, gold accent ≤10% of surface. Spec: `DESIGN.md`, `src/shared/tokens.css`, `PRODUCT.md`.

**Primary user jobs:**
1. Discover works while browsing the web (plaques / hover / book detection).
2. Capture what stayed with you (Poetic Capture Canvas + popup log).
3. Keep and revisit a personal archive (All / Screen / Books).
4. Configure keys, backups, taste, alerts, optional AI curation.

---

## 2. Three Acts (Product Model)

| Act | Name | Surfaces |
|-----|------|----------|
| **I** | Discovery | Content-script plaques/hover/dock; app: Discovery (Home), Search, Now Showing, Creators, Recommendations, Alerts |
| **II** | Capture | Poetic Capture Canvas, popup quick-log, DetailModal notes/reflection |
| **III** | Archive | Library (Hardcover spines), filters by medium/status/intent/tags |

Legacy mental model still uses `LibraryStatus` values (`to-watch` | `watching` | `watched` | `abandoned`) with **medium-aware display labels** (e.g. books: Want to read / Reading / Read / Did not finish). Newer domain models (`CatalogWork`, `Relationship`, reflections, experiences) dual-write for expansion.

---

## 3. Information Architecture (App Shell)

### 3.1 Primary navigation (always visible desktop)

| Key | Label | Route / page |
|-----|--------|----------------|
| `library` | **Archive** | `Library.tsx` — **default landing** after onboarding |
| `home` | **Discovery** | `Home.tsx` lobby + wire + secondary modules |
| `settings` | **Settings** | `Settings.tsx` multi-section |

### 3.2 Explore subnav (desktop strip; also in drawer)

| Key | Label | Page |
|-----|--------|------|
| `search` | Search | Catalogue search (film/TV/book) |
| `recommendations` | Recommendations | Rule ledger primary; AI House Curator secondary |
| `new-releases` | Now Showing | Trending / programme list |
| `people` | Creators | Filmmakers + authors follow |

### 3.3 House tools (drawer only — demoted)

| Key | Label | Page |
|-----|--------|------|
| `stats` | House Stats | Emotional weather + quiet meta |
| `alerts` | Premiere Alerts | Release / book alerts |

### 3.4 Content script surfaces (any host page)

- Screen museum plaques / hover cards (`overlay.ts`, `hoverCard.tsx`)
- Book plaques (high-confidence only) (`bookOverlay.ts`, `bookDetection/*`)
- Auteur Screenplay Dock (`dock.ts`)
- Closed / open Shadow DOM isolation (`closedShadow.ts`)

### 3.5 Capture / detail

- Full UI: `PoeticCaptureCanvas.tsx` (`?act=capture&mediaId=…`)
- Detail: `DetailModal.tsx` (status, rating, tags, notes, reflections, related works, editions)
- Popup: `popup.tsx` + `popup.html` (quick search/log)

### 3.6 Shell layout system (recent)

Shared column tokens so logo, subnav, and page content share one left edge:

- `--app-shell-max: 1200px`
- `--app-shell-gutter: 32px` (16px mobile)
- Single scrollport on `.app-layout` + `scrollbar-gutter: stable` (avoids 90% vs 100% zoom misalignment)

**Chrome load path:**  
`<local-path>`  
(Do **not** load parent `Desktop/dev` — no `manifest.json` there.)

---

## 4. Feature Inventory (As Implemented)

### 4.1 Archive (`Library.tsx` + `archive/*`)

- Medium tabs: **All | Screen | Books** (Screen can refine Movies/Series)
- Collection status tabs: medium-aware labels (Everything / Completed / … or Screened / Read / …)
- Optional **Refine by memory** (intent: Full repertoire / Keep This Memory / Return Soon / Wishlist) — collapsed by default
- Search inscriptions + sort
- Tag filter chips
- Filtered empty state + **Clear filters**
- Result count + pagination honesty note when filters apply to loaded pages only
- Hardcover spine cards: medium badge, status chip (medium-aware), inscription excerpt, dossier expand
- Empty states: literary “inscriptions” copy; true empty can CTA to Search

### 4.2 Discovery Home

- Hero plaque (Reflect / Archive)
- Lobby: primary **Open vault (N)**, secondary **Search the repertoire**; Recs / Now Showing as text links
- **Live feed** (wire) + recently inscribed
- Secondary band: weather / picks / weekly (demoted density)
- Discovery **add** failures surface via notices (not silent)

### 4.3 Search

- Query films / series / books (Open Library for books; Trakt/TVmaze/TMDb for screen when configured)
- Format chips: All works / Films / Series / Books
- Add to archive CTAs via `productCopy`

### 4.4 Recommendations

- **Ledger** (rule-based) is primary
- **House Curator (AI)** in closed `<details>` progressive disclosure
- Empty / error / retry paths; Search catalogue CTA when navigable

### 4.5 Books stack (v0.3 foundation)

- Open Library client + ISBN utilities
- Page detection: JSON-LD, ISBN context, domain adapters, heuristics
- Optional Google Books enrichment
- Book plaques on high-confidence pages
- Archive / Search medium filters
- Message types for works, page candidates, archive add, editions, experiences, relations

### 4.6 Capture & reflection

- Poetic Capture: progressive disclosure of intent/rating after **~40 chars** or non-empty blur (was 140)
- Emotions always available; essay optional
- Reflection timeline / dual-write notes → reflections (DetailModal)
- Save ceremony motion ≤300ms; PRM paths

### 4.7 People / Stats / Alerts / Settings

- Creators follow + filmography (keyboard cards, unfollow confirm)
- Stats: afterglow chart + quiet meta (includes books in medium split)
- Alerts: film/TV/book criteria; two-step delete
- Settings: theme/atmosphere, taste, discovery sources, API keys, AI curator prompts, browsing prefs, Drive backup, diagnostics
- **Onboarding:** TMDb **optional** (“I’ll add keys later”); single finish CTA
- **Demo library:** no silent auto-seed; explicit restore only

### 4.8 Lexicon (`src/shared/productCopy.ts` + `statusLabels.ts`)

| Concept | Canonical |
|---------|-----------|
| Medium | Film / Series / Book |
| Keep | Add to archive / In archive / Remove from archive |
| Page titles | Align with nav where fixed (Now Showing, Premiere Alerts, Creators) |
| Feed | Live feed (not “the wire” in chrome) |

Still imperfect in places: residual “library” in some errors/settings; literary vs operational status dual dialects on chips vs hover.

---

## 5. Technical Approach

### 5.1 Stack

| Layer | Tech |
|-------|------|
| UI | Preact, Vite, TypeScript |
| Extension | Chrome MV3 (`manifest.json`) |
| Storage | IndexedDB (idb), dual legacy + catalog stores (v4 migration) |
| Messaging | Typed `MessageType` + `sendMessage` / background handlers |
| Content | Shadow DOM injections, MutationObserver scanners |
| AI | Optional OpenAI / Anthropic / Gemini via user keys |
| Tests | Vitest + jsdom (~436 tests at last verify) |

### 5.2 Key directories

```text
src/
  background/     # service worker: handlers, providers (TMDb, OL, GB, LLM, Drive, dispatch)
  content/        # plaques, hover, dock, bookDetection, closedShadow
  shared/         # types, tokens, productCopy, statusLabels, messages, validation
  ui/             # App shell, pages, components, styles
  styles/         # sanctuary.css (large shared CSS)
manifest.json
tests/
docs/             # books expansion package, privacy, design-taste findings
store/            # CWS listing drafts
DESIGN.md         # design system extract
PRODUCT.md        # product one-pager
```

### 5.3 Architectural patterns

- **Handler maps** in background (domain separation)
- **Dual-write** legacy `MediaItem`/`LibraryItem` ↔ catalog/relationship models
- **Medium-aware labels** without forking visual brand
- **Content isolation** via Shadow DOM; trusted gesture gates for mutations (security review fixed)
- **O(1) library set** in content for hover state
- **Prefetch** on nav hover/focus
- **Design tokens** drive color/type/motion; imperfect compliance (~68% in last design audit)

### 5.4 Build & test

```bash
cd ~/Subsume
npm ci
npm run typecheck
npm test          # vitest
npm run build     # → dist/
npm run package   # → subsume.zip

# Refresh Desktop test kit
<local-path>
# or: npm run build && rm -rf <local-path> && cp -R dist/. <local-path>
```

**Load in Chrome:** Developer mode → Load unpacked → `Desktop/dev/extension`.

---

## 6. Recent Workstreams (This Train)

Ordered roughly chronological on the tip history:

| Area | Outcome | Representative commits |
|------|---------|------------------------|
| Security / data SDD | Closed shadow, archive persist, migration gate, dual-write merge, remove cascade, rate limits | through `161e56a` |
| UI wiki motion/Fitts | ≤300ms motion, hit targets, press scale | `705c514`…`e74ded3` |
| Archive critique | Labels, filtered empty, filter IA, a11y cards | `ce204b1` |
| Product critique P0–P2 | IA collapse, lexicon, recs hierarchy, stats, Fitts, tokens | `2343750` |
| Design-taste full pass | Activation, a11y traps, density, motion, Fitts content | `3e5a037` |
| Shell alignment | Shared column + single scrollport + scrollbar-gutter | `a80b0c7`, **`89dadc8`** |
| Docs | `DESIGN.md`, design-taste findings | `7dfcfc8` |

**Multi-skill design critique scores (approx., post partial fixes):**
- Nielsen re-score: **27/40** (from 24)
- Product review: ~6.9/10
- Taste / premium: ~6–6.5/10
- Motion: ~7.5/10
- Findings dump: `docs/design-taste-findings-2026-07-21.md` (also useful path under repo)

---

## 7. Design / Product Findings Still Open

Prioritized for a reviewing agent — not all are bugs; some are strategic product choices.

### P0 / high impact
1. **Activation still fragile** for pure book users if onboarding voice still over-emphasizes TMDb (skip exists; path polish remains).
2. **Capture dual products** (popup vs Poetic Canvas) — inconsistent mental model.
3. **Home still multi-job** (lobby + wire + secondary modules) undercuts “one job per screen.”
4. **Archive filter stack** still cognitively heavy (medium × collection × intent × search × tags).
5. **Filters apply only to loaded pages** — false empty risk if user expects full-vault filter.

### P1 consistency
6. Residual **library vs archive** strings; dual status dialects (Screened vs Watched).
7. Nav vs page title drift not fully eradicated everywhere.
8. Material Symbols / `auto_awesome` as AI-product tell.
9. Settings density / explanation stack.
10. Content hover still weaker for books in some paths.

### P2 craft / system
11. Token drift: radii 2px vs DESIGN 4/8/12; pure-black shadows reduced but status emerald remains.
12. `transition: all` leftovers outside fixed surfaces.
13. No list virtualization (Archive / filmography).
14. Literary brochure eyebrows (user chose to **keep** brochure voice — do not strip without product decision).

### Intentionally deferred
- Full “double-bezel / floating island nav” premium redesign
- Complete Rams plain-language rewrite of sanctuary voice
- New feature platforms (import Goodreads, full adaptation graph productization)

---

## 8. Recommended Next Steps (for reviewing / planning agents)

### Wave A — Product clarity (highest ROI)
1. Decide Discovery’s single job: **wire only** vs lobby hub; cut or hide secondary modules for new users.
2. One capture path story: popup as “fast log,” canvas as “deep inscription” — or unify.
3. Full-vault filter strategy (server/message filter by status/intent, not client-only page).
4. Expand `productCopy` as single source; kill remaining “library” user strings.

### Wave B — Hardening
5. A11y pass: remaining unlabeled controls, contrast on `--text-control` / placeholders.
6. Virtualize Archive grid; gate FilmGrain aggressively under PRM (partially done).
7. Measure funnel (install → first inscription → day-7 open) via local counters only.

### Wave C — Multi-medium completeness
8. Book parity in popup search.
9. Author-first Creators UX when following writers.
10. Dispatch / alerts / recs empty states book-aware copy end-to-end.

### Wave D — Ship readiness
11. CWS screenshots + listing from `store/`
12. Privacy / permissions audit pass against closed-shadow + host injection defaults
13. Version bump narrative for v0.3.x if shipping books publicly

### Review questions for the next agent
1. Is **Archive-first** the correct default for lifelong product value, or should first-run force one guided capture?
2. Should **intent** remain a first-class taxonomy or demote further under status only?
3. How much **theatre lexicon** is brand vs cognitive tax?
4. Should content scripts default **off** until user enables overlays (trust / CWS)?
5. What is the **MVP cut line** for CWS vs private beta?

---

## 9. How to Review Locally

```bash
# Code
cd <local-path>
git checkout main   # or feat/books-expansion — same tip at handoff
git log -20 --oneline
npm ci && npm run ci

# Design docs
open DESIGN.md PRODUCT.md docs/design-taste-findings-2026-07-21.md
open docs/SUBSUME_BOOKS_EXPANSION_INSTRUCTIONS.md   # large target contract

# Chrome
# Load unpacked: <local-path>
# If stale: <local-path> then Reload extension
```

### Smoke checklist
- [ ] Extension loads (no SW errors)
- [ ] Onboarding can skip TMDb
- [ ] Lands on Archive
- [ ] Logo / Search / page titles share left edge at **100%** zoom
- [ ] Add film + book to archive; medium labels correct
- [ ] Capture after short recall (~40 chars unlocks intent/rating)
- [ ] Filtered empty → Clear filters
- [ ] No silent demo junk on first empty vault
- [ ] Book page plaque only when high confidence
- [ ] Settings / Drive / AI paths optional without breaking archive

---

## 10. Related Artifacts on Desktop

| Path | Role |
|------|------|
| `Desktop/dev/extension/` | **Load this** for Chrome testing |
| `Desktop/dev/START_HERE.md` | Short test kit instructions |
| `Desktop/dev/VERSION.txt` | Build stamp (expect commit `89dadc8` for shell fix) |
| `Desktop/dev/sync-from-repo.sh` | Rebuild kit from `~/Subsume` |
| `Desktop/dev/subsume-0.3.0.zip` | Packaged build |
| `Desktop/SUBSUME_AGENT_HANDOFF.md` | **This document** |

Repo-only (not required for Chrome load):
- `docs/design-taste-findings-2026-07-21.md` — multi-skill findings list
- `docs/SUBSUME_BOOKS_EXPANSION_FULL_PACKAGE.md` — large books package
- `store/*` — CWS materials

---

## 11. Out of Scope / Do Not Confuse

- **Not** a Solana/crypto product despite other skills on the machine
- Desktop `dev/` is a **test snapshot**, not the git working tree
- Uncommitted local clutter may include `.impeccable/`, plan markdowns, SDD progress — ignore unless asked
- AntV chart skills were installed globally for general agent use; they are **not** part of the extension runtime

---

## 12. One-Paragraph Summary for the Next Agent

Subsume is a Preact Chrome MV3 multi-medium sanctuary (film/TV/books) with content-script discovery, emotion-first capture, and a hardcover archive. v0.3.0 landed books foundation (Open Library, detection, medium filters) plus a large design/IA pass: Archive-first shell, demoted house tools, lexicon helpers, progressive AI recs, optional TMDb onboarding, a11y focus traps, and shell alignment via a single scrollport. The product soul is strong; remaining work is activation clarity, filter honesty across the full vault, density on Discovery/Settings, full lexicon unity, and CWS polish — not a greenfield rewrite.

---

*End of handoff. Prefer reading this file + `PRODUCT.md` + `DESIGN.md` + tip commit `89dadc8` before proposing large refactors.*
