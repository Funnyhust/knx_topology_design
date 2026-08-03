# KNX Test and Regression Matrix

## Source checks

- Run `node --check` for every changed JavaScript source.
- Run all three KNX contract suites documented in `CODEX.md`.
- Verify every new runtime script exists in development and production load order.

## Business regression

- Toolbar contains no Add Area or Add Line entry point.
- Add Device exposes Device, LC, BC, Line Repeater and red KNX Power Supply.
- Add Device remains manual, works without a selected Line and creates no
  structural cell or connector.
- Valid IA derives the expected Area/Line group; invalid IA remains visible.
- Power Supply is created with `1.1.`, accepts `Area.Line.` only and appears under
  that derived Line. A legacy PS `Area.Line.Device` is normalized on project load.
- Duplicate IA is reported for individually addressed equipment; Power Supplies
  on the same Line are not treated as duplicate IA.
- Wiring remains a separate Undo step.
- Old projects retain stable IDs and persistent XML fields.
- Old structural objects remain loadable without automatic deletion.

## UI regression

- Tree, Canvas and Properties selection remain synchronized.
- Name, IA/Power Supply Line address, Manufacturer, Order Number, Application Name
  and Room redraw live.
- Device, LC, BC, Line Repeater and KNX Power Supply use the shared card dimensions.
- Existing cards normalize to `180 × 100`; Name and IA remain readable at 1:1.
- Toolbar, sidebar, Properties panel and status bar retain their bounds.
- Zoom and scroll position do not change during normal topology commands.
- `W` arms Wiring Mode without requiring or changing hover/selection.
- The Wiring Mode toolbar action turns blue with `aria-pressed=true` when armed
  by either `W` or click, and returns to default when the mode exits.
- Pressing `W` immediately after placing selected equipment preserves both the
  equipment count and selection, and never resets `mxConnectionHandler`.
- First and last wire points may be placed in empty Canvas space.
- Equipment endpoint hit-testing works over both SVG and HTML card content.
- Wiring preview and committed edges remain green and keep identical endpoints.
- Completing or cancelling Wiring Mode never changes the equipment count.
- Right-click/Escape commits the live cursor endpoint and does not open a menu.
- Right-button detection covers browser `popupTrigger`, `button` and `which`.
- Backspace removes the last anchor; Space changes the next orthogonal elbow.
- Manual waypoints survive connection commit, Undo/Redo and save/reload.

## Production verification

- Run the existing Ant `app` target from `etc/build` so relative generator paths
  resolve correctly, and require zero compiler errors.
- Load the production workspace in a browser with no JavaScript page errors.
- Confirm `app.min.js` contains new runtime symbols or behaviour contracts.
- Update bootstrap asset version and service-worker revisions when the bundle changes.
- Verify the versioned asset is served from network instead of stale precache.

## Windows portable verification

- `build-portable.bat` must stop when a KNX regression suite, Ant or packaging fails.
- Only one portable build may own the shared Ant temporary directory at a time.
- Extract the portable ZIP, run `KNX Topology.exe --smoke-test` and require exit code `0`.
- Record artifact size, SHA-256 and Authenticode status for each release candidate.
