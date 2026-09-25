@echo off
setlocal EnableDelayedExpansion

cd /d "%~dp0"
if "%PORT%"=="" set PORT=8001
if "%LAN_PANEL_PIN%"=="" set LAN_PANEL_PIN=1234

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

for /f "tokens=5" %%a in ('netstat -a -n -o ^| findstr /r /c:":%PORT% .*LISTENING"') do (
    echo Port %PORT% is already in use by PID %%a.
    exit /b 1
)

set "LAN_IP=127.0.0.1"
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    for /f "tokens=1" %%b in ("%%a") do (
        if "%%b" neq "127.0.0.1" set "LAN_IP=%%b"
    )
)

echo.
echo LAN Computer Control
echo Open on phone: http://!LAN_IP!:%PORT%
echo PIN: %LAN_PANEL_PIN%
echo Press Ctrl+C to stop.
echo.

%PY_CMD% lan_control_server.py
