@echo off
setlocal
title Google Calendar Event Generator
pushd "%~dp0"
if errorlevel 1 goto folder_error

rem Use the installed Electron runtime directly; Node.js is only needed for setup.
if exist "node_modules\electron\dist\electron.exe" goto launch

echo [1/3] Checking Node.js and npm...
echo Node.js with npm and an internet connection are required.
where npm.cmd >nul 2>nul
if errorlevel 1 goto npm_missing
where node.exe >nul 2>nul
if errorlevel 1 goto npm_missing

:install_dependencies
echo.
echo [2/3] Downloading and installing application dependencies...
echo Live progress and installer output appear below. Please keep this window open.
rem Override quiet npm settings only for this launcher, not globally.
set "npm_config_progress=true"
set "npm_config_foreground_scripts=true"
set "ELECTRON_GET_NO_PROGRESS="
if exist "package-lock.json" (
  call npm.cmd ci --include=dev --progress=true --foreground-scripts --loglevel=info
) else (
  call npm.cmd install --include=dev --progress=true --foreground-scripts --loglevel=info
)
if errorlevel 1 goto install_error
if not exist "node_modules\electron\dist\electron.exe" goto install_error

:launch
echo.
echo [3/3] Setup ready. Starting Google Calendar Event Generator...
rem Ensure Electron opens the desktop app even from a Node-configured environment.
set "ELECTRON_RUN_AS_NODE="
start "Google Calendar Event Generator" "node_modules\electron\dist\electron.exe" "%CD%"
if errorlevel 1 goto launch_error
popd
exit /b 0

:npm_missing
echo.
echo Node.js / npm was not found.
echo Install Node.js LTS with npm using Windows Package Manager?
echo This downloads software and may ask for administrator permission.
choice /C YN /N /M "Install now? [Y] Yes / [N] No: "
if errorlevel 2 goto cancelled
if errorlevel 1 goto install_node
goto cancelled

:install_node
where winget >nul 2>nul
if errorlevel 1 goto winget_missing
echo.
echo [1/3] Downloading Node.js LTS -- watch the download progress below.
echo The Node.js installer will show installation progress in its own window.
call winget install --id OpenJS.NodeJS.LTS --exact --source winget --accept-source-agreements --interactive
if errorlevel 1 goto node_install_error
rem Include the standard Node installer destinations in this console's PATH.
set "PATH=%ProgramFiles%\nodejs;%ProgramFiles(x86)%\nodejs;%LOCALAPPDATA%\Programs\nodejs;%PATH%"
where node.exe >nul 2>nul
if errorlevel 1 goto restart_needed
where npm.cmd >nul 2>nul
if errorlevel 1 goto restart_needed
goto install_dependencies

:cancelled
echo.
echo Setup cancelled. Nothing was installed.
popd
exit /b 1

:winget_missing
echo Windows Package Manager ^(winget^) is not available.
echo Install Node.js LTS from https://nodejs.org/ and run this launcher again.
goto failed

:node_install_error
echo Node.js installation failed or was cancelled. Application setup stopped.
goto failed

:restart_needed
echo Node.js installation completed, but node/npm is not visible in this console.
echo Close this window and run the launcher again to refresh your PATH.
goto failed

:install_error
echo.
echo Dependency installation failed. Check the messages above and your connection.
goto failed

:launch_error
echo.
echo Windows could not start Electron. Check the app installation.
goto failed

:folder_error
echo Could not open the application folder.
pause
exit /b 1

:failed
echo.
pause
popd
exit /b 1
