# KNX Frontend Architecture

## Runtime model

KNX Topology is an extension of the existing draw.io/mxGraph application. It is
implemented as ordered global JavaScript files and prototype integrations. It is
not a React, Vue or standalone frontend application.

## Module responsibilities

- `core/KnxConstants.js` owns shared values required by domain, layout and UI.
- `core/KnxObjectSchema.js` owns persistent equipment field names, equipment
  types, IA/Power Supply Line-address parsing, labels and presentation field order.
- `KnxTopologyModule.js` coordinates topology commands, validation, wiring,
  topology views and draw.io adapters.
- `KnxLayoutFoundation.js` owns Layout Store, stable-object index, serialization,
  migration and Undo/Redo layout snapshots.
- `KnxAreaLayout.js` owns Area bounds, routing, topology mutations, reflow and
  viewport fitting commands.
- `KnxWorkspace.js` owns the KNX application shell and command entry points.
- `WireMode.js` owns source-independent wire placement, preview and keyboard
  interaction without delegating the gesture to `mxConnectionHandler`.

## Data flow

```text
Properties / Add Device
  -> KnxTopologyModule
  -> mxCell XML attributes
  -> mxGraph model change
  -> Topology Index / Layout Store synchronization
  -> Canvas card + address-derived Tree + Properties projections
```

Persistent equipment address, `deviceType` and equipment data live in the `mxCell`
XML value. The active Tree parses each type's address into virtual Area and Line groups; those group rows are
not mxCells. Layout Store and geometry describe presentation. Edges describe
wiring and must not redefine address-derived hierarchy. Legacy parent topology
attributes remain readable for backward compatibility.

## Event and transaction flow

Equipment creation enters through `KnxAreaLayoutEngine.runTopologyMutation` so
manual placement and Undo/Redo snapshots remain compatible with the existing
foundation. Model-change listeners update the index, address-derived tree and
cached HTML labels. Legacy Area/Line mutations remain available only for loading
and preserving older diagrams; they have no active creation entry point.

Wiring is a separate state machine: `W` arms the tool, Canvas clicks persist
explicit anchors, and one model transaction inserts the finished edge. Device
snap constraints are endpoint metadata, not prerequisites for starting a wire.
The state machine captures Canvas pointer events before draw.io selection and
HTML-label handlers, then resolves equipment against rendered cell bounds.

## Dependency order

```text
KnxConstants
  -> KnxObjectSchema
  -> KnxTopologyModule
  -> KnxLayoutFoundation
  -> KnxAreaLayout
  -> KnxWorkspace
```

Both development and production build declarations must preserve this order.

## Desktop packaging

`desktop/` is a packaging boundary, not a second frontend. Its Electron main
process serves the existing production webapp from loopback and owns only native
window lifecycle and packaging concerns. All KNX state, rendering and interaction
remain in the existing modules above.
