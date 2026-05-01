@echo off
setlocal enabledelayedexpansion
title LockBox Dev Server Manager
cd /d "%~dp0"

:: Allow setting port from environment or default to 5173
if not defined PORT set PORT=5173

:menu
cls
echo.
echo  =======================================================
echo         [ LockBox ]  Dev Server Manager
echo  =======================================================
echo.

:: Detect Node / npm versions
for /f "tokens=*" %%v in ('node --version 2^>nul') do set "NODE_VER=%%v"
for /f "tokens=*" %%v in ('npm  --version 2^>nul') do set "NPM_VER=%%v"
if defined NODE_VER (
    echo  - Node !NODE_VER!   npm v!NPM_VER!
) else (
    echo  [!] Node.js not found ^- install from https://nodejs.org
)

:: Detect server via the current PORT
set "SERVER_PID="
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr /r ":!PORT! "') do (
    if not defined SERVER_PID set "SERVER_PID=%%p"
)

echo.
if defined SERVER_PID (
    echo  Status : [ RUNNING ]  ^(PID !SERVER_PID!^) 
    echo  URL    : http://localhost:!PORT!
) else (
    echo  Status : [ STOPPED ]
)
echo  Port   : !PORT!
echo.
echo  -------------------------------------------------------
echo   [1] Start dev server
echo   [2] Stop server
echo   [3] Restart server
echo   [4] Open browser
echo   [5] Install / update packages
echo   [6] Build for production
echo   [7] Clear Vite cache
echo   [8] Run Linter
echo   [9] Change Port
echo   [0] Exit
echo  -------------------------------------------------------
echo.
set /p "CHOICE=  Select option [0-9]: "

if "!CHOICE!"=="1" goto :start
if "!CHOICE!"=="2" goto :stop
if "!CHOICE!"=="3" goto :restart
if "!CHOICE!"=="4" goto :openbrowser
if "!CHOICE!"=="5" goto :install
if "!CHOICE!"=="6" goto :build
if "!CHOICE!"=="7" goto :clearcache
if "!CHOICE!"=="8" goto :lint
if "!CHOICE!"=="9" goto :changeport
if "!CHOICE!"=="0" exit /b 0
goto :menu

:: --- START ---
:start
cls
if defined SERVER_PID (
    echo  [!] Server is already running on http://localhost:!PORT! ^(PID !SERVER_PID!^)
    echo  Use option [3] to restart.
    pause
    goto :menu
)
if not exist "node_modules\" (
    echo  node_modules not found. Running npm install first...
    echo.
    npm install
    if errorlevel 1 (
        echo.
        echo  [X] npm install failed. Fix the errors above and try again.
        pause
        goto :menu
    )
    echo.
)
echo  Starting LockBox dev server on port !PORT! in a new window...
start "LockBox Dev Server" cmd /c "npm run dev -- --host --port !PORT!"
timeout /t 4 /nobreak >nul
echo  [+] Server started!
echo.
start "" "http://localhost:!PORT!"
echo  [*] Browser opened at http://localhost:!PORT!
echo  ^(Close the "LockBox Dev Server" window to stop the server manually^)
echo.
pause
goto :menu

:: --- STOP ---
:stop
cls
if not defined SERVER_PID (
    echo  [!] No server is running on port !PORT!.
    pause
    goto :menu
)
echo  Stopping server ^(PID !SERVER_PID!^)...
taskkill /PID !SERVER_PID! /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq LockBox Dev Server*" /T /F >nul 2>&1
timeout /t 1 /nobreak >nul
echo  [+] Server stopped.
pause
goto :menu

:: --- RESTART ---
:restart
cls
if defined SERVER_PID (
    echo  Stopping existing server ^(PID !SERVER_PID!^)...
    taskkill /PID !SERVER_PID! /T /F >nul 2>&1
    taskkill /FI "WINDOWTITLE eq LockBox Dev Server*" /T /F >nul 2>&1
    timeout /t 2 /nobreak >nul
    set "SERVER_PID="
)
echo  Starting LockBox dev server on port !PORT!...
start "LockBox Dev Server" cmd /c "npm run dev -- --host --port !PORT!"
timeout /t 4 /nobreak >nul
echo  [+] Server restarted!
start "" "http://localhost:!PORT!"
pause
goto :menu

:: --- OPEN BROWSER ---
:openbrowser
start "" "http://localhost:!PORT!"
goto :menu

:: --- INSTALL ---
:install
cls
echo  Installing / updating dependencies...
echo.
npm install
if errorlevel 1 (
    echo.
    echo  [X] npm install failed.
) else (
    echo.
    echo  [+] Done! All packages are up to date.
)
pause
goto :menu

:: --- BUILD ---
:build
cls
echo  Building LockBox for production...
echo.
npm run build
if errorlevel 1 (
    echo.
    echo  [X] Build failed. See errors above.
) else (
    echo.
    echo  [+] Build complete! Output is in the 'dist' folder.
    echo  Run "npm run preview" to preview locally.
)
pause
goto :menu

:: --- CLEAR CACHE ---
:clearcache
cls
echo  Clearing Vite cache...
if exist "node_modules\.vite" (
    rmdir /s /q "node_modules\.vite"
    echo  [+] Cache cleared successfully.
) else (
    echo  [!] No cache found to clear.
)
pause
goto :menu

:: --- LINT ---
:lint
cls
echo  Running LockBox linter...
echo.
npm run lint
echo.
pause
goto :menu

:: --- CHANGE PORT ---
:changeport
cls
echo  Current port is: !PORT!
echo.
set /p "NEW_PORT=  Enter new port number (e.g. 3000, 8080): "
if not "!NEW_PORT!"=="" (
    set "PORT=!NEW_PORT!"
    echo.
    echo  [+] Port updated to !PORT!
) else (
    echo.
    echo  [!] Port unchanged.
)
pause
goto :menu
