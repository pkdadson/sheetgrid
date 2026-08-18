---
"@sheetgrid/core": patch
"@sheetgrid/react": patch
"@sheetgrid/vue": patch
"@sheetgrid/nuxt": patch
"@sheetgrid/agent": patch
---

Repo-wide lint cleanup: biome formatting pass, typed the agent loop's tool
result (`OpResult<unknown>` instead of implicit any), and small
behavior-neutral fixes. Lint is now a blocking CI step.
