# KNX UX Rules

## Workspace

- Preserve the desktop engineering layout: Project Tree, Canvas, Properties,
  command toolbar and status bar.
- The topology toolbar exposes one Add Device control with a visible equipment
  type selector for Device, LC, BC, Line Repeater and KNX Power Supply.
- Add Area and Add Line are not shown in the active toolbar or Project Tree.
- Commands must have visible UI entry points even when a keyboard shortcut exists.
- Disabled and unavailable commands remain distinguishable from active ones.

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
  points and explicit waypoints. Right-click or Escape completes the active
  wire at the current live cursor and keeps the tool armed; repeating it with
  no active wire exits. The Canvas context menu stays suppressed while armed.
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
