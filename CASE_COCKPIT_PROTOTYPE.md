# Case Cockpit v7 prototype

Status: **prototype branch only — not deployed to production**.

This branch consolidates the existing current-book safety surfaces into one immersive screen inside **Postacie → Akta sprawy**.

## What it composes

- current safe checkpoint and health
- Case Pulse / checkpoint delta
- priority character portraits from Re-entry Pack
- Reader Confusion Memory / `Nie pomyl`
- Time Machine checkpoints
- Story Map built from `Book Locations`
- Detective Notebook theories
- Re-entry Pack

The detailed tabs remain the drill-down layer. The new Cockpit is an orientation layer, not a replacement for the underlying ledgers.

## Guardrails

- No current-book text is stored or rendered.
- All content inherits the active progress gate.
- Theory remains theory; no guilt or outcome inference.
- Reader confusion changes recall UX only.
- The Story Map is deliberately a **schematic story-space**, not a geographic map. It does not invent coordinates, distances, or routes.
- Portrait binaries stay on Google Drive and are delivered through the existing backend. GitHub remains code-only.

## Location visuals

The prototype currently uses a schematic Story Map because the project has no grounded `Location Assets` delivery pipeline yet.

Future location imagery should mirror the character asset architecture:

`Google Drive → Location Assets / Case Assets registry → Apps Script API → frontend`

Every location image needs provenance, rights state, progress gate, version and hash. Fictional or ambiguous places must never receive fake real-world coordinates.

## Production gate

Do not merge/deploy solely because the prototype renders. Production promotion requires:

1. owner visual review,
2. responsive smoke test,
3. current-book spoiler regression check,
4. no regression to existing Character Atlas tabs,
5. System Health remains green.
