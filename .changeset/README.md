# Changesets

Release flow for @sheetgrid/* packages.

1. With every PR that changes a published package, run `pnpm changeset` and
   commit the generated file. Pick the bump (patch/minor) and write the
   changelog entry there; it lands in that package's `CHANGELOG.md` at release.
2. To cut a release: `pnpm changeset:version` on a branch. This bumps
   versions, writes per-package changelogs, and consumes the changeset files.
   Review, merge, then publish.
3. Publishing stays with the existing gated script: `pnpm publish:npm`
   locally, or the "Release" GitHub Actions workflow (which publishes with
   npm provenance). Alpha packages (`agent`, `vue`, `nuxt`) keep the `next`
   dist-tag via `scripts/publish-npm.mjs`.

Every published version gets a git tag and a versioned changelog entry; no
more version jumps without a paper trail.
