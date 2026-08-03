# Publishing policy

SheetGrid must not ship a release from a broken `main`.

## Rules

1. **`main` tip must be green** before tagging or publishing.
2. **GitHub Packages** publishes only after the release workflow’s **quality** job (build + unit + e2e) succeeds.
3. **npm** publishes go through `pnpm publish:npm`, which:
   - refuses a dirty working tree
   - calls `scripts/assert-ci-green.mjs` (green Actions CI for `HEAD`)
   - rebuilds and re-runs unit tests
   - then `pnpm publish` per package

## Commands

```bash
# Confirm this commit is green on GitHub Actions
pnpm ci:assert-green

# Dry-run publish (also requires green CI)
pnpm publish:check

# Real npm publish (OTP if your account requires it)
NPM_OTP=123456 pnpm publish:npm
# or only react:
node scripts/publish-npm.mjs --filter @sheetgrid/react
```

## GitHub release flow

1. Ensure `main` is green on [CI](https://github.com/pkdadson/sheetgrid/actions/workflows/ci.yml).
2. Bump package versions + CHANGELOG, commit, push.
3. Tag and release:

   ```bash
   git tag -a vX.Y.Z -m "vX.Y.Z"
   git push origin vX.Y.Z
   gh release create vX.Y.Z --generate-notes
   ```

4. The **Publish GitHub Packages** workflow runs **quality → publish**. If quality fails, packages are not published.
5. Publish npm with `pnpm publish:npm` (still gated on green CI for that commit).

## Branch protection

Repository ruleset **main-must-be-green** on `main`:

- Requires status check **`build-and-test`** (strict / up to date)
- Blocks branch deletion and force-push
- Repository **admin** can bypass (needed so solo maintainers can push new commits before CI has run); **publish is still gated** by `assert-ci-green` / the quality job

For external contributors, open a PR — checks must pass before merge (no admin bypass for non-admins).
