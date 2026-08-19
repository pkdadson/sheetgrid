---
"@sheetgrid/vue": patch
"@sheetgrid/nuxt": patch
"@sheetgrid/agent": patch
---

Repo-wide lint cleanup: biome formatting pass, typed the agent loop's tool
result (`OpResult<unknown>` instead of implicit any), and small
behavior-neutral fixes. Lint is now a blocking CI step.

(Carried over from the consumed `lint-cleanup` changeset: these three
packages were deliberately excluded from that release because `changeset
version` would graduate their `0.1.0-alpha.x` versions to a stable `0.1.0`,
which the publish script relies on NOT happening while they are
prerelease-only. Resolve the graduation question before consuming this.)
