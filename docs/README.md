# Docs index

Start here, then go to the code. Everything not listed under **Current** is a dated record: useful for history, but not guaranteed to match the code today.

## Current

| Doc | What it covers |
| :--- | :--- |
| [`plans/2026-10-19-path-to-10.md`](./plans/2026-10-19-path-to-10.md) | Latest rating, gaps, and what still needs the owner |
| [`PRODUCT_INTENT.md`](./PRODUCT_INTENT.md) | Who it is for, free core vs. later paid backup |
| [`PRIVACY.md`](./PRIVACY.md) / [`privacy.html`](./privacy.html) | Privacy policy (host one of these for the store listing) |
| [`GOOGLE_DRIVE_SETUP.md`](./GOOGLE_DRIVE_SETUP.md) | Drive OAuth client and redirect URI setup |
| [`RELEASE_VERIFICATION.md`](./RELEASE_VERIFICATION.md) | Release checks and manifest hygiene notes |
| [`LINTING.md`](./LINTING.md) | ESLint gate (`npm run lint`, zero warnings) |
| [`EXPORT_MOAT.md`](./EXPORT_MOAT.md) | Export completeness and what makes the data hard to rebuild |
| [`CINEMA_VOICE.md`](./CINEMA_VOICE.md) | Copy and voice rules |
| [`detection-accuracy-report.md`](./detection-accuracy-report.md) | Offline detection harness results |
| [`SEED_CATALOGUE.md`](./SEED_CATALOGUE.md) | Bundled seed catalogue |
| [`../store/`](../store/) | Chrome Web Store listing, permissions, checklist, assets |

Design authority for UI work: [`../CINEMATIC_JOURNAL_DESIGN_SPEC.md`](../CINEMATIC_JOURNAL_DESIGN_SPEC.md) and `src/shared/tokens.css`.

## Historical records

- `design-reviews/<date>/`: dated skill-driven reviews (design, accessibility, security, roasts). Most findings in the 2026-09-23 report have since been fixed.
- `superpowers/plans/`, `superpowers/specs/`: earlier implementation plans. `2026-09-22-path-to-10.md` is superseded by `plans/2026-10-19-path-to-10.md`.
- One-off reports and agent briefs: `Subsume-design-review-FULL-REPORT-2026-08-10.md`, `Subsume-task-list-plan.md`, `SUBSUME_AGENT_HANDOFF.md`, `DESIGN_AGENT_BRIEF.md`, `SEED_DATA_AGENT.md`, `IMPECCABLE_WRAP.md`, `design-taste-findings-2026-07-21.md`, `design_motion_audit_report- subsume.md`, `motion_design_interactive_demos-subsume.html`, `SUBSUME_CURRENT_INFORMATION_ARCHITECTURE.md`.

## Likely duplicates (owner to decide whether to delete)

The books-expansion instructions exist in four copies: `SUBSUME_BOOKS_EXPANSION_INSTRUCTIONS.md`, `SUBSUME_BOOKS_EXPANSION_INSTRUCTIONS (2).md`, `chatrgpt -SUBSUME_BOOKS_EXPANSION_INSTRUCTIONS.md`, and the combined `SUBSUME_BOOKS_EXPANSION_FULL_PACKAGE.md`. The books expansion shipped (`superpowers/plans/2026-07-28-books-expansion-100-complete.md`).
