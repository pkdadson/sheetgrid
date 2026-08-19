# @sheetgrid/react

## 0.5.0

### Minor Changes

- db8917a: Move the agent-dependent API (`useGridController`, `useAgent`, `<AgentChat>`)
  to a dedicated `@sheetgrid/react/agent` subpath entry. The main entry no
  longer imports the optional `@sheetgrid/agent` peer, so consumers that only
  render `<Grid>` can omit the peer entirely; previously the bundle statically
  imported it and broke any build without the peer installed (or an alias
  workaround).
  
  Migration: change `import { useAgent, AgentChat, useGridController } from
  "@sheetgrid/react"` to import from `"@sheetgrid/react/agent"`.

### Patch Changes

- 1bd1d10: Repo-wide lint cleanup: biome formatting pass, typed the agent loop's tool
  result (`OpResult<unknown>` instead of implicit any), and small
  behavior-neutral fixes. Lint is now a blocking CI step.
- Updated dependencies [1bd1d10]
  - @sheetgrid/core@0.3.1
