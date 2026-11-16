"""Shared real-browser harness for scripts/smoke_extension.py and scripts/audit_pages.py.

Loads dist/ as an unpacked extension into a fresh temporary Chromium profile.
Branded Google Chrome ignores --load-extension, so this uses Playwright's bundled
Chromium / Chrome for Testing, or the build named by CHROME_PATH.
"""
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DIST = os.path.join(ROOT, "dist")


def launch_extension_context(p, profile: str, viewport=None):
    """Launch a persistent context with the built extension; returns (ctx, service_worker, ext_id)."""
    launch = dict(
        headless=True,
        viewport=viewport or {"width": 1280, "height": 900},
        args=[f"--disable-extensions-except={DIST}", f"--load-extension={DIST}", "--headless=new"],
    )
    if os.environ.get("CHROME_PATH"):
        launch["executable_path"] = os.environ["CHROME_PATH"]
    ctx = p.chromium.launch_persistent_context(profile, **launch)
    return ctx


def wait_service_worker(ctx):
    sw = ctx.service_workers[0] if ctx.service_workers else ctx.wait_for_event("serviceworker", timeout=10000)
    ext = sw.url.split("/")[2]
    return sw, ext
