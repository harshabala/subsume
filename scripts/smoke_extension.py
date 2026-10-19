"""Real-browser smoke test for the built extension.

Loads dist/ into a fresh, temporary Chromium profile with all network stubbed
offline (detection fixtures are served for their real URLs), then checks the
zero-key core loop end to end:

  1. onboarding -> practice title -> first saved reflection, under 90 s
  2. every extension page renders without uncaught page errors
  3. Reflect from a web page twice reuses the open journal tab
  4. no broken-image glyphs in the popup when posters cannot load
  5. the service worker logs no console errors on the zero-key path

Usage:
  npm run build && python3 scripts/smoke_extension.py [--out DIR]

Needs the Python `playwright` package. Branded Google Chrome ignores
--load-extension, so it uses Playwright's bundled Chromium or Chrome for
Testing; set CHROME_PATH to point at another Chromium build.
Exit code 0 means every check passed.
"""
import argparse
import json
import os
import shutil
import sys
import tempfile
import time

from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DIST = os.path.join(ROOT, "dist")
FIXTURES = os.path.join(ROOT, "tests", "fixtures", "detection")
PAGES = ["home", "library", "search", "recommendations", "new-releases", "people", "stats", "settings", "alerts"]
FIRST_SAVE_BUDGET_S = 90


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", help="directory for screenshots and result.json")
    args = parser.parse_args()

    if not os.path.exists(os.path.join(DIST, "manifest.json")):
        print("dist/ not built; run `npm run build` first", file=sys.stderr)
        return 2

    out = args.out
    if out:
        os.makedirs(out, exist_ok=True)

    manifest = json.load(open(os.path.join(FIXTURES, "manifest.json")))
    fixtures = {f["url"]: f for f in manifest["fixtures"]}

    page_errors: list[str] = []
    sw_errors: list[str] = []
    checks: dict[str, object] = {}

    def snap(page, name: str) -> None:
        if out:
            page.screenshot(path=os.path.join(out, f"{name}.png"))

    def watch(page, label: str):
        page.on("pageerror", lambda e: page_errors.append(f"{label}: {e}"))
        return page

    def route(r):
        url = r.request.url
        if url in fixtures:
            path = os.path.join(FIXTURES, "html", fixtures[url]["htmlFile"])
            return r.fulfill(status=200, content_type="text/html", body=open(path).read())
        if url.startswith(("chrome-extension://", "data:")):
            return r.continue_()
        return r.fulfill(status=503, body="offline")

    profile = tempfile.mkdtemp(prefix="subsume-smoke-")
    t0 = time.time()
    try:
        with sync_playwright() as p:
            launch = dict(
                headless=True,
                viewport={"width": 1280, "height": 900},
                args=[f"--disable-extensions-except={DIST}", f"--load-extension={DIST}", "--headless=new"],
            )
            if os.environ.get("CHROME_PATH"):
                launch["executable_path"] = os.environ["CHROME_PATH"]
            ctx = p.chromium.launch_persistent_context(profile, **launch)
            ctx.route("**/*", route)

            sw = ctx.service_workers[0] if ctx.service_workers else ctx.wait_for_event("serviceworker", timeout=10000)
            sw.on("console", lambda m: sw_errors.append(m.text) if m.type == "error" else None)
            ext = sw.url.split("/")[2]
            base = f"chrome-extension://{ext}/ui"

            # 1. Onboarding -> first saved reflection
            ui = watch(ctx.new_page(), "ui")
            ui.goto(f"{base}/index.html")
            ui.get_by_role("button", name="Begin").click()
            ui.get_by_role("button", name="Enter without keys").click()
            ui.locator('[data-testid="practice-title-cta"]').first.click()
            ui.wait_for_selector(".poetic-textarea", timeout=10000)
            ui.fill(".poetic-textarea", "The quiet ending stayed with me for days.")
            snap(ui, "capture")
            ui.click('[data-testid="save-btn"]')
            ui.wait_for_selector(".poetic-sanctuary-modal", state="detached", timeout=10000)
            first_save_s = round(time.time() - t0, 2)
            checks["first_save_seconds"] = first_save_s
            checks["first_save_within_budget"] = first_save_s <= FIRST_SAVE_BUDGET_S

            # 2. Every page renders
            rendered = {}
            for name in PAGES:
                ui.goto(f"{base}/index.html?page={name}")
                ui.wait_for_timeout(700)
                rendered[name] = len(ui.inner_text("main, body").strip()) > 0
                snap(ui, f"page-{name}")
            checks["pages_rendered"] = all(rendered.values())
            checks["pages"] = rendered

            # 3. Reflect twice from a web page reuses the open journal tab
            web = watch(ctx.new_page(), "web")
            web.goto("https://www.imdb.com/title/tt1375666/")
            before = len(ctx.pages)
            for media_id in ("tmdb_movie_27205", "tmdb_movie_550"):
                ui.evaluate(
                    "(id) => new Promise(r => chrome.runtime.sendMessage({type: 'OPEN_CAPTURE_CANVAS', payload: {mediaId: id}}, r))",
                    media_id,
                )
                ui.wait_for_timeout(800)
            checks["reflect_new_tabs"] = len(ctx.pages) - before
            checks["reflect_reuses_tab"] = len(ctx.pages) == before

            # 4. Popup shows no broken-image glyphs offline
            popup = watch(ctx.new_page(), "popup")
            popup.set_viewport_size({"width": 400, "height": 600})
            popup.goto(f"{base}/popup.html")
            popup.wait_for_timeout(1200)
            snap(popup, "popup")
            broken = popup.evaluate("() => Array.from(document.images).filter(i => i.complete && i.naturalWidth === 0).length")
            checks["popup_broken_images"] = broken
            checks["popup_no_broken_images"] = broken == 0

            ctx.close()
    finally:
        shutil.rmtree(profile, ignore_errors=True)

    checks["page_errors"] = page_errors
    checks["service_worker_errors"] = sw_errors
    passed = (
        checks["first_save_within_budget"]
        and checks["pages_rendered"]
        and checks["reflect_reuses_tab"]
        and checks["popup_no_broken_images"]
        and not page_errors
        and not sw_errors
    )
    checks["passed"] = bool(passed)
    if out:
        json.dump(checks, open(os.path.join(out, "result.json"), "w"), indent=2)
    print(json.dumps(checks, indent=2))
    print("SMOKE PASSED" if passed else "SMOKE FAILED")
    return 0 if passed else 1


if __name__ == "__main__":
    sys.exit(main())
