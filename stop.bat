@echo off
setlocal EnableDelayedExpansion

cd /d "%~dp0"

if "%PORT%"=="" set PORT=8000
set "PID_FILE=%~dp0server.pid"
set STOPPED=0

echo Stopping Windows Web OS...

rem 1. Stop by PID file if present
if exist "%PID_FILE%" (
    set /p PID=<"%PID_FILE%"
    set "PID=!PID: =!"
    if defined PID (
        echo Terminating server process !PID!...
        taskkill /F /PID !PID! >nul 2>&1
        if !ERRORLEVEL! equ 0 set STOPPED=1
    )
    del /f /q "%PID_FILE%" >nul 2>&1
)

rem 2. Check if any process is still listening on port
for /f "tokens=5" %%a in ('netstat -a -n -o ^| findstr /r /c:":%PORT% .*LISTENING"') do (
    set "PORT_PID=%%a"
    if defined PORT_PID (
        echo Stopping remaining process on port %PORT%: !PORT_PID!
        taskkill /F /PID !PORT_PID! >nul 2>&1
        set STOPPED=1
    )
)

if "!STOPPED!"=="1" (
    echo Windows Web OS stopped successfully. Port %PORT% is now free.
) else (
    echo No server was running on port %PORT%.
)
