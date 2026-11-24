# Subsume design system (machine-readable)

Pilot for Narada workstream 3d, made 2026-11-24 by the coordinator. These files are generated from code. Do not
edit them by hand: change the source, then re-extract.

- `tokens.json`: every CSS custom property in `src/shared/tokens.css` (249) in W3C design-token format. Each one
  has a type, its `:root` value, every theme and atmosphere override under `$extensions.modes` (14 contexts), and
  `source: "file:line"`.
- `motion.json`: the duration and easing tokens, every `@keyframes` in `src/` (including CSS strings in
  `.tsx`), with steps and source, and every `prefers-reduced-motion` block.
- `tools/extract_css_tokens.py`: the reference extractor. Narada's `narada design extract` must reproduce these
  files exactly (golden test).

Regenerate:

    python3 -I design/tools/extract_css_tokens.py . src/shared/tokens.css src

Next, once OpenPencil is installed: `design/subsume.fig`, with Tokens, Motion, States and Screens pages.
