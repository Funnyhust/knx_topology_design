# KNX Topology Agent Guide

This file applies to the whole repository. The repository is an existing
draw.io/mxGraph codebase, not a greenfield application.

## Required reading

Before changing KNX code, read in this order:

1. `CODEX.md`
2. `docs/knx/README.md`
3. `docs/knx/knx-rules.md`
4. `docs/knx/architecture.md`
5. The relevant UX and decision records in `docs/knx/`
6. All source files and tests involved in the requested flow

Current source code remains the implementation source of truth. When a document
conflicts with current user requirements or source behaviour, report the
conflict before making a potentially breaking change.

## Change policy

- Prefer the smallest change that solves the verified problem.
- Do not replace draw.io, mxGraph, the global-script architecture or build system.
- Do not change KNX hierarchy, addressing, validation, connection, serialization
  or import/export rules unless the user explicitly requests it.
- Preserve stable IDs, selection, Undo/Redo, manual geometry and old-project data.
- Reuse existing modules and conventions before adding abstractions.
- Every new runtime script must be added in dependency order to both
  `src/main/webapp/js/diagramly/Devel.js` and `etc/build/build.xml`.
- A production source change is incomplete until the production bundle and cache
  manifest are updated and the KNX tests pass.

## Required report structure

Use these sections for analysis and handoff:

1. Hiểu yêu cầu
2. Phân tích code hiện tại
3. Phạm vi thay đổi
4. Kế hoạch
5. Implementation
6. Kiểm tra
7. Rủi ro
8. Đề xuất thêm
