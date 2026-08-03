# KNX Frontend Structure

## Current safe structure

```text
src/main/webapp/js/knx/
├── core/
│   ├── KnxConstants.js
│   └── KnxObjectSchema.js
├── KnxTopologyModule.js
├── KnxLayoutFoundation.js
├── KnxAreaLayout.js
├── KnxWorkspace.js
├── KnxWorkspace.css
└── *.test.js
```

The four existing modules remain in place to preserve global load order and keep
the current diff reviewable. Equipment type definitions and IA parsing remain in
`KnxObjectSchema` because creation, Properties, cards, Tree and status all share
that contract.

## Incremental target

New extraction is allowed only when a requested change exercises that
responsibility and the extraction can be independently tested.

```text
knx/
├── core/          shared constants and persistent object schema
├── domain/        topology commands and validation
├── layout/        layout store, Area layout and routing
├── ui/            workspace, cards, Properties and Tree
├── integration/   draw.io/mxGraph prototype adapters
└── tests/         mirrored contract tests
```

Recommended extraction order:

1. Equipment card presentation.
2. Properties panel.
3. Topology Tree.
4. Validation.
5. Routing and draw.io adapters only after regression coverage exists.

Do not create empty folders or move files only to match the target tree. Folder
changes must accompany a concrete reduction in responsibility or duplication.
