@echo off
setlocal EnableDelayedExpansion

if "%PORT%"=="" set PORT=8001
set STOPPED=0

for /f "tokens=5" %%a in ('netstat -a -n -o ^| findstr /r /c:":%PORT% .*LISTENING"') do (
    set "PID=%%a"
    if defined PID (
        echo Stopping LAN control server on port %PORT% ^(PID !PID!^)...
        taskkill /F /PID !PID! >nul 2>&1
        set STOPPED=1
    )
)

if "!STOPPED!"=="1" (
    echo LAN control server on port %PORT% stopped.
) else (
    echo No LAN control server found on port %PORT%.
)
