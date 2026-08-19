---
"@sheetgrid/react": minor
---

Move the agent-dependent API (`useGridController`, `useAgent`, `<AgentChat>`)
to a dedicated `@sheetgrid/react/agent` subpath entry. The main entry no
longer imports the optional `@sheetgrid/agent` peer, so consumers that only
render `<Grid>` can omit the peer entirely; previously the bundle statically
imported it and broke any build without the peer installed (or an alias
workaround).

Migration: change `import { useAgent, AgentChat, useGridController } from
"@sheetgrid/react"` to import from `"@sheetgrid/react/agent"`.
