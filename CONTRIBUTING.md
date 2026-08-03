# Contributing to SheetGrid

Thanks for your interest. This is a small, opinionated project — PRs are welcome for bug fixes, documentation, and features that fit the existing scope.

## Repository shape

- Monorepo managed with **pnpm workspaces** and **Turborepo**.
- Three published packages: `@sheetgrid/core`, `@sheetgrid/react`, `@sheetgrid/tokens`.
- One demo app: `demo/` (Vite, port `5177`).
- Docs live in `docs/` and `README.md`.

## Prerequisites

- **Node** ≥ 20
- **pnpm** ≥ 9
- A modern browser for the demo and Playwright tests

## Setup

```bash
git clone https://github.com/pkdadson/sheetgrid.git
cd sheetgrid
pnpm install
pnpm build       # builds all packages once (tests import from dist)
pnpm test        # unit tests (Vitest)
pnpm dev:demo    # http://localhost:5177
pnpm test:e2e    # Playwright against the demo
```

The demo is the fastest way to iterate — most features can be exercised on the Objects / 2D Matrix / 10k Perf tabs.

## Branches & PRs

- Base branch: `main` (protected — publish is gated on green CI; see [docs/publishing.md](docs/publishing.md)).
- Branch names: `fix/…`, `feat/…`, `docs/…`, `chore/…`.
- Keep PRs focused: one behavior change per PR. Refactors that touch many files should land separately.
- Every PR must:
  - Include a test that fails without the change (bug fixes) or covers the new surface (features).
  - Update `docs/` when public behavior changes.
  - Pass `pnpm build`, `pnpm test`, and lint.

## Commit style

Loosely follows [Conventional Commits](https://www.conventionalcommits.org/):

```
fix(react): Escape cancel no longer commits draft (v0.1.2)
feat(core): add SUMIFS
docs: expand theming CSS variable table
ci: gate publishes on green CI
```

The scope is usually the package name (`core`, `react`, `tokens`), `ci`, or `docs`.

## Testing

- **Unit** — Vitest, per package under `packages/*/src/**/*.test.ts(x)`.
- **E2E** — Playwright, `demo/` app. Run `pnpm test:e2e`.
- **Coverage bar** — no hard threshold, but core algorithm changes (formulas, sort, virtualization windowing) should include table-driven tests.
- **Snapshots** — avoid where possible; prefer explicit assertions.

## Public API changes

- Anything exported from `@sheetgrid/react` or `@sheetgrid/core` is public — treat it as SemVer.
- Breaking changes require a **major** bump (post-1.0) or a `BREAKING CHANGE:` footer plus an entry in [CHANGELOG.md](CHANGELOG.md).
- Update [docs/api.md](docs/api.md) and [docs/types.md](docs/types.md) in the same PR.

## Docs

Doc-only PRs are welcome. Match the tone of existing recipes: task-focused, minimal prose, code you can paste. Prefer editing an existing doc over adding a new one.

## Release cadence

- Patch bumps ship whenever a small fix is ready and CI is green.
- Minor bumps are cut when 2–3 related features land.
- No fixed cadence; there is no release calendar.

Releases are cut from `main` via the `release/*` workflow. See [docs/publishing.md](docs/publishing.md) for the mechanics.

## Reporting bugs

Open an issue with:

1. SheetGrid version (`@sheetgrid/react` and peers).
2. Minimal reproduction — CodeSandbox or a `demo/` diff.
3. Expected vs. observed behavior.
4. Browser + OS.

Small issues with a repro get fixed quickly. Issues without one get triaged slowly.

## Code of conduct

Be kind. Assume good faith. Disagree on technical merits, not people.
