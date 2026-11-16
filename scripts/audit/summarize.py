"""Turns docs/audit/results/results.json into markdown tables (printed to stdout)."""
import json, os, statistics, sys
from collections import Counter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "docs", "audit", "results", "results.json")
r = json.load(open(path))
PREFIX = {"movie": lambda k: k.startswith(("seed_", "synth_")), "tv": lambda k: k.startswith("tv_"), "book": lambda k: k.startswith("book_")}
NAMES = {"movie": "Film", "tv": "Series", "book": "Book"}
rows = []
for page, whole in (("library", True), ("library-detail", True), ("search", True), ("home", False), ("recommendations", False)):
    for med in ("movie", "tv", "book"):
        keys = [k for k in r["perTitle"] if PREFIX[med](k)] if True else []
        if whole:
            keys = [k for k in (json.load(open(os.path.join(os.path.dirname(path), "titles.json")))) if PREFIX[med](k)] if os.path.exists(os.path.join(os.path.dirname(path), "titles.json")) else keys
        n = len(keys)
        shown = ok = 0
        miss, wrong, imf, times = Counter(), Counter(), 0, []
        for k in keys:
            d = r["perTitle"].get(k, {}).get(page)
            if not d or not d.get("shown"):
                continue
            shown += 1
            miss.update(d["missing"]); wrong.update(d["wrong"]); imf += d["images_failed"]
            if not d["missing"] and not d["wrong"]:
                ok += 1
            if d.get("ready_ms"):
                times.append(d["ready_ms"])
        if not whole:
            n = shown
        if n == 0:
            continue
        pt = r["pages"].get(page, {}).get("all", {}).get("ready_ms")
        t = f"{int(statistics.median(times))} ms (median of {len(times)})" if times else (f"{pt} ms" if pt else "not reached")
        rows.append((page, NAMES[med], n, shown, ok, round(100 * ok / n), dict(miss), dict(wrong), imf, t))
print("| Page | Medium | Titles | Shown | All fields OK | Complete | Fields missing | Fields wrong | Images failed | Time until fully shown |")
print("| :-- | :-- | --: | --: | --: | --: | :-- | :-- | --: | :-- |")
for p, m, n, s, o, pc, mi, wr, im, t in rows:
    print(f"| {p} | {m} | {n} | {s} | {o} | {pc}% | {', '.join(f'{k} x{v}' for k, v in mi.items()) or 'none'} | {', '.join(f'{k} x{v}' for k, v in wr.items()) or 'none'} | {im} | {t} |")
print()
print("| Page (no per-title list) | Time until fully shown | Notes |")
print("| :-- | --: | :-- |")
for page in ("onboarding", "stats", "people", "alerts", "new-releases", "settings", "home", "recommendations", "library"):
    d = r["pages"].get(page, {}).get("all", {})
    print(f"| {page} | {d.get('ready_ms')} ms | bad text: {d.get('bad_text') or 'none'}; unstubbed requests on load: {d.get('unstubbed_requests', 'n/a')} |")
