# Codex Working Notes

Operational guidance for agents working on the KNX extension of draw.io.

## Relevant source

- KNX runtime: `src/main/webapp/js/knx/`
- Wiring integration: `src/main/webapp/js/diagramly/WireMode.js`
- Development load order: `src/main/webapp/js/diagramly/Devel.js`
- Production load order: `etc/build/build.xml`
- Browser entry and cache: `src/main/webapp/index.html`,
  `src/main/webapp/js/bootstrap.js`, `src/main/webapp/service-worker.js`

## Verification

Run the three KNX contract suites after relevant changes:

```text
node src/main/webapp/js/knx/KnxLayoutFoundation.test.js
node src/main/webapp/js/knx/KnxAreaLayout.test.js
node src/main/webapp/js/knx/KnxTopologyStructure.test.js
```

Run `node --check` for every changed JavaScript source. Production behaviour must
also be rebuilt with the existing Ant target; do not hand-edit minified bundles.

## Repository-specific cautions

- Scripts are globals loaded in a strict order; there is no ES module loader.
- draw.io prototypes are patched by KNX integration code. Patch order is behaviour.
- `mxCell` XML values are persistent domain data. Canvas geometry and connectors
  are projections and must not silently become topology truth.
- Attribute changes need label invalidation because mxGraph can retain HTML-label
  state after `mxCellAttributeChange`.
- Versioned browser assets use `v=`. The service worker must let these explicit
  cache-busting requests reach the network.

Business and UX rules are canonical under `docs/knx/`; do not duplicate them here.
