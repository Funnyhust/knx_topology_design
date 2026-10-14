# KNX Windows Portable Build

## macOS test ZIP

`desktop/package.json` also defines `dist:mac`, which packages ZIPs for Apple
Silicon (`arm64`) and Intel (`x64`). Run it on macOS with `npm ci` followed by
`npm run dist:mac` from `desktop/`.

The `KNX macOS ZIP` GitHub Actions workflow runs on macOS runners for both
architectures. It can run manually from a branch containing the workflow, or
automatically when a `build/mac-zip-*` branch is pushed. Artifacts contain the
application ZIP and its SHA-256 checksum. Extract the inner ZIP on the Mac and
move `KNX Topology.app` to Applications.

These test builds use ad-hoc signing, not an Apple Developer ID certificate or
notarization. Gatekeeper may require approval in System Settings > Privacy &
Security after an initial launch attempt. The workflow verifies the signature
and runs the packaged application's existing smoke checks on each architecture.

Packaging reuses the checked-in production webapp. It does not rebuild the web
bundle: the current checkout does not contain `etc/build/build.xml`. Frontend
source changes require restoring that existing Ant build before making a new
production bundle. Desktop menus expose native macOS Edit commands for Command
shortcuts.

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

Closing a clean window exits normally. If the webapp blocks closing because of
an unload warning, the Electron shell shows a native confirmation with Close
without saving and Keep editing. Keep editing (also Escape) is the default;
Close without saving explicitly permits the window to close.

Run `desktop/node_modules/electron/dist/electron.exe desktop/DesktopClose.test.js`
from the repository root to exercise clean close, cancelled close and confirmed
close against real Electron windows. Results are recorded in
`desktop/dist/close-test.log`; this test uses an isolated temporary profile.

After extracting the ZIP, `KNX Topology.exe` accepts `--smoke-test`. In that mode
it waits up to 30 seconds for the KNX equipment selector and Canvas, then exits
with code `0` on success or `2` if the KNX UI did not initialize. The smoke suite
also verifies that the named internal PDF popup opens while unrelated popups remain
blocked by the shell policy.

Smoke tests use a fresh temporary Electron user-data directory. Their test
drawings and recovery drafts never enter the normal application profile at
`%APPDATA%\knx-topology-desktop`. That profile is local machine data and is not
included in the portable ZIP.

The ZIP must be extracted once before use. The application then starts directly
from that folder and avoids the long per-launch temporary extraction performed
by a single-file NSIS portable executable.

## Signing status

The current portable build is unsigned. `forceCodeSigning` stays disabled until
a public Authenticode certificate or managed signing service is configured.
Production public distribution must enable forced signing so a missing signing
identity fails the build instead of silently producing an unsigned executable.
