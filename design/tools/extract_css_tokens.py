"""Reference extractor for CSS-variable design systems (pilot for Narada workstream 3d).

Usage: python3 -I extract_css_tokens.py <repo> <tokens.css relative path> [<css glob root>]
Writes <repo>/design/tokens.json and <repo>/design/motion.json (sorted, deterministic).
"""

import json
import re
import sys
from pathlib import Path

repo = Path(sys.argv[1]).resolve()
token_file = repo / sys.argv[2]
css_root = repo / (sys.argv[3] if len(sys.argv) > 3 else "src")


def blocks(text: str):
    """Yield (context selectors list, body, start line) for every rule containing declarations."""
    stack: list[tuple[str, int]] = []
    buf_start = 0
    i = 0
    line = 1
    sel_start = 0
    while i < len(text):
        ch = text[i]
        if ch == "\n":
            line += 1
        if text.startswith("/*", i):
            j = text.find("*/", i + 2)
            line += text.count("\n", i, j)
            i = j + 2
            sel_start = i
            continue
        if ch == "{":
            selector = text[sel_start:i].strip().split(";")[-1].strip()
            stack.append((selector, line))
            buf_start = i + 1
            sel_start = i + 1
        elif ch == "}":
            if stack:
                selector, start_line = stack.pop()
                body = text[buf_start:i]
                yield [s for s, _ in stack] + [selector], body, start_line, buf_start
            sel_start = i + 1
            buf_start = i + 1
        elif ch == ";":
            sel_start = i + 1
        i += 1


def context_name(ctx: list[str]) -> str:
    return " ".join(" ".join(c.split()) for c in ctx)


text = token_file.read_text(encoding="utf-8")
decl = re.compile(r"(--[A-Za-z0-9_-]+)\s*:\s*([^;]+);")
tokens: dict[str, dict] = {}
for ctx, body, _start, offset in blocks(text):
    if any(c.startswith("@keyframes") for c in ctx):
        continue
    mode = context_name(ctx)
    for m in decl.finditer(body):
        name, value = m.group(1), " ".join(m.group(2).split())
        abs_pos = offset + m.start()
        line_no = text.count("\n", 0, abs_pos) + 1
        entry = tokens.setdefault(name, {"modes": {}})
        entry["modes"][mode] = {"value": value, "source": f"{token_file.relative_to(repo)}:{line_no}"}


def kind(name: str, value: str) -> str:
    n = name.lower()
    for key, typ in (("color", "color"), ("bg", "color"), ("ink", "color"), ("font-size", "dimension"),
                     ("font", "fontFamily"), ("space", "dimension"), ("gap", "dimension"), ("radius", "dimension"),
                     ("shadow", "shadow"), ("duration", "duration"), ("ease", "cubicBezier"), ("z-", "number")):
        if key in n:
            return typ
    if re.match(r"^(#|rgb|hsl|oklch|color-mix)", value):
        return "color"
    if re.match(r"^-?[\d.]+(px|rem|em)$", value):
        return "dimension"
    if re.match(r"^[\d.]+m?s$", value):
        return "duration"
    return "other"


out_tokens = {}
for name in sorted(tokens):
    modes = tokens[name]["modes"]
    base = modes.get(":root") or next(iter(modes.values()))
    out_tokens[name] = {
        "$type": kind(name, base["value"]),
        "$value": base["value"],
        "source": base["source"],
        "$extensions": {"modes": {k: modes[k]["value"] for k in sorted(modes) if k != ":root"}},
    }

# Motion: every @keyframes and every reduced-motion block under the CSS root.
keyframes = {}
reduced = []
sources = [p for ext in ("*.css", "*.ts", "*.tsx", "*.js", "*.jsx", "*.svelte") for p in css_root.rglob(ext)]
for css in sorted(sources):  # CSS-in-JS strings (e.g. shadow-DOM styles) define keyframes too
    if "node_modules" in css.parts or css.name.endswith((".test.ts", ".test.tsx", ".d.ts")):
        continue
    src = css.read_text(encoding="utf-8", errors="replace")
    for m in re.finditer(r"@keyframes\s+([A-Za-z0-9_-]+)\s*\{", src):
        depth, j = 1, m.end()
        while depth and j < len(src):
            depth += {"{": 1, "}": -1}.get(src[j], 0)
            j += 1
        steps = {}
        for sm in re.finditer(r"([0-9.%,\s]+|from|to)\s*\{([^}]*)\}", src[m.end():j - 1]):
            steps[" ".join(sm.group(1).split())] = " ".join(sm.group(2).split())
        rel = f"{css.relative_to(repo)}:{src.count(chr(10), 0, m.start()) + 1}"
        keyframes.setdefault(m.group(1), []).append({"source": rel, "steps": steps})
    for m in re.finditer(r"prefers-reduced-motion", src):
        reduced.append(f"{css.relative_to(repo)}:{src.count(chr(10), 0, m.start()) + 1}")

motion_tokens = {k: v for k, v in out_tokens.items() if v["$type"] in ("duration", "cubicBezier")}
design = repo / "design"
design.mkdir(exist_ok=True)
(design / "tokens.json").write_text(json.dumps({
    "$schema": "https://www.designtokens.org/TR/drafts/format/",
    "$description": f"Extracted from {token_file.relative_to(repo)} by the 3d pilot extractor. Do not edit by hand; edit the source and re-extract.",
    "tokens": out_tokens,
}, indent=2, sort_keys=True, ensure_ascii=False) + "\n", encoding="utf-8")
(design / "motion.json").write_text(json.dumps({
    "$description": "Motion tokens, every @keyframes (with steps and source) and reduced-motion handling.",
    "motion_tokens": motion_tokens,
    "keyframes": {k: keyframes[k] for k in sorted(keyframes)},
    "reduced_motion_sources": sorted(set(reduced)),
}, indent=2, sort_keys=True, ensure_ascii=False) + "\n", encoding="utf-8")

types = {}
for v in out_tokens.values():
    types[v["$type"]] = types.get(v["$type"], 0) + 1
modes = sorted({m for v in tokens.values() for m in v["modes"]})
print(json.dumps({"tokens": len(out_tokens), "by_type": types, "modes": len(modes),
                  "keyframes": len(keyframes), "reduced_motion_blocks": len(set(reduced))}, indent=1))
