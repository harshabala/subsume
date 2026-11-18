"""Page-by-page content audit (workstream 1 of docs/plans/2026-11-13-north-star.md).

Loads the built extension in a real, temporary Chromium profile with ALL network replayed
from tests/fixtures/audit (nothing leaves the machine), saves the fixed 40-title set through
the extension's real message handlers, then opens each UI page and reports, per page and per
medium: fields missing, fields wrong, images failed, and time until the page is fully shown.

Usage:  npm run build && python3 scripts/audit_pages.py [--out DIR]
Expected fields: docs/audit/expected-fields.md (mirrored in EXPECTED below).
"""
import argparse, base64, json, os, re, shutil, struct, sys, tempfile, time, zlib
from urllib.parse import quote, unquote

from playwright.sync_api import sync_playwright

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from browser_harness import ROOT, launch_extension_context, wait_service_worker  # noqa: E402

FIX = os.path.join(ROOT, "tests", "fixtures", "audit")
RESP = json.load(open(os.path.join(FIX, "recorded", "responses.json")))
TITLES = json.load(open(os.path.join(FIX, "titleset.json")))["titles"]
SEED = json.load(open(os.path.join(FIX, "seed-subset.json")))
SCHEDULE = next(v for k, v in RESP.items() if "schedule?country=US" in k)

MEDIUM_LABEL = {"movie": "Film", "tv": "Series", "book": "Book"}


def png(w=20, h=30):
    raw = b"".join(b"\x00" + b"\x40\x40\x40" * w for _ in range(h))
    def chunk(t, d):
        c = struct.pack(">I", len(d)) + t + d
        return c + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b""))

PNG = png()
IMAGE_HOSTS = ("covers.openlibrary.org", "image.tmdb.org", "static.tvmaze.com", "archive.org")


class Net:
    """Replays recorded responses; records everything else as an unstubbed request."""
    def __init__(self):
        self.unstubbed = []
        self.images_failed = []
        self.stubbed = 0

    def handle(self, route):
        url = route.request.url
        if url.startswith(("chrome-extension://", "data:")):
            return route.continue_()
        host = url.split("/")[2] if "//" in url else ""
        if host in IMAGE_HOSTS or route.request.resource_type == "image":
            if "DEADIMG" in url:
                self.images_failed.append(url)
                return route.fulfill(status=404, body="")
            return route.fulfill(status=200, content_type="image/png", body=PNG)
        rec = RESP.get(url) or RESP.get(url.replace('%27', "'"))
        if rec is None and "api.tvmaze.com/schedule?country=US&date=" in url:
            rec = SCHEDULE
        if rec is None:
            self.unstubbed.append(url)
            return route.fulfill(status=503, body="offline (not in audit fixtures)")
        self.stubbed += 1
        return route.fulfill(status=rec["status"], content_type="application/json", body=json.dumps(rec["body"]))


def msg(page, type_, payload=None):
    return page.evaluate(
        "([t,p]) => new Promise(r => chrome.runtime.sendMessage({type: t, payload: p ?? {}}, r))",
        [type_, payload],
    )


def ingest(ui):
    """Save the fixed title set via the real handlers. Returns {key: {mediaId, ok, note}}."""
    saved = {}
    for t in TITLES:
        ing, key = t["ingest"], t["key"]
        media, note = None, ""
        try:
            if ing["kind"] == "seed-film":
                media = next(m for m in SEED["films"] if m["id"] == ing["id"])
            elif ing["kind"] == "synthetic-film":
                media = ing["media"]
            elif ing["kind"] == "tvmaze":
                r = msg(ui, "DISCOVERY_SEARCH", {"query": ing["query"], "type": "tv"})
                hits = r.get("data") or []
                media = next((h for h in hits if h["canonicalTitle"] == ing["pickTitle"]), None)
                if not media:
                    note = f"no matching hit among {len(hits)}"
            elif ing["kind"] == "openlibrary":
                if ing["route"] == "unmatched":
                    r = msg(ui, "RESOLVE_PAGE_CANDIDATE", {"medium": "book", "title": t["ingest"]["query"], "confidence": 0.7,
                            "sourcePageUrl": "https://example.test/book", "evidence": []})
                    d = r.get("data") or {}
                    media = d.get("media") if d.get("resolved") else None
                    note = "resolver returned no match" if not media else ""
                elif ing["route"] == "isbn":
                    r = msg(ui, "RESOLVE_PAGE_CANDIDATE", {"medium": "book", "title": ing["pickTitle"], "isbn13": [ing["isbn13"]],
                            "confidence": 0.9, "sourcePageUrl": "https://example.test/book", "evidence": []})
                    d = r.get("data") or {}
                    media = d.get("media") if d.get("resolved") else None
                    note = "" if media else f"isbn resolve failed: {r}"
                else:
                    r = msg(ui, "SEARCH_WORKS", {"query": ing["query"], "medium": "book", "limit": 8})
                    hits = (r.get("data") or {}).get("works") or []
                    def ok(h):
                        if ing.get("pickTitle") and h["canonicalTitle"] != ing["pickTitle"]:
                            return False
                        if ing.get("pickAuthor") and not any(ing["pickAuthor"].lower() in a.lower() for a in h.get("authors") or []):
                            return False
                        return True
                    media = next((h for h in hits if ok(h)), hits[0] if hits and not ing.get("pickTitle") else None)
                    if not media:
                        note = f"no hit among {len(hits)}"
        except Exception as e:  # noqa: BLE001
            note = f"ingest error: {e}"
        if not media:
            saved[key] = dict(ok=False, note=note or "no media")
            continue
        status = "watched" if (len(saved) % 3 != 2) else "to-watch"
        if media["type"] == "book":
            r = msg(ui, "ADD_TO_ARCHIVE", {"mediaItem": media, "status": status})
        else:
            r = msg(ui, "ADD_TO_LIST", {"mediaItem": media, "type": media["type"]})
            if status != "to-watch":
                msg(ui, "UPDATE_STATUS", {"mediaId": media["id"], "status": status})
        if not r.get("success"):
            saved[key] = dict(ok=False, note=f"save failed: {r.get('error')}")
            continue
        if status == "watched":
            msg(ui, "SET_USER_NOTES", {"mediaId": media["id"], "notes": "Audit reflection.", "awe": 60, "melancholy": 40, "tension": 30, "warmth": 50})
            msg(ui, "SET_USER_RATING", {"mediaId": media["id"], "rating": 7})
        saved[key] = dict(ok=True, mediaId=media["id"], status=status, note=note)
    return saved



# ── Expected fields (mirrors docs/audit/expected-fields.md) ─────────────────────
EXPECTED = {
    "library-card":   {"movie": ["cover", "title", "medium", "year", "creator"], "tv": ["cover", "title", "medium", "year"], "book": ["cover", "title", "medium", "year", "creator"]},
    "library-detail": {"movie": ["cover", "title", "medium", "year", "creator", "description", "size", "genres"], "tv": ["cover", "title", "medium", "year", "description", "genres"], "book": ["cover", "title", "medium", "year", "creator", "description", "size", "genres"]},
    "search-card":    {"movie": ["cover", "title", "medium", "year", "creator", "description"], "tv": ["cover", "title", "medium", "year", "description"], "book": ["cover", "title", "medium", "year", "creator", "description"]},
    "home-card":      {"movie": ["cover", "title", "year"], "tv": ["cover", "title", "year"], "book": ["cover", "title", "year"]},
    "recs-card":      {"movie": ["cover", "title", "medium", "year", "genres"], "tv": ["cover", "title", "medium", "year", "genres"], "book": ["cover", "title", "medium", "year", "genres"]},
}

BAD_TEXT = re.compile(r"undefined|NaN|\[object|\bnull\b")

READY_JS = """() => {
  const main = document.querySelector('main, .main-content, #app') || document.body;
  const busy = main.querySelector('.skeleton, .subsume-spinner, [aria-busy="true"]');
  const txt = main.innerText || '';
  const loadingText = /(Loading|Fetching|Searching catalogue|Syncing|Generating)/.test(txt);
  const imgs = Array.from(document.images);
  const pending = imgs.filter(i => !i.complete && i.getBoundingClientRect().top < innerHeight * 1.5).length;
  return {busy: !!busy, loadingText, pending, now: performance.now(), len: txt.trim().length};
}"""

CARDS_JS = """([sel, titleSel]) => Array.from(document.querySelectorAll(sel)).map(el => {
  const t = el.querySelector(titleSel);
  return {title: t ? t.textContent.trim() : '', text: el.innerText, imgs: Array.from(el.querySelectorAll('img')).map(i => ({src: i.currentSrc || i.src, ok: i.complete && i.naturalWidth > 0})),
          placeholder: !!el.querySelector('[class*=placeholder], [class*=empty-poster]')};
})"""


def wait_ready(page, minimum=None, cap=20.0, extra=None):
    """Returns ms (page clock) when the page first stays fully shown for 3 polls, or None on timeout."""
    stable, first, end = 0, None, time.time() + cap
    while time.time() < end:
        st = page.evaluate(READY_JS)
        ok = not st["busy"] and not st["loadingText"] and st["pending"] == 0 and st["len"] > 0
        if ok and minimum:
            ok = page.evaluate("(s) => document.querySelectorAll(s).length > 0", minimum)
        if ok and extra:
            ok = page.evaluate(extra)
        if ok:
            stable += 1
            first = first if first is not None else st["now"]
            if stable >= 3:
                return round(first)
        else:
            stable, first = 0, None
        page.wait_for_timeout(40)
    return None


LOAD_ALL_IMAGES_JS = """async () => {
  const imgs = Array.from(document.images);
  imgs.forEach(i => { i.loading = 'eager'; });
  const end = performance.now() + 6000;
  while (performance.now() < end && imgs.some(i => !i.complete)) await new Promise(r => setTimeout(r, 50));
}"""


def settle_images(page):
    """Measurement aid, run AFTER the time-to-shown reading: force offscreen lazy images to load so cover checks are fair."""
    page.evaluate(LOAD_ALL_IMAGES_JS)


def creator_of(rec):
    if rec["type"] == "movie":
        n = (rec.get("wikidataDirectorBio") or "").split(",")[0].strip()
        return n or None
    if rec["type"] == "book":
        a = rec.get("authors") or []
        return a[0] if a else None
    return None


def size_of(rec):
    if rec["type"] == "movie":
        return rec.get("runtimeMinutes")
    if rec["type"] == "book":
        return rec.get("pageCount")
    return None


def check(spec, rec, card, mode):
    """Returns (missing:list[str], wrong:list[str], images_failed:int). card: dict from CARDS_JS."""
    medium = rec["type"]
    text = (card["text"] or "")
    low = text.lower()
    miss, wrong = [], []
    for f in EXPECTED[spec][medium]:
        if f == "title":
            if rec["canonicalTitle"].lower() not in low:
                miss.append("title:not-rendered")
        elif f == "cover":
            if not rec.get("posterUrl"):
                miss.append("cover:not-stored")
            elif not any(i["ok"] for i in card["imgs"]):
                miss.append("cover:stored-not-shown")
        elif f == "medium":
            if MEDIUM_LABEL[medium].lower() not in low:
                miss.append("medium:not-rendered")
        elif f == "year":
            if not rec.get("year"):
                if "year unknown" not in low:
                    miss.append("year:gap-not-shown")
            elif str(rec["year"]) not in text:
                miss.append("year:stored-not-shown")
        elif f == "creator":
            c = creator_of(rec)
            if not c:
                miss.append("creator:not-stored")
            elif c.lower() not in low:
                miss.append("creator:stored-not-shown")
        elif f == "description":
            d = (rec.get("overview") or "").strip()
            if not d:
                miss.append("description:not-stored")
            elif d[:30].lower() not in low:
                miss.append("description:stored-not-shown")
        elif f == "size":
            sz = size_of(rec)
            if not sz:
                miss.append("size:not-stored")
            elif str(sz) not in text:
                miss.append("size:stored-not-shown")
        elif f == "genres":
            g = rec.get("genres") or []
            if not g:
                miss.append("genres:not-stored")
            elif not any(x.lower() in low for x in g):
                miss.append("genres:stored-not-shown")
    if BAD_TEXT.search(text):
        wrong.append("literal undefined/NaN/null text")
    if re.search(r"(^|\n|\s)0(\s|\n|$)", text) and not rec.get("year"):
        wrong.append("year shown as 0")
    if medium == "book" and re.search(r"directed by", low):
        wrong.append("book labelled 'Directed by'")
    imgs_failed = sum(1 for i in card["imgs"] if not i["ok"])
    return miss, wrong, imgs_failed


def goto_page(ui, base, page_name):
    ui.goto(f"{base}?page={page_name}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(ROOT, "docs", "audit", "results"))
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    if not os.path.exists(os.path.join(ROOT, "dist", "manifest.json")):
        print("dist/ not built; run `npm run build` first", file=sys.stderr)
        return 2
    net = Net()
    page_errors, console_errors = [], []
    results = {"generatedAt": time.strftime("%Y-%m-%d %H:%M:%S"), "pages": {}, "perTitle": {}}
    profile = tempfile.mkdtemp(prefix="subsume-audit-")
    try:
        with sync_playwright() as p:
            ctx = launch_extension_context(p, profile)
            ctx.route("**/*", net.handle)
            sw, ext = wait_service_worker(ctx)
            sw.on("console", lambda m: console_errors.append("sw: " + m.text) if m.type == "error" else None)
            base = f"chrome-extension://{ext}/ui/index.html"
            ui = ctx.new_page()
            ui.on("pageerror", lambda e: page_errors.append(str(e)))
            ui.on("console", lambda m: console_errors.append("ui: " + m.text) if m.type == "error" else None)

            def record(page_key, medium, **kw):
                results["pages"].setdefault(page_key, {}).setdefault(medium, {}).update(kw)

            def page_generic(key, ready_ms):
                text = ui.inner_text("body")
                return dict(ready_ms=ready_ms, bad_text=sorted(set(BAD_TEXT.findall(text))), chars=len(text.strip()))

            # Onboarding on a fresh profile (before anything is saved)
            n0 = len(net.unstubbed)
            ui.goto(base)
            t = wait_ready(ui)
            results["pages"]["onboarding"] = {"all": page_generic("onboarding", t)}
            results["pages"]["onboarding"]["all"]["unstubbed_requests"] = len(net.unstubbed) - n0

            msg(ui, "SET_PREFERENCES", {"onboardingComplete": True})
            saved = ingest(ui)
            msg_people = msg(ui, "IMPORT_LIBRARY", {"people": SEED["people"]})
            people_log = [str(msg_people.get("success"))]
            for q in ("kalki", "arundhati roy"):
                r = msg(ui, "SEARCH_PERSON", {"query": q})
                res = ((r.get("data") or {}).get("results")) or []
                if res:
                    f = res[0]
                    fr = msg(ui, "FOLLOW_PERSON", {"personId": f["id"], "name": f["name"], "knownForDepartment": "Author", "profilePath": f.get("profilePath"), "knownFor": f.get("knownFor", []), "role": "writer"})
                    people_log.append(f"{q}:{fr.get('success')}")
            for a in ({"name": "Audit film alert", "type": "movie", "keyword": "night"}, {"name": "Audit series alert", "type": "tv", "keyword": "dark"},
                      {"name": "Audit book alert", "type": "book", "authorKeyword": "Rooney", "keyword": "Intermezzo"}):
                msg(ui, "CREATE_WATCH_ALERT", a)
            lib = msg(ui, "GET_LIBRARY", {}).get("data") or []
            stored = {x["media"]["id"]: x for x in lib}
            by_key = {t["key"]: t for t in TITLES}
            results["ingest"] = saved
            json.dump([t["key"] for t in TITLES], open(os.path.join(args.out, "titles.json"), "w"))
            results["people_log"] = people_log

            def per_title(key, page, **kw):
                results["perTitle"].setdefault(key, {})[page] = kw

            # Library: cards + detail modal
            goto_page(ui, base, "library")
            ready = wait_ready(ui, ".hardcover-spine-card")
            settle_images(ui); cards = ui.evaluate(CARDS_JS, [".hardcover-spine-card", ".media-card-title"])
            by_title = {c["title"]: c for c in cards}
            lib_cards_n = len(cards)
            lib_t = {"movie": [], "tv": [], "book": []}
            for key, sv in saved.items():
                t = by_key[key]
                med = t["medium"]
                if not sv["ok"]:
                    per_title(key, "library", saved=False, note=sv["note"])
                    continue
                rec = stored[sv["mediaId"]]["media"]
                c = by_title.get(rec["canonicalTitle"])
                if not c:
                    per_title(key, "library", saved=True, shown=False)
                    continue
                miss, wrong, imf = check("library-card", rec, c, "card")
                per_title(key, "library", saved=True, shown=True, missing=miss, wrong=wrong, images_failed=imf)
                # detail
                dt0 = time.time()
                idx = cards.index(c)
                ui.locator(".hardcover-spine-card").nth(idx).locator(".hardcover-spine-open").click()
                try:
                    ui.wait_for_selector(".sanctuary-modal-content", timeout=5000)
                    dready = wait_ready(ui, ".sanctuary-modal-content", cap=8)
                    settle_images(ui); dcard = ui.evaluate(CARDS_JS, [".sanctuary-modal-content", ".sanctuary-detail-title"])[0]
                    dmiss, dwrong, dimf = check("library-detail", rec, dcard, "detail")
                    per_title(key, "library-detail", shown=True, missing=dmiss, wrong=dwrong, images_failed=dimf, ready_ms=round((time.time() - dt0) * 1000))
                except Exception as e:  # noqa: BLE001
                    per_title(key, "library-detail", shown=False, note=str(e)[:100])
                ui.keyboard.press("Escape")
                ui.wait_for_timeout(450)
            record("library", "all", cards=lib_cards_n, **page_generic("library", ready))

            # Search: one search per saved title (medium chip + title as query)
            for key, sv in saved.items():
                if not sv["ok"]:
                    per_title(key, "search", saved=False)
                    continue
                t = by_key[key]
                rec = stored[sv["mediaId"]]["media"]
                goto_page(ui, base, "search")
                ui.wait_for_selector("input[type=search]")
                chip = {"movie": "Films", "tv": "Series", "book": "Books"}[t["medium"]]
                ui.get_by_role("button", name=chip, exact=True).click()
                q = rec["canonicalTitle"] if t["medium"] != "book" else t["ingest"].get("query", rec["canonicalTitle"])
                ui.fill("input[type=search]", q)
                t_search = ui.evaluate("performance.now()")
                ui.keyboard.press("Enter")
                ui.wait_for_timeout(100)
                ms = wait_ready(ui, ".sanctuary-media-card, .sanctuary-plaque-index", cap=20,
                                extra="() => !/Searching catalogue/.test(document.body.innerText)")
                settle_images(ui); cards = ui.evaluate(CARDS_JS, [".sanctuary-media-card", ".sanctuary-card-title"])
                c = next((x for x in cards if x["title"] == rec["canonicalTitle"]), None)
                if not c:
                    per_title(key, "search", saved=True, shown=False, results=len(cards), ready_ms=None if ms is None else round(ms - t_search))
                    continue
                miss, wrong, imf = check("search-card", rec, c, "card")
                per_title(key, "search", saved=True, shown=True, missing=miss, wrong=wrong, images_failed=imf, results=len(cards),
                          ready_ms=None if ms is None else round(ms - t_search))

            # Home / Recommendations: whatever title cards are shown
            for page_name, sel, tsel, spec in (("home", ".sanctuary-media-card, .recently-reflected-card", ".sanctuary-card-title, .recently-reflected-title", "home-card"),
                                               ("recommendations", ".recommendation-media-card", ".media-card-title", "recs-card")):
                goto_page(ui, base, page_name)
                ms = wait_ready(ui)
                settle_images(ui); cards = ui.evaluate(CARDS_JS, [sel, tsel])
                title_to_rec = {v["media"]["canonicalTitle"]: v["media"] for v in stored.values()}
                shown = {"movie": 0, "tv": 0, "book": 0}
                for c in cards:
                    rec = title_to_rec.get(c["title"])
                    if not rec:
                        continue
                    shown[rec["type"]] += 1
                    miss, wrong, imf = check(spec, rec, c, "card")
                    key = next((k for k, v in saved.items() if v.get("mediaId") == rec["id"]), rec["id"])
                    per_title(key, page_name, shown=True, missing=miss, wrong=wrong, images_failed=imf)
                hero = ui.evaluate("() => { const e = document.querySelector('.catalogue-plaque-card'); return e ? e.innerText : null }") if page_name == "home" else None
                record(page_name, "all", cards=len(cards), shown_by_medium=shown, hero=hero, **page_generic(page_name, ms))

            # Stats
            goto_page(ui, base, "stats")
            ms = wait_ready(ui, ".stats-stack, .sanctuary-empty-plaque")
            stats_text = ui.inner_text("body")
            meta = ui.evaluate("() => Array.from(document.querySelectorAll('.stats-meta-item')).map(e => e.innerText.replace(/\\n/g,' '))")
            pages_shown = ui.evaluate("() => Array.from(document.querySelectorAll('.stats-book-stat')).map(e => e.innerText.replace(/\\n/g,' '))")
            genres = ui.evaluate("() => Array.from(document.querySelectorAll('.stats-genre-row')).map(e => e.innerText.replace(/\\n/g,' '))")
            watched = [v for v in lib if v["library"]["status"] == "watched"]
            results["stats"] = dict(meta=meta, book_panel=pages_shown, genres=genres, watched=len(watched))
            record("stats", "all", **page_generic("stats", ms))

            # People
            goto_page(ui, base, "people")
            ms = wait_ready(ui, ".people-sanctuary-name, .sanctuary-empty-plaque")
            settle_images(ui); people_cards = ui.evaluate(CARDS_JS, [".people-sanctuary-card-open", ".people-sanctuary-name"])
            record("people", "all", cards=people_cards, **page_generic("people", ms))

            # Alerts
            goto_page(ui, base, "alerts")
            ms = wait_ready(ui)
            record("alerts", "all", text=ui.inner_text("body")[:1500], **page_generic("alerts", ms))

            # New releases, Settings
            for name in ("new-releases", "settings"):
                n0 = len(net.unstubbed)
                goto_page(ui, base, name)
                ms = wait_ready(ui)
                g = page_generic(name, ms)
                g["unstubbed_requests"] = len(net.unstubbed) - n0
                g["text"] = ui.inner_text("body")[:600]
                record(name, "all", **g)

            results["page_errors"] = page_errors
            results["console_errors"] = console_errors[:40]
            results["unstubbed_requests"] = sorted(set(net.unstubbed))
            results["images_failed_requests"] = sorted(set(net.images_failed))
            results["stored_records"] = {v["media"]["id"]: v["media"] for v in lib}
            ctx.close()
    finally:
        shutil.rmtree(profile, ignore_errors=True)
    json.dump(results, open(os.path.join(args.out, "results.json"), "w"), indent=1, ensure_ascii=False)
    print("wrote", os.path.join(args.out, "results.json"))

    PAGE_BUDGETS_MS = {
        "onboarding": 1000,
        "stats": 800,
        "people": 800,
        "alerts": 800,
        "new-releases": 800,
        "settings": 800,
        "home": 1000,
        "recommendations": 800,
        "library": 1000,
        "search": 2000,
    }
    violations = []
    for page_name, max_ms in PAGE_BUDGETS_MS.items():
        if page_name == "search":
            search_times = [
                v["search"]["ready_ms"]
                for v in results["perTitle"].values()
                if "search" in v and v["search"].get("ready_ms") is not None
            ]
            if search_times:
                med = sorted(search_times)[len(search_times) // 2]
                if med > max_ms:
                    violations.append(f"search median {med}ms exceeds budget {max_ms}ms")
        else:
            p_data = results["pages"].get(page_name, {}).get("all", {})
            ready_ms = p_data.get("ready_ms")
            if ready_ms is not None and ready_ms > max_ms:
                violations.append(f"{page_name} {ready_ms}ms exceeds budget {max_ms}ms")

    if violations:
        print("FAIL: Time budget exceeded:\n  " + "\n  ".join(violations), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
