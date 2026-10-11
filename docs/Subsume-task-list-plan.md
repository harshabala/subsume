# Subsume — Agent task list & implementation plan

> **Give this entire file to one agent (or one session). Work only on this product until ship criteria are met.**

| Field | Value |
|-------|--------|
| **Product** | Subsume |
| **Priority** | P1 — craft / product-sense showcase |
| **GitHub** | https://github.com/harshabala/Subsume |
| **Local clone (preferred)** | `~/Documents/Projects/Subsume` |
| **If missing, clone to** | `~/Documents/Projects/Subsume` via `gh repo clone harshabala/Subsume` |
| **Default branch** | `main` |
| **Work branch** | `feat/flow-metrics-2026-07` (create from latest default if needed) |
| **Stack** | Chrome MV3 + Vite + Preact + TypeScript; npm build/test |
| **Task IDs** | SU-1, SU-2, SU-3, SU-4 |
| **Fable plan status** | Complete Fable plan (100% included below) |
| **Work already done** | None for this initiative |

## Agent instructions (start here)

1. **Read this whole file** before editing.
2. **cd** to the local clone path above. If the path does not exist, clone the GitHub repo there.
3. `git fetch origin && git checkout -B feat/flow-metrics-2026-07 origin/main` (or continue existing feature branch if present).
4. Implement tasks in the **recommended commit sequence** at the bottom of the plan section.
5. After each commit: run the **verify commands** listed below.
6. Create/update **`docs/TASKS.md`** with every task ID and status.
7. Complete the **README dual-section rewrite**.
8. Run design + code + security self-review on the diff; fix critical/high issues.
9. Push branch and open a PR against `main`. Do **not** force-push. Do **not** merge unless the user asked for auto-merge.
10. Do **not** touch other portfolio repos in this session.

## What “done” means for this product

All task IDs listed above are implemented **or** explicitly documented as infeasible with a narrow alternative. Metrics are local-first, activation is a named constant, scoreboard is user-visible with method + privacy copy, README is dual-section, `docs/TASKS.md` is accurate, tests/build green, PR open.


## Global constraints (apply to ALL work)

Source: `<local-path>` and `<local-path>`.

1. **Local-first metrics** — counters/estimates on device or extension storage only. Nothing leaves unless user explicitly exports or opts in. **No cloud analytics in v1.**
2. **One activation event** — named constant in code (e.g. `ACTIVATION_EVENT = '...'`).
3. **User-visible scoreboard** on the natural success screen (ParseKit token-savings pattern), with **method + caveat microcopy**. Honest estimates; never fake precision.
4. **Privacy line on every stats surface:** e.g. *"Stored only on this device. Never uploaded."* (wording may adapt slightly per product).
5. **Zero-AI default** where relevant — core loop works without API keys; AI is optional upgrade.
6. **README rewrite required** in every repo (see below).
7. **`docs/TASKS.md`** committed checklist; update checkboxes as you finish task IDs.
8. **Ship path:** branch `feat/flow-metrics-2026-07` → push → open PR → (if user requested auto-merge and reviews pass) squash-merge to default branch and delete feature branch.

### README overhaul (mandatory for every product)

Rewrite `README.md` with **two top sections**:

#### Start here (novice)
Plain everyday words, zero jargon:
- What it is
- What problems it solves
- Step-by-step install and first use
- Edge cases and how to still use it when you hit them

#### For technical users
- Mermaid architecture diagram (GitHub-native render)
- How it works under the hood
- Metrics / activation definition
- Dev install, test commands, storage/privacy notes

### Ship checklist per repo

- [ ] All task IDs for this product implemented or honestly deferred with reason in PR
- [ ] `docs/TASKS.md` updated (checkboxes match reality)
- [ ] README novice + technical sections done
- [ ] Build/tests pass (commands in this file)
- [ ] Design pass (hierarchy, motion, empty states, reduced-motion)
- [ ] Code pass (edge cases, no regressions)
- [ ] Security pass (secrets, XSS, storage, permissions, no accidental egress)
- [ ] Branch pushed; PR opened with body mapping commits → task IDs → metrics
- [ ] Merge only if user wants auto-merge **or** explicitly asks

### Related docs (read if needed)

| File | Why |
|------|-----|
| `<local-path>` | Original product task specs + metrics definitions |
| `<local-path>` | Why these metrics matter (senior PM framing) |
| `<local-path>` | Multi-repo orchestration notes |
| `<local-path>` | What Fable completed (mostly plans only) |



## Work already completed

**None** for flow-metrics. Start fresh from plan.

**Verify:**
```bash
npm ci
npm run build && npm test
# typecheck: do not increase pre-existing tsc error count (baseline ~14)
```

## Original product task spec

# P1 — Subsume

## Product in one line

Chrome extension film journal: discover on any page → Reflect → personal library.

## Current gap

Too many features in the story. Flow and metrics should celebrate **one loop**: plaque → Reflect → spine.

---

### Task SU-1 — First-run forces one complete loop

| Field | Detail |
|-------|--------|
| **Flow change** | Onboarding ends on a guided page (or demo): open sample title → plaque → Reflect with prompt *“What stayed with you?”* → land in library with that spine highlighted. Disable “skip to empty library” as default. |
| **How it helps** | Activation = first Reflect with non-empty note. Craft is felt, not described. |
| **Metric: Activation** | `activated = ≥1 library entry with emotionalRecall length ≥ 20 chars` |
| **Privacy** | Notes local (IndexedDB). No note content leaves device unless Drive sync **user-enabled**. |
| **Acceptance** | New user has ≥1 capture before “empty archive” UI. |

### Task SU-2 — Library home shows “resonance,” not feature list

| Field | Detail |
|-------|--------|
| **Flow change** | Top of archive: **This month:** N reflections · last reflect date · optional “titles revisited.” Hide advanced (AI recs, dock) until activated. |
| **How it helps** | Focus; metric surface; less AI-first impression. |
| **Metric: Engagement** | Reflects per month; % sessions that open library |
| **Metric: Quality (local)** | Median note length; % entries with note (not rating-only) |
| **User understanding** | *“Reflections this month = times you answered what stayed with you. Ratings optional.”* |
| **Acceptance** | Unactivated users don’t see AI setup as step 1. |

### Task SU-3 — Plaque → Reflect conversion is the product metric

| Field | Detail |
|-------|--------|
| **Flow change** | Quiet local counter (diagnostics or settings for power users): plaques shown vs Reflect opened vs Reflect saved. Not public marketing — optional “Your taste stats” page. |
| **How it helps** | You can improve funnel; user sees “you reflected on 12 of 40 titles you hovered.” |
| **Privacy** | Counts only; no host page URLs required (optional site hostname if useful). |
| **Acceptance** | Stats page readable in one glance. |

### Task SU-4 — Drive sync remains opt-in and labeled

| Field | Detail |
|-------|--------|
| **Flow change** | Sync screen: what leaves device (library JSON), what doesn’t (unless chosen). Default off. |
| **How it helps** | Privacy narrative consistent with rest of portfolio. |
| **Acceptance** | Sync cannot enable silently. |

**Subsume north star (for you):** weekly activated users who add ≥1 new Reflect.  
**User-facing north star:** reflections this month + library size.

---

## Full Fable implementation plan (100%)

# Subsume — Implementation Plan (SU-1 … SU-4)

Repo: `scratchpad/portfolio/Subsume` · Branch: `feat/flow-metrics-2026-07` · Default branch: `main`

**Verified commands** (all run clean as of this plan):

| Purpose | Command | Status |
|---|---|---|
| Install | `npm ci` | ✅ 219 packages |
| Build | `npm run build` (Vite, outputs `dist/`) | ✅ builds in <1s |
| Tests | `npm test` (Vitest, jsdom + fake-indexeddb) | ✅ 42 files / 222 tests pass |
| Typecheck | `npx tsc --noEmit` | ⚠️ **14 pre-existing errors** (Settings.tsx, popup.tsx, etc.). Not a CI gate — Vite builds via esbuild without typechecking. Rule: do not increase the error count; verify with `npx tsc --noEmit 2>&1 | wc -l` before/after. |

**Gate for every commit:** `npm run build && npm test`.

---

## Architecture recap (respect, don't rewrite)

- **UI**: Preact options page (`src/ui/index.html`, `App.tsx` switch-based router, `?page=` / `?act=capture&mediaId=` URL params). Onboarding gate: `prefs.onboardingComplete` (`src/ui/pages/Onboarding.tsx`).
- **Background**: MV3 service worker, typed message router (`src/shared/messages.ts` → `createMessageRouter`), SRP handler maps in `src/background/handlers/*` merged in `src/background/index.ts`.
- **Storage**: IndexedDB via `idb` (`src/background/storage.ts`, stores: `media`, `library`, `preferences`, `people`, `alerts`). Small flags/counters live in `chrome.storage.local` (existing precedent: `subsume_google_drive_token`, `subsumeDiagnosticLog`, `subsume_seed_catalogue_version`).
- **Content script**: `src/content/index.ts` → `MuseumPlaqueManager.attachBadge` (`src/content/overlay.ts`) injects plaques; Reflect click sends `MessageType.OPEN_CAPTURE_CANVAS` → background opens `ui/index.html?act=capture&mediaId=…` → `PoeticCaptureCanvas`.
- **Reflect save path**: `PoeticCaptureCanvas.handleSave` → `ADD_TO_LIST` + `UPDATE_STATUS` + `SET_USER_NOTES` (persists `emotionalRecall`) + optional `SET_USER_RATING`.
- **Content-script IPC allowlist**: `ALLOWED_CONTENT_SCRIPT_MESSAGES` in `src/shared/messages.ts` (~line 76) — any new content-script message MUST be added there and covered in `tests/messageRouter.test.ts`.
- **Seed/demo library**: seeded on first install (`seedDatabaseIfEmpty`); seed entries set `notes` but **never `emotionalRecall`** — this makes `emotionalRecall` a clean activation signal even with a seeded archive.
- **Drive sync**: `src/background/drive-sync.ts` + Settings → "Backup & sync" (`activeSection === 'data'`, `src/ui/pages/Settings.tsx` lines ~833–905). Connect/backup/restore are all manual button clicks; no alarms trigger backups (verified in `src/background/events.ts`).

---

## Shared foundation (build first — everything else depends on it)

### F-1. Activation constant + predicate — `src/shared/activation.ts` (NEW)

The spec's single activation event, as named constants + a pure function:

```ts
/** The one activation event for Subsume (spec SU-1):
 *  first saved Reflect whose emotional recall is a real note. */
export const ACTIVATION_EVENT = 'first_reflection_saved';
/** Minimum trimmed emotionalRecall length for a note to count. */
export const ACTIVATION_MIN_RECALL_CHARS = 20;

export function isActivatedEntry(item: LibraryItem): boolean {
  return (item.emotionalRecall ?? '').trim().length >= ACTIVATION_MIN_RECALL_CHARS;
}
/** activated = ≥1 library entry with emotionalRecall length ≥ 20 chars */
export function isActivatedLibrary(items: LibraryItem[]): boolean {
  return items.some(isActivatedEntry);
}
```

Why derived, not stored: the library IS the source of truth; no flag can drift. Seed entries only carry `notes`, so a fresh demo archive is correctly *not* activated.

Test: `tests/activation.test.ts` — boundary at 19/20 chars, whitespace trimming, seed-style items (`notes` only) do not activate.

### F-2. Resonance summary (background) — `src/background/resonance.ts` (NEW) + handler

Pure functions over `LibraryItem[]` (unit-testable without IDB):

```ts
export interface ResonanceSummary {
  activated: boolean;
  reflectionsThisMonth: number;   // entries with isActivatedEntry-quality recall touched this calendar month
  lastReflectedAt?: number;       // max(contemplatedAt ?? updatedAt) over entries with non-empty emotionalRecall
  titlesRevisited: number;        // entries with sanctuaryIntent === 'revisit_this_month'
  entriesWithNote: number;        // entries with non-empty emotionalRecall (quality: % with note, not rating-only)
  totalEntries: number;
  medianNoteLength: number;       // median trimmed emotionalRecall length among entries with a note
}
export function computeResonanceSummary(items: LibraryItem[], now = Date.now()): ResonanceSummary
```

"This month" = same calendar year+month as `now`, using `contemplatedAt ?? updatedAt`. Honest caveat: edits refresh `updatedAt`, so the header microcopy says "reflections *touched* this month" semantics via the method line (see SU-2 copy).

Handler: add to a new `src/background/handlers/metrics.ts` (registered in `src/background/index.ts` handler spread, following `libraryHandlers` pattern):

- `MessageType.GET_RESONANCE_SUMMARY` → `getAllLibraryItems()` → `computeResonanceSummary(...)`.

Test: `tests/resonance.test.ts` — month boundary, median (odd/even counts), empty library.

### F-3. Funnel counters (local-first) — `src/background/funnelMetrics.ts` (NEW)

Storage: `chrome.storage.local` key **`subsume_funnel_metrics_v1`** (same idiom as `subsumeDiagnosticLog`). Counts only — **no URLs, no hostnames, no titles**:

```ts
interface FunnelCounters { plaquesShown: number; reflectOpened: number; reflectSaved: number; appOpens: number; libraryOpens: number; }
interface FunnelMetricsV1 {
  totals: FunnelCounters;
  months: Record<string /* 'YYYY-MM' */, FunnelCounters>;  // rolling, prune to last 12 keys on write
}
export type FunnelEvent = 'plaque_shown' | 'reflect_opened' | 'reflect_saved' | 'app_open' | 'library_open';
export async function recordFunnelEvents(event: FunnelEvent, count = 1): Promise<void>
export async function getFunnelMetrics(): Promise<FunnelMetricsV1>
```

`appOpens`/`libraryOpens` give SU-2's "% sessions that open library" (session = one options-page open).

New message types in `src/shared/types.ts` `MessageType` enum: `RECORD_FUNNEL_EVENT`, `GET_FUNNEL_METRICS`, `GET_RESONANCE_SUMMARY`. Handlers live in `src/background/handlers/metrics.ts`.

**Security:** add `MessageType.RECORD_FUNNEL_EVENT` to `ALLOWED_CONTENT_SCRIPT_MESSAGES` in `src/shared/messages.ts` (content script must report `plaque_shown`). In the handler, validate: event ∈ enum, `count` a finite integer 1–500 (clamp) — content scripts can't inflate arbitrarily or inject strings. `GET_FUNNEL_METRICS` / `GET_RESONANCE_SUMMARY` stay UI-only (NOT allowlisted).

Tests: `tests/funnelMetrics.test.ts` (in-memory chrome.storage.local mock, mirroring `tests/diagnosticLog.test.ts` pattern); update `tests/messageRouter.test.ts` for the allowlist change.

**Increment points (exactly one each, no double counting):**

| Event | Where |
|---|---|
| `plaque_shown` | `src/content/overlay.ts` `MuseumPlaqueManager.attachBadge` — accumulate a local counter, flush via debounced (2 s) `sendMessage(RECORD_FUNNEL_EVENT, { event: 'plaque_shown', count })`, plus final flush on `destroy()`. Keeps IPC quiet on catalog pages with dozens of posters. |
| `reflect_opened` | `src/ui/components/PoeticCaptureCanvas.tsx` — one `useEffect(..., [])` on mount. Single choke point regardless of entry path (plaque tab, Home hero Reflect, popup deep link). |
| `reflect_saved` | `PoeticCaptureCanvas.handleSave` success path (right before ceremony). NOT in the `SET_USER_NOTES` background handler — DetailModal note *edits* also flow through it and would pollute the funnel. |
| `app_open` | `src/ui/App.tsx` initial mount effect. |
| `library_open` | `App.tsx` when `currentPage` becomes `'library'` (once per page entry). |

Fire-and-forget with `.catch(() => {})` — metrics must never break the flow.

---

## Task SU-1 — First-run forces one complete loop

**Goal:** onboarding ends inside the real loop: sample title → plaque → Reflect ("What stayed with you?") → land in Archive with that spine highlighted. Guided loop is the default; "skip to library" is demoted to a quiet text link.

### Files

1. **`src/ui/pages/Onboarding.tsx`** (modify — extend to two steps)
   - Keep the existing "Your private picture palace" screen as step 1 unchanged, but change the CTA:
     - Primary button: **"Begin with one reflection"** → `setStep('rehearsal')`.
     - Quiet link under it (class `onboarding-skip-link`): **"Skip the rehearsal — enter with the demo shelf"** → `onComplete()` (skip preserved but visibly secondary; forcing text entry with no exit is a trap).
   - Step 2 ("rehearsal"): fetch one sample title via `sendMessage(GET_LIBRARY, {})` after `ensureDemoLibraryIfEmpty()` semantics (App already seeds; pick the first `watched` seed entry with a poster, e.g. falls out of `SEED_LIBRARY`). Render:
     - Kicker: `THE REHEARSAL`
     - Headline: **"One reflection, and the house is yours."**
     - Body: **"This is how Subsume works everywhere you browse: a quiet plaque appears on a poster. Press Reflect and answer one question — *what stayed with you?*"**
     - The sample poster with a real museum plaque replica (reuse the plaque markup/classes from `overlay.ts`, styled in `onboarding.css`): `★ 8.4 │ Reflect`. Click → `onReflectSample(mediaId)`.
   - New props: `interface OnboardingProps { onComplete: () => void; onReflectSample: (mediaId: string) => void; }`

2. **`src/ui/App.tsx`** (modify)
   - New state: `const [onboardingCaptureId, setOnboardingCaptureId] = useState<string | null>(null);` and `const [highlightMediaId, setHighlightMediaId] = useState<string | null>(null);`
   - In the `!prefs.onboardingComplete` branch, render `<Onboarding onComplete={completeOnboarding} onReflectSample={setOnboardingCaptureId} />` and, when `onboardingCaptureId` is set, mount `<PoeticCaptureCanvas mediaId={onboardingCaptureId} onClose={() => setOnboardingCaptureId(null)} onSave={handleOnboardingReflectSaved} />` (the `onSave` prop already exists on the canvas — no canvas changes needed for SU-1).
   - `handleOnboardingReflectSaved`: `completeOnboarding()`, `setHighlightMediaId(onboardingCaptureId)`, `setCurrentPage('library')`, `setOnboardingCaptureId(null)`.
   - Pass `highlightMediaId` to `<Library highlightMediaId={highlightMediaId} onHighlightConsumed={() => setHighlightMediaId(null)} />`.

3. **`src/ui/pages/Library.tsx`** + **`src/ui/components/archive/HardcoverSpineCard.tsx`** (modify)
   - `Library` accepts optional `highlightMediaId`; passes `highlighted={library.mediaId === highlightMediaId}` to `HardcoverSpineCard`; on first render with a match, `scrollIntoView({ block: 'center' })` via ref, then `onHighlightConsumed()` after ~2.5 s.
   - `HardcoverSpineCard`: add `highlighted?: boolean` → class `spine-highlighted`.

4. **`src/ui/styles/onboarding.css`** — step-2 layout + plaque replica; **`src/ui/styles/library.css`** — `.spine-highlighted` (gold `--border` glow, respects `prefers-reduced-motion`: no pulse, static outline).

### Activation wiring
The rehearsal save goes through the normal `SET_USER_NOTES` path, so `emotionalRecall` persists and `isActivatedLibrary` (F-1) flips as soon as the note is ≥ `ACTIVATION_MIN_RECALL_CHARS`. No special-case flag.

### Honesty note (acceptance nuance)
The spec's acceptance is "new user has ≥1 capture before 'empty archive' UI." Subsume seeds a demo library on install, so the archive is never literally empty; the guided loop guarantees a **user-authored** capture (the meaningful version of this acceptance). Verify:
1. Fresh profile → load unpacked `dist/` → onboarding step 1 → "Begin with one reflection" → plaque → canvas shows "What stayed with you?" → type ≥20 chars → Save → lands on Archive with the spine glowing.
2. `npm test` — add `tests/onboardingLoop.test.tsx` (render Onboarding, click primary CTA, click plaque, assert `onReflectSample` called; pattern from `tests/poeticCaptureCanvas.test.tsx`).

---

## Task SU-2 — Archive home shows "resonance," not a feature list

**Goal:** top of Archive = this month's reflections + last reflect date + titles revisited, with method + privacy microcopy. Advanced AI surfaces hidden until activated.

### Files

1. **`src/ui/components/archive/ArchiveHeader.tsx`** (modify — currently a static 10-line header)
   - Fetch `GET_RESONANCE_SUMMARY` on mount (isMounted guard, per repo idiom).
   - Below the existing title/subtitle, render a resonance strip (new classes in `library.css`):
     - **Scoreboard line:** `This month: 4 reflections · Last reflected 6 July · 2 titles marked to revisit`
       (each segment renders only when it has data; zero-state: `This month: no reflections yet — the plaques are waiting.`)
     - **Method line (small, muted):** `Reflections this month = times you answered "What stayed with you?" this calendar month. Ratings are optional and never counted here.`
     - **Privacy line (small, muted):** `Stored only in this browser. Never uploaded.`
   - This is the ParseKit pattern: the number the user just created is the payoff at the top of the success surface (the Archive is where every Reflect lands).

2. **`src/ui/App.tsx`** (modify — gate advanced surfaces)
   - Fetch `GET_RESONANCE_SUMMARY` once in the initial-load effect → `const [activated, setActivated] = useState<boolean | null>(null)`. Re-check on `LIBRARY_UPDATED` broadcasts (a listener pattern already exists for `FILMMAKERS_UPDATED`).
   - `EXPLORE_NAV`: filter out `recommendations` while `activated === false`. (Keep `stats`, `search`, etc.)
   - Pass `activated` to `<Home activated={activated} …/>`.

3. **`src/ui/pages/Home.tsx`** (modify)
   - New prop `activated?: boolean | null`.
   - When `activated === false`, replace the **"Picked For You"** section (LLM/rule recommendations, ~line 685) with a single quiet nudge panel: **"Curated picks unlock after your first reflection."** / body: **"Reflect on one title — the plaque on any poster, or the sample in your archive — and Subsume starts curating from what actually stayed with you."** Weekly digest ("This Week") stays: it is editorial, not AI-setup.
   - The Auteur Screenplay Dock is already default-off (`screenplayDockEnabled: false` in `DEFAULT_PREFS`) — no change needed; note this in the PR description.
   - Acceptance "unactivated users don't see AI setup as step 1" is satisfied: no Recommendations nav, no Picked-For-You CTA into curator settings until activated. Settings → "AI curator" section remains reachable for power users (it is section 5 of 8, not step 1).

4. **`src/ui/styles/library.css`** — `.archive-resonance`, `.archive-resonance-method`, `.archive-resonance-privacy` (reuse `sanctuary-plaque-text` tokens; keep it typographic, no cards).

### Metric definitions used (from F-2)
- Engagement: `reflectionsThisMonth` (shown); `libraryOpens / appOpens` recorded locally (F-3) for the Stats page, not the header.
- Quality (local): `medianNoteLength`, `entriesWithNote / totalEntries` — surfaced on the Stats page (SU-3 panel), computed in `computeResonanceSummary`.

### Verify
- Unit: `tests/resonance.test.ts` covers the numbers; `tests/archiveHeader.test.tsx` (new) renders header with mocked sendMessage and asserts copy incl. privacy line.
- Manual: fresh install (not activated) → no Recommendations tab, nudge on Home; save one ≥20-char reflection → tab appears, header counts 1.

---

## Task SU-3 — Plaque → Reflect conversion is the product metric

**Goal:** quiet local funnel (plaques shown vs Reflect opened vs Reflect saved) on an optional "Your taste stats" surface, readable in one glance. Counts only; no host URLs.

### Files

1. **`src/background/funnelMetrics.ts`** + **`src/background/handlers/metrics.ts`** (NEW — see F-3) and registration in `src/background/index.ts`.
2. **`src/shared/types.ts`** — `MessageType.RECORD_FUNNEL_EVENT`, `MessageType.GET_FUNNEL_METRICS`, `MessageType.GET_RESONANCE_SUMMARY`; payload interfaces `RecordFunnelEventRequest { event: FunnelEvent; count?: number }`.
3. **`src/shared/messages.ts`** — allowlist `RECORD_FUNNEL_EVENT` for content scripts.
4. **`src/content/overlay.ts`** — debounced `plaque_shown` flush (see F-3 table).
5. **`src/ui/components/PoeticCaptureCanvas.tsx`** — `reflect_opened` on mount, `reflect_saved` on successful save (fire-and-forget).
6. **`src/ui/pages/Stats.tsx`** (modify) — add a new panel at the top of the existing `stats-stack`, reusing `stats-chart-panel` styling:
   - Title: **"From plaque to reflection"**
   - Hero sentence (the one-glance read): **"You reflected on 12 of the 40 titles that caught your eye."** (`reflectSaved` of `plaquesShown`; if `plaquesShown === 0`: "No plaques seen yet — browse any streaming or review site and they'll appear on posters.")
   - Three quiet counters in a row (reuse `stats-plaque-card`): `Plaques shown · 40`, `Reflect opened · 15`, `Reflections saved · 12`.
   - Quality row (from `GET_RESONANCE_SUMMARY`): `Median reflection length · 84 chars` and `Entries with a written reflection · 63%`.
   - **Method line:** `These are simple tallies kept as you browse: plaques drawn, canvases opened, reflections saved. Estimates, not surveillance — no page addresses or titles are recorded with them.`
   - **Privacy line:** `Stored only in this browser. Never uploaded.`
   - Note: `reflect_opened` can exceed plaque clicks (Home hero also opens the canvas) — the method line's "canvases opened" phrasing stays honest about that.

### Storage schema
`chrome.storage.local['subsume_funnel_metrics_v1']` as in F-3. Monthly buckets pruned to 12. No migration needed (new key).

### Verify
- `tests/funnelMetrics.test.ts`: increments, clamping (count ≤ 500, non-integers rejected), month bucketing, pruning.
- `tests/messageRouter.test.ts`: `RECORD_FUNNEL_EVENT` accepted from content-script origin; `GET_FUNNEL_METRICS` rejected from content-script origin.
- Manual: browse a poster-heavy page → open Stats ("House Stats") → counters move; the panel reads in one glance.

---

## Task SU-4 — Drive sync remains opt-in and labeled

**Goal:** the sync screen states exactly what leaves the device (library JSON, only on explicit backup) and what never does. Default off; cannot enable silently.

### Current state (verified)
Connect, "Back up now", and "Restore from Drive" are all manual button handlers in `src/ui/pages/Settings.tsx` (`handleConnectDrive` / `handleBackupNow` / `handleRestoreBackup`); `src/background/events.ts` alarms (`dailyRefresh`, digest) never call `BACKUP_TO_DRIVE`. So "cannot enable silently" already holds mechanically — this task is labeling + a guard test so it stays true.

### Files

1. **`src/ui/pages/Settings.tsx`** (modify, `activeSection === 'data'` block ~line 833)
   - Change panel description to: **"Your sanctuary lives in this browser. Backup is off by default — nothing is uploaded until you connect Google Drive and press Back up now."**
   - Replace the current single hint with a two-column "what leaves / what stays" block above the Connect button (new classes in `settings.css`):
     - **Leaves this device (only when you press Back up now):** `Your library JSON — titles, statuses, ratings, and your reflections — uploaded to a private app-data folder in your own Google Drive.`
     - **Never leaves this device:** `Browsing activity, plaque and reflection tallies, API keys, and diagnostic logs. Reflections stay local unless you back up.`
   - Under the buttons, a status line when not connected: **"Sync: off — local only."** (derive from stored Drive account email via existing `GET`/status plumbing or simply from `driveStatus === null` + a new lightweight `IS_DRIVE_CONNECTED` check reading `subsume_google_drive_token` presence — prefer the latter: add `MessageType.GET_DRIVE_SYNC_STATUS` to `syncHandlers` in `src/background/handlers/sync.ts`, returning `{ connected: boolean; accountEmail?: string }` from existing `drive-sync.ts` token/email getters).
   - Also update `src/shared/settingsCatalog.ts` 'data' description to: `"Export or import your sanctuary JSON, and an optional Google Drive backup that is off by default. Nothing uploads without a button press."`

2. **`tests/driveSync.test.ts`** (extend) — guard test: assert the background module registers no alarm named anything like backup and that `syncHandlers` contains no handler that calls `backupToDrive` without an explicit message (concretely: import `setupLifecycleAndAlarms`, run with the chrome mock, assert `chrome.alarms.create` was never called with a name containing `'backup'`/`'drive'`; assert `BACKUP_TO_DRIVE` is not in `ALLOWED_CONTENT_SCRIPT_MESSAGES`).

### Verify
- Manual: Settings → Backup & sync shows the labeled block; with no token, status reads "Sync: off — local only"; nothing network-touching happens on page load (check service-worker network panel).
- `npm test` — extended driveSync guard passes.

---

## Cross-cutting: README honesty

`README.md` markets "Google Drive Sync" in the feature table — after SU-4, append "(opt-in, off by default; uploads only on 'Back up now')" to that row, and add one line under Security: metrics/tallies are local-only. Small diff, keeps README aligned with UI (portfolio principle: honesty over completeness).

---

## Commit sequence (conventional commits, small & incremental)

1. `feat(metrics): add activation constant and resonance summary (shared + background)` — F-1, F-2, tests.
2. `feat(metrics): add local funnel counters with content-script plaque reporting` — F-3, allowlist, overlay/canvas/App increments, tests.
3. `feat(onboarding): guided first reflection loop with archive spine highlight` — SU-1.
4. `feat(archive): resonance header and activation-gated discovery surfaces` — SU-2.
5. `feat(stats): plaque-to-reflection funnel panel with method and privacy copy` — SU-3 UI.
6. `feat(settings): label Drive sync data boundaries; assert opt-in stays manual` — SU-4 + README touch-up.

Each commit: `npm run build && npm test` green; `npx tsc --noEmit` error count ≤ 14 (pre-existing baseline). Do NOT push (later stage handles it).

## Infeasible / adjusted items

- None infeasible. Two honest adjustments: (a) SU-1's "empty archive" acceptance is interpreted as *user-authored capture before archive use* because Subsume intentionally seeds a demo library on install; (b) SU-3's "% sessions that open library" is defined as `libraryOpens / appOpens` per options-page open — counted locally, surfaced only if wanted later (counters ship; UI shows the plaque funnel, which is the spec's headline).


## Agent completion checklist

- [ ] F-1 activation, F-2 resonance, F-3 funnel foundation
- [ ] SU-1 … SU-4
- [ ] README dual sections + Drive honesty line
- [ ] docs/TASKS.md
- [ ] npm run build && npm test green
- [ ] Security: funnel counts only (no URLs); Drive stays opt-in
- [ ] PR opened
