# Linting

Subsume uses a lightweight ESLint baseline aimed at Chrome Web Store production readiness: catch obvious bugs without forcing a full rewrite.

## Commands

| Script | Purpose |
|--------|---------|
| `npm run lint` | ESLint on `src/` with `--max-warnings 0` (fails on any warning) |
| `npm run lint:eslint` | Alias for `npm run lint` |
| `npm run typecheck` | TypeScript (`tsc --noEmit`), separate from ESLint |

`npm run ci` runs typecheck, lint, tests and build, in that order, and the GitHub workflow runs the same steps.

## Configuration

- **Config:** `eslint.config.js` (ESLint flat config)
- **Scope:** `src/**/*.{ts,tsx}`
- **Ignored:** `dist/`, `node_modules/`, `coverage/`, `tests/`, `scripts/`, Vite/Vitest configs
- **Stack:** `eslint`, `typescript-eslint`, `@eslint/js`: recommended JS + TS rules, **not** type-aware (`projectService`) rules

Several rules are configured as `warn` in `eslint.config.js` (`no-explicit-any`, `no-empty-object-type`, `no-unused-vars` with a `^_` ignore pattern, `preserve-caught-error`, `no-useless-assignment`, `prefer-const`). Because the script runs with `--max-warnings 0`, a warning fails the check the same as an error.

## Policy

The backlog was cleared on 2026-10-19 (99 warnings to 0), and lint has been a blocking gate since then. Fix new warnings rather than raising the budget. If a rule is wrong for a specific line, use a targeted `// eslint-disable-next-line <rule> -- reason` comment.

## Safe autofix

```bash
npx eslint src --fix
```

Only apply auto-fixes that are clearly safe (formatting-style / unambiguous). Do not mass-rewrite the codebase solely to clear warnings.
