# KNX Windows Portable Build

## Architecture boundary

The desktop target is a thin Electron shell around the existing production
webapp. It does not duplicate or replace KNX domain, UI or mxGraph logic.

`desktop/main.js` serves packaged web assets from an HTTP server bound only to
`127.0.0.1` on an ephemeral port. The BrowserWindow uses context isolation,
disabled Node integration and sandboxing. External navigation is denied in the
application window.

The shell permits one tightly scoped popup: an `about:blank` window named
`knx-technical-pdf`, used to compose the local technical drawing and open the
native Print/Save as PDF dialog. Node integration remains disabled and sandboxing
remains enabled in that child window; all other popups stay denied.

## Build command

From the repository root, run:

```text
build-portable.bat
```

The batch script:

1. detects Java and Ant from environment variables, PATH, sibling tooling or the
   `%TEMP%\knx-build-tools` cache, then prevents concurrent builds with a lock;
2. runs the three KNX regression suites and validates the Electron entry point;
3. rebuilds the production draw.io bundles with Ant;
4. installs locked Electron dependencies when required;
5. creates the Windows x64 portable ZIP.

The output is written to:

```text
desktop/dist/KNX-Topology-<version>-Portable-x64.zip
```

Run `build-portable.bat --check-tools` to verify Java and Ant discovery without
starting tests or packaging.

The Windows executable, Explorer entry, taskbar and Alt+Tab window use the
multi-size Lumi icon at `desktop/assets/icon.ico`. The build's desktop configuration
test requires 16, 24, 32, 48, 64, 128 and 256 px ICO layers before packaging.

`desktop/node_modules/` and `desktop/dist/` are generated artifacts and are not
source. Commit `desktop/package-lock.json` so future builds use the same toolchain.

## Runtime and smoke verification

After extracting the ZIP, `KNX Topology.exe` accepts `--smoke-test`. In that mode
it waits up to 30 seconds for the KNX equipment selector and Canvas, then exits
with code `0` on success or `2` if the KNX UI did not initialize. The smoke suite
also verifies that the named internal PDF popup opens while unrelated popups remain
blocked by the shell policy.

The ZIP must be extracted once before use. The application then starts directly
from that folder and avoids the long per-launch temporary extraction performed
by a single-file NSIS portable executable.

## Signing status

The current portable build is unsigned. `forceCodeSigning` stays disabled until
a public Authenticode certificate or managed signing service is configured.
Production public distribution must enable forced signing so a missing signing
identity fails the build instead of silently producing an unsigned executable.
