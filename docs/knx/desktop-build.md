# KNX Windows Portable Build

## Architecture boundary

The desktop target is a thin Electron shell around the existing production
webapp. It does not duplicate or replace KNX domain, UI or mxGraph logic.

`desktop/main.js` serves packaged web assets from an HTTP server bound only to
`127.0.0.1` on an ephemeral port. The BrowserWindow uses context isolation,
disabled Node integration and sandboxing. External navigation is denied in the
application window.

## Build command

From the repository root, run:

```text
build-portable.bat
```

The batch script:

1. prevents concurrent portable builds with a build lock;
2. runs the three KNX regression suites and validates the Electron entry point;
3. rebuilds the production draw.io bundles with Ant;
4. installs locked Electron dependencies when required;
5. creates the Windows x64 portable ZIP.

The output is written to:

```text
desktop/dist/KNX-Topology-<version>-Portable-x64.zip
```

`desktop/node_modules/` and `desktop/dist/` are generated artifacts and are not
source. Commit `desktop/package-lock.json` so future builds use the same toolchain.

## Runtime and smoke verification

After extracting the ZIP, `KNX Topology.exe` accepts `--smoke-test`. In that mode
it waits up to 30 seconds for the KNX equipment selector and Canvas, then exits
with code `0` on success or `2` if the KNX UI did not initialize.

The ZIP must be extracted once before use. The application then starts directly
from that folder and avoids the long per-launch temporary extraction performed
by a single-file NSIS portable executable.

## Signing status

The current portable build is unsigned. `forceCodeSigning` stays disabled until
a public Authenticode certificate or managed signing service is configured.
Production public distribution must enable forced signing so a missing signing
identity fails the build instead of silently producing an unsigned executable.
