# KNX UX Rules

## Workspace

- Preserve the desktop engineering layout: Project Tree, Canvas, Properties,
  command toolbar and status bar.
- Browser favicon and application title use Lumi branding. The workspace header
  visibly presents the Lumi and KNX Member logos before the KNX Topology title.
- Before the workspace initializes, the loading splash uses Lumi KNX Topology
  branding and contains no draw.io product or flowchart-marketing text.
- The topology toolbar exposes one Add Device control with a visible equipment
  type selector for Device, LC, BC, Line Repeater and KNX Power Supply.
- Power Supply, LC and BC also expose compact quick-add actions. Each action
  immediately starts the existing manual placement preview for its fixed type.
- Add Area and Add Line are not shown in the active toolbar or Project Tree.
- Commands must have visible UI entry points even when a keyboard shortcut exists.
- Disabled and unavailable commands remain distinguishable from active ones.
- File provides local New Project, Open Project, Import Drawing and Save/Export
  commands. New/Open replace the active project after warning about unsaved work;
  Import Drawing inserts the selected diagram into the current Canvas and keeps
  the current Project Info unchanged.
- Download offers editable `.lukatp`, PNG and PDF formats without invoking authorization
  for a cloud provider. LUKA Topology and PNG download directly; PDF opens the
  local print dialog where the user can choose Save as PDF.
- Editable project downloads end exactly in `.lukatp`; the underlying draw.io
  XML helper must not append `.drawio` or `.xml` to the custom filename.
- A successful Save Project download becomes the current saved snapshot, so a
  following New/Open action does not warn unless newer edits exist.
- Project Info persists project name, drawing title, designer, design date,
  project code, revision and notes in the editable project. Equipment count is
  derived automatically from the active topology.
- PNG and PDF render a technical border plus a bottom-right title block containing
  Project Info and equipment count. PDF uses one content-proportional custom page,
  not a fixed A4 page.
- PNG and PDF each offer explicit Grid and No grid variants. Grid is export-only,
  stays inside the drawing region and never modifies Canvas or project geometry.
- The technical title block includes the supplied Lumi and KNX Member logos in a
  dedicated logo cell. Each logo preserves its source aspect ratio.

## Mobile and tablet

- The desktop layout remains unchanged at `1180px` and wider.
- Below `1180px`, Canvas uses the available width while Project Tree and Properties
  become mutually exclusive overlay panels opened from a bottom navigation bar.
- Mobile controls use touch targets of at least `44px`; toolbar actions remain
  horizontally reachable without removing desktop commands.
- Selecting a Project Tree row returns to Canvas. Properties stays open while the
  user edits fields, and Canvas closes either overlay explicitly.

## Selection and editing

- Tree, Canvas and Properties always refer to the same stable equipment object.
- Property edits update persistent XML data and redraw the Canvas card immediately.
- Editing IA immediately moves regular equipment to the derived Area/Line group.
  Power Supply Properties uses `Line Address (Area.Line.)`, and editing it moves
  the Power Supply to the corresponding derived Area/Line group.
- Equipment cards display Name, IA, Manufacturer, Order Number, Application Name
  and Room, using ellipsis plus a full-value tooltip when space is insufficient.
- Device, LC, BC, Line Repeater and KNX Power Supply share one exact card size.
  Power Supply uses a red identification strip; Name and IA are
  the primary visual layer; Manufacturer, Order Number, Application Name and
  Room remain visible as secondary metadata with ellipsis and tooltip fallback.

## Equipment placement and wiring

- Add Device enters a preview for the selected equipment type and creates no real
  cell until commit.
- Click or Enter commits a free Canvas position; Escape or right-click cancels.
- Placement does not require a selected Area or Line.
- Wiring Mode and `W` arm a wire-first tool without changing the current
  selection. The first click may be on equipment or empty Canvas; later clicks
  add orthogonal anchors and equipment snapping is optional.
- While Wiring Mode is armed, its toolbar action uses the selected blue state
  and `aria-pressed=true`; leaving the mode restores the default action state.
- Preview and committed wires use the same green KNX style, fixed terminal
  points and explicit waypoints. Clicking the latest waypoint again without
  moving completes the active wire at that waypoint. Right-click completes at
  the live cursor and keeps the tool armed. `W`, the Wiring Mode toolbar action
  and Escape complete any active wire and exit the mode.
- Backspace/Delete removes the last anchor and Space changes the next elbow.
  Entering, completing or cancelling Wiring Mode never mutates equipment.
- `W` is captured before draw.io shortcuts. During mode entry, removal requests
  are blocked so recently placed or selected equipment cannot be deleted.

## Project Tree

- Project Tree Area and Line rows are projections derived from equipment address.
- Derived Area/Line rows are not stored Canvas objects and do not expose Add actions.
- Invalid or missing IA remains visible in an explicit error group.

## Viewport and feedback

- Normal commands do not automatically Fit, Center or change zoom.
- Active placement and wiring operations provide status text and a clear cursor.
- Empty, hover, selected, focus and error states remain visible and accessible.
- On desktop, the Project and Properties borders are draggable separators with
  bounded widths. Resizing preserves Canvas scroll/zoom, persists locally and
  supports arrow/Home/End keys; mobile overlay panel widths remain unchanged.
