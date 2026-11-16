# Page audit, 2026-11-16 (before any fix)

Workstream 1 of `docs/plans/2026-11-13-north-star.md`. Produced by `npm run audit:pages`
(`scripts/audit_pages.py`, raw numbers in `docs/audit/results/results.json`). Expected fields are in
`docs/audit/expected-fields.md` and are **a draft the owner has not approved yet**.

## How it was measured

- Real Chromium (Chromium 1169 from the windsurf cache via `CHROME_PATH`, headless, temporary profile), built `dist/` loaded as the extension.
- Network fully replayed from `tests/fixtures/audit/` (the audit made zero live calls). Anything not in the fixtures gets a 503 and is counted. Images are served as a small placeholder PNG; one URL is made to 404 on purpose.
- 40 titles saved through the real handlers: 16 films from `seedData.ts` (provenance `seed`), 2 hand-written films (`synthetic-shape`, labelled "Audit Fixture"), 8 series from recorded TVmaze responses, 14 books from recorded Open Library responses (`recorded`, real responses fetched 2026-11-16 with no key). Awkward cases: no cover, several editions, translated and non-English titles, pre-1800, very new, Indian titles, a page the resolver cannot match.
- "Time until fully shown" = browser clock from navigation until no skeleton/spinner/loading text, images in view loaded, stable for 3 polls. Library detail and search are medians over titles. Search time is from pressing Enter.
- Not covered (needs keys): TMDb films/series, OMDb, Google Books, Trakt, LLM picks. The film "all fields" figures therefore describe seed data and the render path, not live TMDb data.
- The only films come from the seed catalogue or hand-written records because films cannot be fetched offline without a TMDb key.

## Headline

Books are measurably thinner than films and series, and it starts before any page: **4 of 14 books could not be saved at all** (see defect 1), and the 10 that were saved carry no description, page count or subjects. But films are not fine either: **no film card on any page shows its director**, and **no screen runtime is ever shown**.

## Results

| Page | Medium | Titles | Shown | All fields OK | Complete | Fields missing | Fields wrong | Images failed | Time until fully shown |
| :-- | :-- | --: | --: | --: | --: | :-- | :-- | --: | :-- |
| library | Film | 18 | 17 | 0 | 0% | creator:stored-not-shown x16, cover:stored-not-shown x1, creator:not-stored x1 | none | 0 | 287 ms |
| library | Series | 8 | 8 | 8 | 100% | none | none | 0 | 287 ms |
| library | Book | 14 | 10 | 0 | 0% | creator:not-stored x1, creator:stored-not-shown x9, cover:not-stored x1 | none | 0 | 287 ms |
| library-detail | Film | 18 | 17 | 0 | 0% | size:not-stored x16, cover:stored-not-shown x1, creator:not-stored x1, size:stored-not-shown x1 | none | 0 | 213 ms (median of 17) |
| library-detail | Series | 8 | 8 | 8 | 100% | none | none | 0 | 210 ms (median of 8) |
| library-detail | Book | 14 | 10 | 0 | 0% | creator:not-stored x1, size:not-stored x10, genres:not-stored x10, description:not-stored x9, cover:not-stored x1 | none | 0 | 212 ms (median of 10) |
| search | Film | 18 | 17 | 16 | 89% | cover:stored-not-shown x1, creator:not-stored x1 | none | 0 | 7590 ms (median of 17) |
| search | Series | 8 | 8 | 8 | 100% | none | none | 0 | 7578 ms (median of 8) |
| search | Book | 14 | 10 | 0 | 0% | year:stored-not-shown x1, creator:not-stored x1, description:stored-not-shown x1, creator:stored-not-shown x9, description:not-stored x9, cover:not-stored x1 | none | 0 | 105 ms (median of 10) |
| home | Film | 5 | 5 | 5 | 100% | none | none | 0 | 164 ms |
| home | Series | 1 | 1 | 1 | 100% | none | none | 0 | 164 ms |
| home | Book | 6 | 6 | 0 | 0% | year:stored-not-shown x6, cover:not-stored x1 | none | 0 | 164 ms |
| recommendations | Film | 6 | 6 | 5 | 83% | cover:stored-not-shown x1 | none | 0 | 132 ms |
| recommendations | Series | 2 | 2 | 2 | 100% | none | none | 0 | 132 ms |
| recommendations | Book | 2 | 2 | 0 | 0% | genres:not-stored x2 | none | 0 | 132 ms |

| Page (no per-title list) | Time until fully shown | Notes |
| :-- | --: | :-- |
| onboarding | 192 ms | bad text: none; unstubbed requests on load: 6 |
| stats | 109 ms | bad text: none; unstubbed requests on load: n/a |
| people | 110 ms | bad text: none; unstubbed requests on load: n/a |
| alerts | 64 ms | bad text: none; unstubbed requests on load: n/a |
| new-releases | 116 ms | bad text: none; unstubbed requests on load: 0 |
| settings | 112 ms | bad text: none; unstubbed requests on load: 3 |
| home | 164 ms | bad text: none; unstubbed requests on load: n/a |
| recommendations | 132 ms | bad text: none; unstubbed requests on load: n/a |
| library | 287 ms | bad text: none; unstubbed requests on load: n/a |

"Titles" is the denominator: all titles of that medium for Library and Search (an unsaved title counts as a failure); only the titles that appear for Home and Recommendations (those pages are not meant to list everything). "Complete" = share with every expected field present and nothing wrong. Missing reasons: `not-stored` = the saved record lacks it, `stored-not-shown` = the record has it and the page does not render it.

Other measured facts:
- Save step: 35 of 40 saved. Not saved: 3 books (Gatsby and Norwegian Wood by ISBN, The Odyssey) and 1 film with unknown year or year before 1800 (defect 1); 1 page candidate the resolver could not match (expected; nothing should be saved).
- Stats with 23 watched titles: "0 hrs on screen"; the reading panel shows "6 finished" and **no pages total**; top genres count only screen titles (books contribute none).
- People: every followed creator (4 seed people plus the people attached to saved films, and 2 authors) renders with name, role and count. The two authors have initials only, no photo.
- Alerts: film, series and book alerts all render name, medium and criteria correctly.
- New releases: with no key it shows a clear "needs a TMDb key" notice (a designed state). There is no book equivalent.
- No uncaught page errors, no service worker errors, no literal "undefined"/"NaN" on any page. The console shows only 404 lines (the deliberately dead poster).
- Network dependence: Onboarding makes 6 and Settings 3 requests not in the fixtures; Search makes several provider calls per query (Trakt, TVmaze among them) and none of them is needed to show saved titles, but they are what makes search slow offline.
- Home hero is not the user's library: with an empty feed it shows the first live-feed premiere ("America's Funniest People"), with the line "Add a film or book to your journal".

## Worst pages, ranked

1. **Library (Archive)**: 0% complete for films and books. No creator on any card; books also lose cover (1) and 4 are missing entirely. Detail modal: never shows runtime or page count, books have no description or genres.
2. **Search**: books 0% complete, no author shown, 9 of 10 without a description; films and series are fine (89% and 100%). Offline it takes about 7.6 s to show results for films and series.
3. **Stats**: hours on screen is 0 and pages read never appears, because the numbers it sums are never stored.
4. **Home**: books 0% (no year on the Recently Inscribed card); hero says "Directed by" and cannot show an author; hero is a feed item, not the user's title.
5. **Recommendations**: books have no genres (2 of 2); films and series fine.
6. **People, Alerts, New releases, Settings, Onboarding**: no content defects found; Onboarding and Settings make unstubbed requests on load.

## Specific defects, ranked, with likely cause

1. **A book with an unknown year, or published before 1800, cannot be saved.** `isValidMediaItem` rejects `year < 1800` (`src/background/storage.ts:1028`), while book mapping defaults a missing year to 0 (`src/shared/compatibility.ts` `year: work.firstReleaseYear ?? 0`) and Open Library work records often have no `first_publish_date`. Result: Gatsby and Norwegian Wood saved from an ISBN page fail with "Invalid media item payload" even though their edition record has a year (2004, 1987); The Odyssey (Open Library year 1488) fails; so does any classic. Films with year 0 hit the same check.
2. **Page count never reaches the record.** `catalogWorkToMediaItem` hard-codes `pageCount: undefined` (`src/shared/compatibility.ts:120`); the ISBN path has `edition.pageCount` but does not copy it (`src/background/handlers/books.ts`, RESOLVE_PAGE_CANDIDATE); the Open Library search request has no `fields` parameter (`src/background/openLibrary.ts:547`) so the real response carries no `number_of_pages_median`, `subject` or `isbn`, although `OlSearchDoc` and the mapper expect them. The repo's hand-made test fixtures include those fields; the real recorded responses do not, which is why tests pass and pages are thin. Effect: Stats never shows pages, detail modal total-pages field is blank.
3. **Book description, genres/subjects never stored from search.** Search docs carry no description and `genres` is always `[]` (`openLibrary.ts:378`), and nothing follows up with the work record on save. 9 of 10 saved books have no description, 10 of 10 no genres; Stats top genres and Recommendations genre chips ignore books.
4. **Creator is never shown on cards.** `HardcoverSpineCard` (`src/ui/components/archive/HardcoverSpineCard.tsx:100-120`) and `SanctuaryMediaCard` (`src/ui/components/SanctuaryMediaCard.tsx`, default meta) render no director or author, although the record has them (`authors`, `wikidataDirectorBio`). Detail modal shows authors for books only (`DetailModal.tsx:703`) and never runtime (no use of `runtimeMinutes` in the file). The library card also shows only a TMDb rating badge, so books and series never show a rating.
5. **Home hero and weekly cards are film-shaped.** The hero prints `Directed by ${wikidataDirectorBio}` (`src/ui/pages/Home.tsx:341`) with no author path; weekly and recommendation cards print `{pick.year}` / `{media.year}` unguarded (`Home.tsx:748,767`, `RecommendationMediaCard.tsx:43`), which would print "0" for any title with an unknown year; Recently Inscribed cards have no year.
6. **Offline Search takes ~7.6 s.** Each Trakt call retries four times with doubling delay (`src/background/tmdb.ts` `fetchWithRetry`, used by `trakt.ts:38,70`), serially before results are shown.
7. **Series have no creator or size field in the model** (`MediaItem`), so nothing can be shown; a gap in the model, not a page bug.

## Needs the owner

- Approve or change `docs/audit/expected-fields.md` (in particular: series creator/size, whether the library card should show a creator).
- Whether the title set is right, and whether keyed providers (TMDb, Google Books) should be added to the audit.
- Whether a book with an unknown year should be saved (shown as a designed gap) rather than rejected.
