# KNX Topology Decisions

## DR-2026-07-25-01 — Structural wiring and manual Device placement

- Add Area and Add Line create their required structural topology.
- Add Device is manual, creates no connector and starts `PlacedUnconnected`.
- Connect Bus is explicit and is a separate Undo command.

## DR-2026-07-25-02 — Project reflow and Manual nodes

Project reflow may move an Area as one block to avoid overlap. It must not change
relative child coordinates, parent topology, address or manual layout mode.

## DR-2026-07-25-03 — Connection state is a projection

Connection state is derived from valid edge metadata and topology identity.
Deleting or rejecting an edge does not delete or re-parent a Device.

## DR-2026-07-25-04 — No automatic viewport adjustment

Standard topology commands do not Fit, Center or change zoom.

## DR-2026-08-03-01 — Incremental frontend structure

- Keep the existing draw.io global-script architecture.
- Introduce shared core constants and object schema before splitting large modules.
- Do not move the four established KNX modules without a concrete feature and
  regression coverage requiring the extraction.
- Development and production load order are part of runtime behaviour.

## DR-2026-08-03-02 — Unified equipment presentation

Device, Line Coupler and Area Coupler use one minimum card size and the same
persistent equipment field schema: Name, IA, Manufacturer, Order Number,
Application Name and Room. Legacy card normalization changes presentation only.

## DR-2026-08-03-03 — Equipment-first, address-derived topology

This decision supersedes the active creation flow in DR-2026-07-25-01 without
deleting its legacy structural data support.

- The active toolbar creates Device, LC, BC, Line Repeater and KNX Power Supply
  equipment only.
- New equipment placement creates no Area, Line, bus, region or connector.
- Project Tree Area/Line groups are derived from persistent Individual Address.
- Old structural objects remain loadable and keep their stored IDs and relations.
- Equipment-first validation checks invalid and duplicate IA; legacy structural
  diagrams keep the earlier connection validation path.

## DR-2026-08-03-04 — Compact equipment-card hierarchy

- Use one exact `180 × 100` Canvas size for Device, LC, BC, Line Repeater and
  KNX Power Supply; Power Supply uses the red type-identification strip.
- Normalize legacy equipment geometry and card style without moving its origin or
  changing identity, IA, metadata or wiring.
- Prioritize Name (`15px`) and IA (`14px`); secondary product metadata uses `10px`.
- Preserve all required metadata on-card, with ellipsis and the full-card tooltip
  when the available width is insufficient.

## DR-2026-08-03-05 — Stable manual Wiring Mode

- `W` starts from hovered equipment first and selected equipment second.
- Preview and committed manual edges use one green KNX style.
- Source and target terminal constraints are fixed from the chosen pointer
  positions; manual waypoints are not recalculated on commit.
- Connection-handler reset and cleanup must never delete source equipment.

## DR-2026-08-03-06 — Source-independent Wiring Mode

This decision supersedes the interaction model in DR-2026-08-03-05 while
retaining its green style and stable endpoint requirements.

- `W` arms Wiring Mode without reading or changing the selected cell.
- The first endpoint and later anchors may be placed in empty Canvas space.
- Equipment hit-testing only adds an optional fixed perimeter constraint.
- The tool owns its preview and commits explicit orthogonal waypoints directly;
  it does not start or reset draw.io's source-based connection handler.
- Canvas capture listeners own pointer gestures before draw.io selection and
  HTML card handlers; equipment endpoints are resolved from rendered bounds.
- `W` is owned at the Window capture phase for the visible KNX graph. Mode entry
  never resets `mxConnectionHandler` and temporarily rejects cell removal.
- Right-click or Escape completes an active wire and leaves the tool armed;
  the live cursor is persisted as its endpoint even without another left click.
  Repeating the command while idle exits; the Canvas context menu remains
  suppressed while armed. Backspace removes an anchor and Space changes the
  next elbow direction.

## DR-2026-08-03-07 — Power Supply Line address

- KNX Power Supply has no individual Device address. Its canonical persistent
  address is `Area.Line.` (for example `1.1.`).
- The Project Tree and status projection use the PS address to derive its Area
  and Line exactly as they do for regular equipment IA.
- Legacy PS values in `Area.Line.Device` form are normalized to `Area.Line.` on
  project load; other equipment addresses are unchanged.
- Duplicate IA validation excludes Power Supply because multiple supplies may
  belong to the same Line.

## DR-2026-08-03-08 — Thin Electron portable shell

- Desktop packaging reuses the production webapp without moving or duplicating
  KNX source code.
- A loopback-only ephemeral HTTP server preserves the browser runtime contract;
  Electron does not expose Node.js to the renderer.
- The reusable batch workflow runs regression tests and the Ant production build
  before packaging a Windows x64 portable ZIP. Users extract it once so every
  launch avoids the single-file NSIS temporary extraction delay.
- Public release signing remains disabled until a valid Authenticode signing
  identity is configured; an unsigned build must be reported explicitly.
