@echo off
cd /d "%~dp0"

REM Double-clicking inherits Explorer's environment, which can be stale after
REM nvm changes PATH (a known nvm-on-Windows quirk). If node/npm aren't
REM already resolvable, fall back to nvm's known install location instead of
REM failing with "node is not recognized".
where node >nul 2>nul
if errorlevel 1 (
    if exist "C:\Program Files\nvm\nodejs\node.exe" (
        echo node not found on PATH, using C:\Program Files\nvm\nodejs instead.
        set "PATH=C:\Program Files\nvm\nodejs;%PATH%"
    ) else (
        echo Could not find node.exe. Install Node.js or restart Explorer/log off after installing nvm.
        pause
        exit /b 1
    )
)

if not exist node_modules (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo npm install failed.
        pause
        exit /b 1
    )
)

if not exist .env (
    echo No .env file found. Copy .env.example to .env and fill in your keys first.
    pause
    exit /b 1
)

echo Starting WanderLust on http://localhost:8080 ...
node app.js

pause
