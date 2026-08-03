# KNX Business Rules

## Equipment-first topology creation

- The primary creation command is Add Device with five equipment types: Device,
  Line Coupler (LC), Backbone Coupler (BC), Line Repeater and KNX Power Supply.
- New equipment is placed manually on the Canvas.
- Add Device does not create an Area, Line, bus, region or connector.
- Add Area and Add Line are not exposed in the active workspace or Project Tree.
- Structural Area/Line objects from older diagrams remain loadable and are not
  deleted or rewritten automatically.

## Identity and address-derived hierarchy

- `knxObjectId` is stable identity across Tree, Canvas, Properties and layout.
- `deviceType` identifies the selected equipment type for newly-created objects.
- Device, LC, BC and Line Repeater Individual Address uses `Area.Line.Device`.
- KNX Power Supply has no individual Device segment. Its canonical persistent
  address is `Area.Line.`, for example `1.1.`.
- The active Project Tree derives Area and Line groups from each equipment address.
- BC equipment is displayed directly under its derived Area; LC, Line Repeater,
  KNX Power Supply and regular Device equipment are displayed under the derived Line.
- Invalid or missing equipment address stays visible in an explicit unassigned group.
- Geometry, proximity and connector shape never determine topology hierarchy.
- Moving equipment on Canvas must not change its IA or derived tree position.

## Wiring

- Wiring Mode and `W` are independent of equipment hover and selection. A wire
  may start or end at a fixed free-Canvas point; equipment perimeter snapping is
  available when the pointer is over equipment.
- Wiring is a manual Canvas operation and does not create topology containers.
- Manual wire entry, completion or cancellation never mutates equipment.
- Manual KNX wires preserve fixed terminal constraints and user waypoints.
- Existing structural bus connections in legacy diagrams retain their stored
  semantics and validation path.

## Validation

- Equipment-first diagrams validate the address syntax and KNX ranges for each
  equipment type. Duplicate IA validation applies only to equipment that has an
  individual Device segment; Power Supplies may share one Line address.
- Legacy structural diagrams retain their existing bus and structural validation.

## Layout and viewport

- Equipment placement is manual and starts with `layoutMode=manual`.
- Add Device must not automatically Fit, Center or change zoom.
- All five equipment types use the shared standard equipment-card size.

## Undo/Redo

- Add/Place Device and Wiring are separate Undo commands.
- Undo and Redo preserve stable IDs, metadata and manual geometry.
