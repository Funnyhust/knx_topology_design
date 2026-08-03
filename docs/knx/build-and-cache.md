# KNX Build and Cache

## Development loading

`src/main/webapp/js/diagramly/Devel.js` declares development script order. Core
files must load before any module that reads their globals.

## Production loading

`etc/build/build.xml` declares Closure Compiler source order for `app.min.js`.
Never edit `app.min.js`, `extensions.min.js` or `orgchart.min.js` by hand.

## Cache contract

- `index.html` loads versioned bootstrap/main assets.
- `bootstrap.js` loads a versioned `app.min.js`.
- `service-worker.js` must contain the current MD5 revisions.
- Requests containing explicit `v=` are cache-busters and bypass precache matching.
- After changing the production bundle, increment the asset version and verify the
  server response contains the expected KNX runtime code.

## Build completion criteria

A production change is complete only when source checks, KNX tests, Closure
Compiler, bundle inspection and cache-manifest verification all succeed.
