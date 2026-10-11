# Subsume — Current Information Architecture

**Document type:** As-is context (baseline for multi-medium expansion)  
**Product version:** 0.2.0  
**Repo:** `<local-path>`  
**Branch at snapshot:** `chore/cws-production-ready`  
**Commit:** `ef659bc`  
**Date:** 2026-07-20  

**Purpose of this document**  
This is a full picture of how Subsume works *today* as a **moving-pictures** product (movies + TV). It is written so you can drop an instruction package and an “updated / next steps” markdown on top of it—without re-deriving architecture from the codebase.

**Out of scope here**  
- Recommendations for *how* to add books (that is your next document).  
- Implementation tasks, tickets, or code patches.  
- Competitive analysis (except where it clarifies product boundaries).

---

## 1. Product identity (as-is)

| Field | Value |
|--------|--------|
| **Name** | Subsume |
| **Form** | Chrome Manifest V3 extension (no Subsume backend) |
| **Domain** | Film & television only (`MediaType = 'movie' \| 'tv'`) |
| **Promise** | Private cinematic sanctuary: discover while browsing, capture what stayed with you, archive by intent and filmmaker |
| **Who** | Cinephiles curating personal taste—not social feeds, not aggregate “runtime maximizers” |
| **Tone** | Calm, literary dark UI; cinema voice (screened, anticipated, house, filmmakers); gold accent sparingly |
| **Visual system** | Gilded Night / Cinematic Sanctuary — `src/shared/tokens.css`, `CINEMATIC_JOURNAL_DESIGN_SPEC.md` |

### 1.1 Core job-to-be-done

1. **Discover** titles on arbitrary web pages (posters, text mentions).  
2. **Capture** an encounter with emotion before metadata (rating/tags).  
3. **Archive** encounters in an editorial library (intents + reflections).  
4. **Follow people** (directors, DPs, actors, etc.) across filmography.  
5. **Optionally enrich** with AI recommendations, digests, alerts, Drive backup.

### 1.2 Three acts of interaction (product IA)

| Act | User experience | Primary surfaces |
|-----|-----------------|------------------|
| **I — Discovery** | Posters/titles on any site → museum plaque + hover card | Content script: scanner, overlay, hoverCard |
| **II — Capture** | “What stayed with you?” before intent/rating | `PoeticCaptureCanvas`, popup log flow, DetailModal |
| **III — Archive** | Editorial spines grouped by sanctuary intent | Library page, HardcoverSpineCard, DetailModal |

---

## 2. System layers

```text
┌─────────────────────────────────────────────────────────────────┐
│  Host web pages (any http/https)                                │
│  Content script: scan → plaques / hover cards / optional dock   │
└────────────────────────────┬────────────────────────────────────┘
                             │ chrome.runtime.sendMessage
                             │ (allowlisted types only from pages)
┌────────────────────────────▼────────────────────────────────────┐
│  Background service worker (MV3)                                  │
│  Message router → domain handler maps                             │
│  TMDb / OMDb / Trakt / TVMaze / Wikidata / LLM / Drive            │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  Persistence                                                      │
│  IndexedDB `subsume-db` v3 · chrome.storage.local (side stores)   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Extension UI (extension origin only)                             │
│  Options: ui/index.html (App shell) · Popup: ui/popup.html        │
│  Full message surface (prefs, library, keys, sync, diagnostics) │
└─────────────────────────────────────────────────────────────────┘
```

### 2.1 Runtime entry points

| Entry | Path (source) | Built artifact |
|--------|----------------|----------------|
| Service worker | `src/background/index.ts` | `background.js` |
| Content script | `src/content/index.ts` | `content.js` + `content.css` |
| Options / full app | `src/ui/index.html` → `App.tsx` | `ui/index.html` |
| Toolbar popup | `src/ui/popup.html` → `popup.tsx` | `ui/popup.html` |

### 2.2 Handler domains (background)

Registered in `src/background/index.ts` by spreading:

| Map | File | Responsibility |
|-----|------|----------------|
| `libraryHandlers` | `handlers/library.ts` | Add/update/remove library, notes, ratings, tags, GET library |
| `titleHandlers` | `handlers/titles.ts` | Resolve titles/posters, search, releases, open detail/capture |
| `peopleHandlers` | `handlers/people.ts` | Search/follow people, filmography sync |
| `recommendationHandlers` | `handlers/recommendations.ts` | Recs, watch profile, digest, discovery feed |
| `alertHandlers` | `handlers/alerts.ts` | Watch alerts CRUD |
| `settingHandlers` | `handlers/settings.ts` | Prefs, content prefs, free data source status |
| `syncHandlers` | `handlers/sync.ts` | Export/import, Google Drive, badge clear |

---

## 3. Canonical entity model

All domain types live in `src/shared/types.ts` unless noted.

### 3.1 Entity relationship (logical)

```text
MediaItem 1 ─────── 0..1 LibraryItem
    │                      │
    │ mediaId              │ emotional fields, status, intent
    │
    └──── referenced by PersonItem.filmographyIds[]
    
PersonItem (followed crew)
WatchAlert (premiere / keyword rules)
WeeklyDigest (cached recommendation pack)
DiscoveryFeedItem (ephemeral free-API feed items)
UserPreferences (singleton prefs row)
```

**Important split:**  
- **`MediaItem`** = catalog metadata (what the title *is*).  
- **`LibraryItem`** = user’s relationship to that title (status, notes, emotions).  
Join key: `LibraryItem.mediaId` → `MediaItem.id`.

### 3.2 `MediaItem` (catalog)

| Field | Type | Notes |
|-------|------|--------|
| `id` | string | Canonical ID (see §4) |
| `canonicalTitle` | string | Display/search title |
| `originalTitle?` | string | |
| `type` | `'movie' \| 'tv'` | **Hard-coded medium enum** |
| `year` | number | |
| `genres` | string[] | Usually TMDb genre names |
| `ratings` | `MediaRating[]` | provider + score + votes |
| `providers` | `MediaExternalId[]` | External IDs / URLs |
| `posterUrl` | string | |
| `backdropUrl?` | string | |
| `overview?` | string | |
| `runtimeMinutes?` | number | Film/TV runtime framing |
| `streamingAvailability?` | `StreamingInfo[]` | region + platform |
| `wikidataSummary?` | string | Enrichment |
| `wikidataDirectorBio?` | string | Enrichment |

Supporting types: `MediaRating`, `MediaExternalId`, `StreamingInfo`, `MediaProvider`  
(`imdb | tmdb | rt | trakt | tvmaze | other`).

### 3.3 `LibraryItem` (user relationship)

| Field | Type | Notes |
|-------|------|--------|
| `mediaId` | string | PK in library store |
| `status` | `LibraryStatus` | Lifecycle (§3.4) |
| `addedAt` / `updatedAt` | number | Epoch ms |
| `userRating?` | number | 1–10 |
| `userTags?` | string[] | |
| `notes?` | string | Legacy / general notes |
| **Sanctuary v2+** | | |
| `sanctuaryIntent?` | `SanctuaryIntent` | Archive grouping (§3.5) |
| `emotionalRecall?` | string | Hero prompt: “What stayed with you?” |
| `qualitativeNotes?` | string | Extended prose |
| `scriptParallels?` | string[] | Screenplay echoes |
| `originalScreenplaySparks?` | string | Story ideas |
| `contemplatedAt?` | number | |
| `atmosphere?` | string | Free-text mood tag |
| `lingeringThought?` | string | |
| **Emotional spectrum (0–100)** | | Cinema-named axes (§3.6) |
| `awe?`, `melancholy?`, `tension?`, `warmth?` | number | |

Compatibility / denormalized fields sometimes present: `id`, `tmdbId`, `mediaType`, `title`, `posterPath`, `releaseYear`, `directorNames`.

UI join shape: `LibraryMediaPair { library, media }`.

### 3.4 `LibraryStatus` (lifecycle)

| Value | Cinema voice label (archive UI) |
|-------|----------------------------------|
| `to-watch` | Anticipated |
| `watching` | Now showing |
| `watched` | Screened |
| `abandoned` | Shelved |

### 3.5 `SanctuaryIntent` (archive organization)

| Value | Label |
|-------|--------|
| `keep_memory` | Keep This Memory |
| `revisit_this_month` | Revisit This Month |
| `wishlist` | Wishlist |

**Default mapping** (`intentForStatus` / `resolveSanctuaryIntent`):

| Status | Default intent |
|--------|----------------|
| `watched` | `keep_memory` |
| `watching` | `revisit_this_month` |
| `to-watch` / else | `wishlist` |

Archive UI groups primarily by **intent**, not by status—status remains the operational lifecycle.

### 3.6 Emotional spectrum

Defined in `src/shared/emotions.ts`:

| Key | Label (cinema framing) |
|-----|-------------------------|
| `awe` | Awe · the sublime frame |
| `melancholy` | Melancholy · sorrow in the cut |
| `tension` | Tension · the held breath |
| `warmth` | Warmth · afterglow and return |

Defaults: 50 each. Used in capture, stats, aura visualization.

### 3.7 `PersonItem` (filmmakers / crew)

| Field | Notes |
|-------|--------|
| `id` | TMDb person ID as string |
| `name` | |
| `role` | `CrewRole`: director, writer, cinematographer, actor, composer, producer, editor |
| `profileImageUrl?` | |
| `biography?` | |
| `knownFor` | top title strings |
| `filmographyIds` | `MediaItem.id[]` |
| `followedAt` / `lastSyncedAt` | |

**Assumption:** people graph is TMDb-person-centric and filmography is video media.

### 3.8 Alerts, digests, discovery

| Entity | Role |
|--------|------|
| `WatchAlert` | Rules on type (movie/tv/both), genres, platforms, keyword; chrome notifications |
| `WeeklyDigest` | Cached pack of suggested titles + reasons + platforms |
| `DiscoveryFeed` / `DiscoveryFeedItem` | Free-API trending/premieres (Trakt, TVMaze, Wikidata) |
| `WatchProfile` | Built from library for LLM: topRated / liked / disliked / unrated / wishlist / followedCreators |
| `PersonalizedRecommendation` | LLM output with tmdbId, seedTitle, confidence |

### 3.9 Preferences (`UserPreferences`)

Singleton in IndexedDB prefs store.

| Cluster | Fields |
|---------|--------|
| Taste / region | `favoriteGenres`, `platforms`, `region` |
| API keys | `tmdbApiKey`, `omdbApiKey`, `llmApiKey`, `llmSecondaryApiKey` |
| LLM | `llmEnabled`, `llmProvider`, curator prompt overrides |
| Content script | `hoverCardsEnabled`, `posterOverlaysEnabled`, `screenplayDockEnabled`, `disabledDomains`, `detectionSensitivity` |
| Chrome | `theme`, `cinemaAtmosphere`, `onboardingComplete` |

**Content-safe prefs** (`ContentPrefs`): feature toggles + domain disabled flag only—**never API keys**.

---

## 4. Identity & ID scheme

### 4.1 Media ID pattern

Canonical regex (`src/shared/mediaIds.ts`):

```text
tmdb_movie_<digits>
tmdb_tv_<digits>
tvmaze_tv_<digits>
trakt_movie_<slug>
trakt_tv_<slug>
trakt_trending_<slug>
discovery_trakt_movie_<slug>
discovery_trakt_tv_<slug>
discovery_tvmaze_tv_<digits>
seed_<slug>
```

Validation: `isValidMediaId` / `isSafeNavMediaId` (also used for URL query safety on capture deep links).

### 4.2 Implications

- Primary catalog authority in production paths: **TMDb**.  
- Alternate IDs for free discovery feeds (Trakt, TVMaze) and **seed_** demo catalogue.  
- **No book/ISBN/Open Library namespace** exists today.  
- Library rows are 1:1 with a single `mediaId`; multi-edition books would need a new identity story later.

---

## 5. Persistence architecture

### 5.1 IndexedDB — `subsume-db` (version 3)

| Object store | Key | Value | Indexes |
|--------------|-----|-------|---------|
| `media` | `id` | `MediaItem` | `by-canonical` (canonicalTitle) |
| `library` | `mediaId` | `LibraryItem` | `by-status`, `by-added`, `by-updated` |
| `preferences` | `'user-prefs' \| 'digest'` | `UserPreferences` or `WeeklyDigest` | — |
| `people` | `id` | `PersonItem` | `by-followed`, `by-name` |
| `alerts` | `id` | `WatchAlert` | `by-created` |

Schema evolution: upgrade paths for v1 media/library/prefs, v2 people, v3 alerts (`src/background/storage.ts`).

### 5.2 Seed catalogue

- `src/background/seedData.ts` (+ Indian highlights module).  
- On empty DB: seed media + library + people.  
- On catalogue version bump: `mergeSeedCatalogIfVersionBehind()` via `chrome.storage.local` key for version.  
- Seeds are **film/TV titles and filmmakers**.

### 5.3 `chrome.storage.local` (side channels)

| Key / area | Purpose |
|------------|---------|
| Seed catalogue version | Skip re-merge when current |
| `system_logs` / diagnostic log keys | Logger + diagnostics panel |
| Drive OAuth token + email | Google Drive backup session |
| `subsume_page_reflections` | Screenplay dock notes keyed by `hostname+pathname` (not library media) |

**Note:** Dock reflections are page-scoped, not title-scoped, and do not write fake `mediaId`s into the library.

### 5.4 Export / import / Drive

`ImportLibraryData`: `{ library?, media?, people?, alerts?, weeklyDigest? }`.  
Export intentionally focuses on library graph; API keys stay out of library export paths (security policy in README).

---

## 6. Message / IPC architecture

### 6.1 Envelope

```ts
ExtensionMessage<T>  { type: MessageType; payload: T }
ExtensionResponse<T> { success: boolean; data?: T; error?: string }
```

Client helper: `sendMessage` in `src/shared/messages.ts` (timeout, lastError, reject on `success: false`).

### 6.2 MessageType catalog (grouped)

**Metadata / titles**  
`GET_TITLE_DETAILS`, `GET_MEDIA_ITEMS`, `SEARCH_TITLES`, `DISCOVERY_SEARCH`, `GET_LATEST_RELEASES`, `RESOLVE_POSTER`, `OPEN_DETAIL`, `OPEN_CAPTURE_CANVAS`

**Library**  
`ADD_TO_LIST`, `UPDATE_STATUS`, `SET_USER_RATING`, `SET_USER_TAGS`, `SET_USER_NOTES`, `REMOVE_FROM_LIBRARY`, `GET_LIBRARY`, `GET_LIBRARY_PAGE`, `CHECK_LIBRARY_STATUS`, `RESTORE_DEMO_LIBRARY`

**Sync**  
`EXPORT_LIBRARY`, `IMPORT_LIBRARY`, `CONNECT_GOOGLE_DRIVE`, `BACKUP_TO_DRIVE`, `RESTORE_FROM_DRIVE`, `CLEAR_NOTIFICATION_BADGE`

**People**  
`SEARCH_PERSON`, `FOLLOW_PERSON`, `UNFOLLOW_PERSON`, `GET_FILMOGRAPHY`, `SYNC_FILMOGRAPHY`, `GET_ALL_PEOPLE`

**Discovery / AI**  
`GET_RECOMMENDATIONS`, `BUILD_WATCH_PROFILE`, `GET_PERSONALIZED_RECS`, `GET_CURATOR_PROMPT_PREVIEW`, `GET_WEEKLY_DIGEST`, `REGENERATE_WEEKLY_DIGEST`, `GET_DISCOVERY_FEED`

**Alerts**  
`CREATE_WATCH_ALERT`, `GET_WATCH_ALERTS`, `DELETE_WATCH_ALERT`, `UPDATE_WATCH_ALERT`

**Settings**  
`GET_PREFERENCES`, `GET_FULL_PREFERENCES`, `SET_PREFERENCES`, `GET_POSTER_PREFS`, `GET_CONTENT_PREFS`, `GET_FREE_DATA_SOURCE_STATUS`

### 6.3 Content-script allowlist (security IA)

From non-extension origins, only:

```text
GET_CONTENT_PREFS
RESOLVE_POSTER
GET_TITLE_DETAILS
ADD_TO_LIST
REMOVE_FROM_LIBRARY
CHECK_LIBRARY_STATUS
OPEN_DETAIL
OPEN_CAPTURE_CANVAS
```

Everything else is extension-UI only (options/popup). Router checks `sender.url` against `chrome.runtime.getURL('')`.

### 6.4 Broadcasts (background → tabs)

```ts
LIBRARY_UPDATED  { action: add|update|remove, mediaId, libraryItem? }
FILMMAKERS_UPDATED { action: sync|follow|unfollow, personId }
```

Hover cards accept `LIBRARY_UPDATED` only when `sender.id === chrome.runtime.id`.

### 6.5 Capture / notes write path

Typical flow:

1. Ensure `MediaItem` in media store (`ADD_TO_LIST` / resolve).  
2. `UPDATE_STATUS` → may set `sanctuaryIntent` via `intentForStatus`.  
3. `SET_USER_NOTES` → `notes`, `emotionalRecall`, atmosphere, spectrum fields.

Deep link: options URL `?act=capture&mediaId=<valid id>` opens `PoeticCaptureCanvas`.

---

## 7. Content-script information architecture

### 7.1 Injection scope

Manifest: `matches: ["http://*/*", "https://*/*"]`, `run_at: document_idle`.  
User can disable per-domain via `disabledDomains` / `ContentPrefs.domainDisabled`.

### 7.2 Modules

| Module | Role |
|--------|------|
| `scanner.ts` | Title text detection + image/poster scan; sensitivity; MutationObserver |
| `catalogDetector.ts` | Heuristic “catalog page” regions for denser poster scanning |
| `overlay.ts` | Museum plaque manager (Shadow DOM), attach badge on poster match |
| `hoverCard.tsx` | Hover card UI + library status cache (`CHECK_LIBRARY_STATUS`) |
| `dock.ts` | Optional Auteur Screenplay Dock; page-local reflections storage |
| `index.ts` | Init/teardown on load/`pagehide`; gates on prefs |

### 7.3 Poster resolve

- Content → `RESOLVE_POSTER` → TMDb-backed match → `PosterMatch` (tmdbId, title, year, type movie|tv, ratings, library flags).  
- Per-origin **budget** and query clamping (security / quota) documented in README and enforced in handler/content paths.  
- Plaques use isolated **Shadow DOM** so host CSS is not broken.

### 7.4 Feature flags (content)

| Pref | Default (DEFAULT_PREFS) | Effect |
|------|-------------------------|--------|
| `hoverCardsEnabled` | true | Title hover cards |
| `posterOverlaysEnabled` | true | Museum plaques |
| `screenplayDockEnabled` | false | Floating dock |
| `detectionSensitivity` | medium | Scanner aggressiveness |

---

## 8. UI information architecture

### 8.1 Shell navigation (`App.tsx`)

**Primary nav**

| Key | Label |
|-----|--------|
| `library` | Archive |
| `home` | Discovery |
| `settings` | Settings |

**Explore subnav**

| Key | Label |
|-----|--------|
| `search` | Search |
| `recommendations` | Recommendations |
| `new-releases` | Now Showing |
| `people` | Filmmakers |
| `stats` | House Stats |
| `alerts` | Premiere Alerts |

`Page` type also includes these routes for prefetch (`usePrefetch.ts`).

### 8.2 Page → data responsibilities

| Page | Primary data |
|------|----------------|
| **Onboarding** | Wizard: TMDb required, OMDb/LLM optional → `SET_PREFERENCES` + `onboardingComplete` |
| **Library (Archive)** | `GET_LIBRARY`, filter by intent/status, spine cards, DetailModal |
| **Home (Discovery)** | Digest, recommendations, library snippets, discovery feed surfaces |
| **Search** | `SEARCH_TITLES` / discovery search |
| **Recommendations** | Personalized / rule+LLM recs |
| **New Releases** | `GET_LATEST_RELEASES` |
| **People** | Followed filmmakers, filmography |
| **Stats** | Emotional averages, house stats from library |
| **Alerts** | Watch alert CRUD |
| **Settings** | Keys, content toggles, curator prompts, Drive, diagnostics |
| **Popup** | Quick search + log capture (status + notes + emotions) |

### 8.3 Shared UI components (domain-critical)

| Component | Role |
|-----------|------|
| `PoeticCaptureCanvas` | Full-screen capture act |
| `DetailModal` | Full record: poster, reflection, tags, spectrum |
| `HardcoverSpineCard` | Archive spine + excerpt |
| `SanctuaryMediaCard` | Grid/list media presentation |
| `EmotionalSliders` / `EmotionalWeatherChart` / `AuraVisualizer` | Spectrum UI |
| `FilmographyView` | Person body of work |
| `EmptyStateProjection` | Empty archive metaphor |
| `FilmGrain` | Atmospheric chrome |
| `SettingsDiagnosticsPanel` | Logs |

### 8.4 Design / copy systems

| Asset | Role |
|-------|------|
| `src/shared/tokens.css` | Design tokens (authority over brand.md on conflict) |
| `CINEMATIC_JOURNAL_DESIGN_SPEC.md` | Motion, typography, sanctuary UI rules |
| `docs/CINEMA_VOICE.md` | Copy lexicon |
| `src/shared/theme.ts` | dark/light/system + cinema atmospheres |

---

## 9. External services & host permissions

| Service | Role | Config |
|---------|------|--------|
| **TMDb** | Primary metadata, posters, people, filmography, search | User API key (Bearer / Read Access Token) |
| **OMDb** | Optional IMDb/RT-style ratings | Optional key |
| **OpenAI / Anthropic / Gemini** | Optional LLM curator | User keys; client-side calls |
| **Trakt** | Free discovery / trending signals | Client ID in source |
| **TVMaze** | Free TV data | No user key |
| **Wikidata / Wikipedia** | Summaries / director bio enrichment | Public endpoints |
| **Google APIs** | Drive appData backup + userinfo email | OAuth client in `googleDriveOAuth.ts` |

Manifest also lists these under `host_permissions`. Content scripts do not hold keys.

---

## 10. Security boundaries (IA-relevant)

| Boundary | Rule |
|----------|------|
| API keys | IndexedDB prefs only; not encrypted at rest |
| Content scripts | Allowlisted messages; no full library dump; no keys in `GET_CONTENT_PREFS` |
| Poster resolve | Budget + query length/word constraints |
| LIBRARY_UPDATED | Verify extension sender id |
| Managers | Explicit `destroy()` on teardown |
| Export | Library data without shipping secrets as product policy |

---

## 11. Cross-cutting product flows (end-to-end)

### 11.1 First run

1. Install → SW starts → seed catalogue if empty.  
2. Open options → load prefs → if `!onboardingComplete` → Onboarding wizard.  
3. User validates TMDb → optional OMDb/LLM → `onboardingComplete: true`.  
4. Demo/seed library may already show archive vision.

### 11.2 Discover on the open web

1. Content script loads → `GET_CONTENT_PREFS`.  
2. Scan images/text → `RESOLVE_POSTER` / title details.  
3. Plaque + hover → library check per mediaId.  
4. Reflect / open detail / add to list.

### 11.3 Capture

1. `OPEN_CAPTURE_CANVAS` or UI `?act=capture`.  
2. Emotional recall first; then intent + rating + spectrum.  
3. Persist via library handlers.

### 11.4 Archive browse

1. `GET_LIBRARY` → join media.  
2. Group by `sanctuaryIntent`.  
3. Excerpts from `emotionalRecall` / notes hierarchy (`getReflectionExcerpt`).

### 11.5 Follow filmmaker

1. Search person (TMDb).  
2. Follow → store `PersonItem`, sync filmography IDs.  
3. UI filmography view; `FILMMAKERS_UPDATED` broadcast.

### 11.6 AI recommendations

1. Build `WatchProfile` from library (ratings + note excerpts ≤100 chars + creators).  
2. LLM adapters (provider polymorphic).  
3. Optional grouping pass (“because you experienced X”).

---

## 12. Cinema-coupled assumptions (critical for any books expansion)

These are **hard-coded or deeply assumed** today. Your instruction package will need to address each explicitly.

| # | Assumption | Where it lives |
|---|------------|----------------|
| 1 | Medium is only `movie \| tv` | `MediaType`, nearly all handlers/UI filters |
| 2 | Primary metadata is TMDb-shaped | `tmdb.ts`, people IDs, posters, genres, releases |
| 3 | Discovery on web = **poster images + film titles** | scanner, overlay, RESOLVE_POSTER |
| 4 | People = film **crew roles** | `CrewRole`, filmography |
| 5 | Emotional axes use **cinema metaphors** | emotions.ts labels, cinema voice |
| 6 | Status/intent copy is screening language | Anticipated / Screened / Now showing |
| 7 | Runtime, streaming platforms, premiere alerts | MediaItem + alerts + platforms |
| 8 | Media ID namespaces are video providers | `mediaIds.ts` |
| 9 | Seed catalogue is films/TV + filmmakers | seedData |
| 10 | Product copy & store listing = film journal | manifest description, README, CWS kit |
| 11 | Capture metaphors: screenplay dock, script parallels | LibraryItem fields, dock |
| 12 | Stats/recs language: watched, screened, house | UI pages |

**Structural strengths that *can* generalize** (medium-agnostic bones):

- Split catalog entity vs user relationship (`MediaItem` / `LibraryItem`).  
- Sanctuary intents + emotional recall-first capture.  
- Extension layered architecture (content / background / UI).  
- Message allowlist security model.  
- Preferences for domain disable + detection toggles.  
- Optional LLM taste profile from qualitative notes.  
- Local-first IndexedDB + export/Drive.

---

## 13. Source file map (quick index)

```text
src/
  background/          SW: APIs, storage, handlers, seed, events
  content/             Scanner, plaques, hover, dock
  shared/              types, messages, mediaIds, emotions, tokens, theme
  ui/
    pages/             App routes
    components/        Capture, archive, detail, emotions
    popup.tsx          Compact capture surface
    lib/               validateKeys, ensureDemoLibrary
tests/                 Vitest unit/integration (~234 tests at 0.2.0)
store/                 CWS listing kit (packaging, not product IA)
docs/                  Privacy, cinema voice, design briefs
manifest.json          MV3 permissions & content_scripts
```

---

## 14. Quality / packaging snapshot (context only)

| Item | State at 0.2.0 |
|------|----------------|
| Typecheck | Green (`tsc --noEmit`) |
| Tests | ~234 |
| CI | GitHub Actions typecheck + test + build |
| Package | `npm run package` → `subsume.zip` |
| Desktop test kit | `<local-path>` (Load unpacked) |
| Privacy | `docs/PRIVACY.md` + `docs/privacy.html` |

---

## 15. How to use this document next

When you write your **instruction package + updated markdown**, please:

1. Treat **this file as immutable baseline** (or version it: append “v1” if you revise later).  
2. In your doc, structure deltas as:
   - **Product decision** (one sanctuary vs two modes vs sibling brand)
   - **Entity model changes** (new types, ID schemes, shared vs forked fields)
   - **IA changes** (nav, capture, archive, people → authors)
   - **Content-script changes** (book detection surfaces)
   - **API / host_permission changes**
   - **Migration** (existing IndexedDB users)
   - **Copy / voice** (cinema-only vs dual lexicon)
   - **Phased delivery** (MVP books slice vs full parity)
   - **Non-goals** for v1 books
3. Call out which cinema-coupled assumptions (§12) you **keep**, **generalize**, or **duplicate per medium**.

Suggested companion filename for your reply package:

```text
<local-path>
```

(or any name you prefer—this baseline will stay at the path below.)

---

## 16. Document location

| Path | Role |
|------|------|
| **`<local-path>`** | This baseline (source of truth for planning) |
| Optional mirror | Copy into repo `docs/` later if you want it versioned in git |

---

*End of as-is information architecture. Product remains film/TV-only until your expansion instructions redefine the domain model and surfaces.*
