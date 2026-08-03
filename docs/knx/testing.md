# KNX Test and Regression Matrix

## Source checks

- Run `node --check` for every changed JavaScript source.
- Run all three KNX contract suites documented in `CODEX.md`.
- Verify every new runtime script exists in development and production load order.

## Business regression

- Toolbar contains no Add Area or Add Line entry point.
- Add Device exposes Device, LC, BC, Line Repeater and red KNX Power Supply.
- Power Supply, LC and BC quick-add actions enter the matching manual placement
  preview directly, without changing the Add Device selector first.
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

- Browser title/favicon use Lumi branding, and the workspace header loads visible
  Lumi and KNX Member images without changing toolbar or sidebar bounds.
- Tree, Canvas and Properties selection remain synchronized.
- Name, IA/Power Supply Line address, Manufacturer, Order Number, Application Name
  and Room redraw live.
- Device, LC, BC, Line Repeater and KNX Power Supply use the shared card dimensions.
- Existing cards normalize to `180 × 100`; Name and IA remain readable at 1:1.
- Toolbar, sidebar, Properties panel and status bar retain their bounds.
- Zoom and scroll position do not change during normal topology commands.
- File menu exposes New Project, Open Project, Import Drawing, Save Project,
  Export PNG and Export PDF. New/Open warn before discarding modified work;
  invalid XML does not replace the current project.
- Open Project replaces both the drawing and its Project Info. Import Drawing adds
  cells at a free insertion point, selects the imported cells and preserves every
  current Project Info value.
- Download offers editable `.lukatp`, PNG and PDF without opening Drive or another cloud
  authorization dialog. LUKA Topology remains editable; PNG and PDF render the
  whole graph inside a technical border with a bottom-right title block.
- The actual browser download filename ends in one `.lukatp` and never in
  `.lukatp.drawio`, `.lukatp.xml` or a duplicated project extension.
- Save Project clears the modified flag only after creating the local snapshot;
  edits made after that save restore the unsaved-change warning.
- Project Info survives `.lukatp` save/reload, while equipment count is derived
  from the current equipment set. The PDF print document uses a single custom
  page whose aspect ratio follows the framed drawing instead of fixed A4.
- PNG/PDF title blocks load the packaged Lumi PNG and KNX Member JPEG, preserve
  both image aspect ratios and fail visibly if either required asset is missing.
- PNG and PDF expose separate Grid/No grid choices. Grid variants contain minor
  and major graph-aligned grid lines only behind the drawing region; No grid keeps
  the original white drawing background. Rendered pixel output from the two paths
  must differ. Neither path changes graph data or geometry.
- At `1180px` and wider the desktop panel bounds and toolbar remain unchanged.
  Below `1180px`, Canvas reaches both viewport edges, Project/Properties start
  off-canvas, bottom navigation opens one overlay at a time and touch targets are
  at least `44px` high.
- `W` arms Wiring Mode without requiring or changing hover/selection.
- The Wiring Mode toolbar action turns blue with `aria-pressed=true` when armed
  by either `W` or click, and returns to default when the mode exits.
- Pressing `W` immediately after placing selected equipment preserves both the
  equipment count and selection, and never resets `mxConnectionHandler`.
- First and last wire points may be placed in empty Canvas space.
- Equipment endpoint hit-testing works over both SVG and HTML card content.
- Wiring preview and committed edges remain green and keep identical endpoints.
- Completing or cancelling Wiring Mode never changes the equipment count.
- A second left-click on the latest waypoint without intervening movement commits
  the wire at that waypoint. It does not create a zero-length first segment.
- Right-click commits the live cursor endpoint and keeps Wiring Mode armed. `W`,
  the toolbar action and Escape commit any active route and exit the mode.
- Right-button detection covers browser `popupTrigger`, `button` and `which`.
- Backspace removes the last anchor; Space changes the next orthogonal elbow.
- Manual waypoints survive connection commit, Undo/Redo and save/reload.
- At desktop widths, dragging either panel separator updates only its own bounded
  width, leaves at least 420px of Canvas, preserves scroll/zoom and persists the
  result. Keyboard arrows/Home/End obey the same limits. Resize handles stay
  hidden in the mobile overlay layout.

## Production verification

- Run the existing Ant `app` target from `etc/build` so relative generator paths
  resolve correctly, and require zero compiler errors.
- Load the production workspace in a browser with no JavaScript page errors.
- Confirm `app.min.js` contains new runtime symbols or behaviour contracts.
- Update bootstrap asset version and service-worker revisions when the bundle changes.
- Verify the versioned asset is served from network instead of stale precache.

## Windows portable verification

- `DesktopConfig.test.js` requires the packaged Lumi ICO, electron-builder icon,
  BrowserWindow icon, Windows AppUserModelID and all seven Windows icon sizes.
- Electron allows only the sandboxed `about:blank` popup named
  `knx-technical-pdf`, so PDF export reaches Print/Save as PDF without allowing
  arbitrary application popups.
- `build-portable.bat` must stop when a KNX regression suite, Ant or packaging fails.
- Only one portable build may own the shared Ant temporary directory at a time.
- Extract the portable ZIP, run `KNX Topology.exe --smoke-test` and require exit code `0`.
- Record artifact size, SHA-256 and Authenticode status for each release candidate.
