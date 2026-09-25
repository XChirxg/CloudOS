@echo off
setlocal EnableDelayedExpansion

cd /d "%~dp0"
if "%PORT%"=="" set PORT=8000
set "HTML_FILE=%~dp0index.html"

if not exist "%HTML_FILE%" (
    echo index.html not found next to this script.
    exit /b 1
)

set "PY_CMD="
where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    set "PY_CMD=python"
) else (
    where py >nul 2>nul
    if %ERRORLEVEL% equ 0 (
        set "PY_CMD=py"
    )
)

if "%PY_CMD%"=="" (
    echo [ERROR] Python is not installed or not in PATH.
    echo Please install Python 3.10+ from https://www.python.org/ or Windows Store.
    exit /b 1
)

rem Check if port is in use
for /f "tokens=5" %%a in ('netstat -a -n -o ^| findstr /r /c:":%PORT% .*LISTENING"') do (
    echo Port %PORT% is already in use by PID %%a. Stop the existing server first.
    exit /b 1
)

set "LAN_IP=127.0.0.1"
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    for /f "tokens=1" %%b in ("%%a") do (
        if "%%b" neq "127.0.0.1" set "LAN_IP=%%b"
    )
)

echo.
echo ======================================
echo           FILE EXPLORER
echo ======================================
echo Phone URL: http://!LAN_IP!:%PORT%
echo.
echo Keep this terminal open while sharing.
echo Press Ctrl+C to stop.
echo ======================================
echo.

%PY_CMD% "%~dp0lan_server.py" "%HTML_FILE%" %PORT%
