@echo off
setlocal EnableExtensions

pushd "%~dp0"
if errorlevel 1 exit /b 1

set "BUILD_EXIT=1"
set "BUILD_LOCK=%~dp0desktop\.portable-build.lock"
2>nul mkdir "%BUILD_LOCK%"
if errorlevel 1 (
  echo [ERROR] Another portable build is running, or a stale lock exists:
  echo   %BUILD_LOCK%
  echo Remove that directory only after confirming no other build is active.
  popd
  exit /b 1
)

set "ANT_COMMAND="
if defined ANT_HOME if exist "%ANT_HOME%\bin\ant.bat" set "ANT_COMMAND=%ANT_HOME%\bin\ant.bat"
if not defined ANT_COMMAND if exist "%~dp0..\ant-tooling\apache-ant-1.10.17\bin\ant.bat" set "ANT_COMMAND=%~dp0..\ant-tooling\apache-ant-1.10.17\bin\ant.bat"
if not defined ANT_COMMAND for /f "delims=" %%A in ('where ant.bat 2^>nul') do if not defined ANT_COMMAND set "ANT_COMMAND=%%A"

if not defined ANT_COMMAND (
  echo [ERROR] Apache Ant was not found.
  echo Set ANT_HOME or install Ant and add it to PATH.
  goto :cleanup
)

where node.exe >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found in PATH.
  goto :cleanup
)

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm was not found in PATH.
  goto :cleanup
)

echo [1/4] Running KNX regression checks...
node --check "desktop\main.js"
if errorlevel 1 goto :cleanup
node "src\main\webapp\js\knx\KnxLayoutFoundation.test.js"
if errorlevel 1 goto :cleanup
node "src\main\webapp\js\knx\KnxAreaLayout.test.js"
if errorlevel 1 goto :cleanup
node "src\main\webapp\js\knx\KnxTopologyStructure.test.js"
if errorlevel 1 goto :cleanup

echo [2/4] Building the KNX web application...
pushd "etc\build"
call "%ANT_COMMAND%" -f build.xml app
set "BUILD_RESULT=%ERRORLEVEL%"
popd
if not "%BUILD_RESULT%"=="0" (
  echo [ERROR] KNX web build failed.
  set "BUILD_EXIT=%BUILD_RESULT%"
  goto :cleanup
)

echo [3/4] Preparing Electron dependencies...
pushd "desktop"
if not exist "node_modules\electron\package.json" (
  if exist "package-lock.json" (
    call npm ci
  ) else (
    call npm install
  )

  if errorlevel 1 (
    echo [ERROR] npm dependency installation failed.
    popd
    goto :cleanup
  )
)

echo [4/4] Building the fast-start Windows x64 portable ZIP...
call npm run dist:portable
set "PORTABLE_RESULT=%ERRORLEVEL%"
if not "%PORTABLE_RESULT%"=="0" (
  echo [ERROR] Portable build failed.
  popd
  set "BUILD_EXIT=%PORTABLE_RESULT%"
  goto :cleanup
)

echo.
echo [SUCCESS] Portable build completed:
for %%F in ("dist\KNX-Topology-*-Portable-x64.zip") do (
  echo   %%~fF
  echo Extract the ZIP once, then run KNX Topology.exe from its folder.
)
popd
set "BUILD_EXIT=0"

:cleanup
2>nul rmdir "%BUILD_LOCK%"
popd
exit /b %BUILD_EXIT%
