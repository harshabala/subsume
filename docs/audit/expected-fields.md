# Expected fields per page and medium

Status: **draft for the owner to approve** (north-star plan, workstream 1). The audit script
(`npm run audit:pages`, `scripts/audit_pages.py`, constant `EXPECTED`) checks exactly this table.
Basis: scenario 1 of the plan ("cover, author, year, page count and description appear on Home,
Library, Search and Stats exactly as a film's poster, director, year and runtime do").

Field meanings: **cover** = poster/cover image loaded (a designed placeholder counts as missing when a
cover exists in the record, or when none is stored); **creator** = director (film) or author (book);
**size** = runtime (film) or page count (book); **description** = overview/synopsis; **genres** = at least
one genre/subject chip. A field absent from the stored record is reported as `not-stored`; a field present
in the record but absent on the page is `stored-not-shown`.

Series: no creator or size is expected, because the data model (`MediaItem`) has no field for them yet.
This is itself a gap the owner may want to close.

| Page | Surface audited | Film | Series | Book |
| :--- | :--- | :--- | :--- | :--- |
| Library | card (`HardcoverSpineCard`) | cover, title, medium, year, creator | cover, title, medium, year | cover, title, medium, year, creator |
| Library | detail modal (`DetailModal`) | cover, title, medium, year, creator, description, runtime, genres | cover, title, medium, year, description, genres | cover, title, medium, year, author, description, pages, genres |
| Search | result card (`SanctuaryMediaCard`) | cover, title, medium, year, creator, description | cover, title, medium, year, description | cover, title, medium, year, author, description |
| Home | title cards shown (hero, recent, picks) | cover, title, year | cover, title, year | cover, title, year |
| Recommendations | card | cover, title, medium, year, genres | same | same |
| Stats | aggregates | counts, hours on screen from runtime, top genres | counts, top genres | counts, pages read from page count, top genres |
| People (Creators) | follow card | avatar, name, role label, works count | n/a | avatar, name, "Author", works count |
| Alerts | alert row | name, medium label, criteria | name, medium label, criteria | name, "Books", author/keyword criteria |
| New releases | n/a for titles | screen only by design; no-key state must be a designed notice | same | no book equivalent exists |
| Settings | no title content | no "undefined", no errors | | |
| Onboarding | no title content | no "undefined", no errors | | |

Every page, every medium (generic checks): no literal `undefined`/`NaN`/`null`/`[object`; a year of 0 is never
printed; no broken-image glyph; no uncaught page error or console error; a loading state ends in content;
nothing needs the network to show saved titles (requests not in the fixtures are counted).

Not covered (needs keys, out of scope offline): TMDb-sourced films and series, OMDb ratings, Google Books,
LLM recommendations, Trakt trending.
