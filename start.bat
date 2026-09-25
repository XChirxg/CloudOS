@echo off
setlocal EnableDelayedExpansion

cd /d "%~dp0"

if "%PORT%"=="" set PORT=8000
set "PID_FILE=%~dp0server.pid"
set "LOG_FILE=%~dp0server.log"

rem Detect Python command
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
    echo [ERROR] Python was not found in your PATH.
    echo Please install Python 3.10+ from https://www.python.org/ or Windows Store.
    exit /b 1
)

rem Check if PID file exists and process is running
if exist "%PID_FILE%" (
    set /p OLD_PID=<"%PID_FILE%"
    set "OLD_PID=!OLD_PID: =!"
    if defined OLD_PID (
        tasklist /FI "PID eq !OLD_PID!" 2>nul | findstr /i "!OLD_PID!" >nul 2>nul
        if !ERRORLEVEL% equ 0 (
            echo Windows Web OS is already running ^(PID !OLD_PID!^).
            set "LAN_IP=127.0.0.1"
            for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
                for /f "tokens=1" %%b in ("%%a") do (
                    if "%%b" neq "127.0.0.1" set "LAN_IP=%%b"
                )
            )
            echo   -^> Home Wi-Fi URL     : http://!LAN_IP!:%PORT%
            where tailscale >nul 2>nul
            if !ERRORLEVEL! equ 0 (
                for /f "usebackq tokens=*" %%t in (`tailscale ip -4 2^>nul`) do (
                    if not "%%t"=="" echo   -^> Remote / Tailscale : http://%%t:%PORT%
                )
            )
            exit /b 0
        ) else (
            del /f /q "%PID_FILE%" >nul 2>&1
        )
    )
)

rem Check if port is occupied
set "OCCUPIED="
for /f "tokens=5" %%a in ('netstat -a -n -o ^| findstr /r /c:":%PORT% .*LISTENING"') do (
    set "OCCUPIED=%%a"
)

if defined OCCUPIED (
    echo Notice: Port %PORT% is occupied. Freeing port %PORT%...
    call "%~dp0stop.bat"
    timeout /t 1 /nobreak >nul 2>&1
)

echo =================================================================
echo                    WINDOWS WEB OS (REMOTE DESKTOP)               
echo =================================================================
echo  Starting Windows Web OS on port %PORT%...

rem Set environment port and start server in background
set "PORT=%PORT%"
start /b "" %PY_CMD% -u server.py >> "%LOG_FILE%" 2>&1

rem Wait up to 3 seconds for server to bind port
set STARTED=0
set "SERVER_PID="
for /l %%i in (1,1,15) do (
    for /f "tokens=5" %%a in ('netstat -a -n -o ^| findstr /r /c:":%PORT% .*LISTENING"') do (
        set "SERVER_PID=%%a"
        set STARTED=1
    )
    if "!STARTED!"=="1" goto :server_up
    timeout /t 1 /nobreak >nul 2>&1
)

:server_up
if "!STARTED!"=="1" (
    if defined SERVER_PID (
        echo !SERVER_PID! > "%PID_FILE%"
        echo  Server started successfully^^! ^(PID !SERVER_PID!^)
    ) else (
        echo  Server started successfully^^!
    )
    echo.

    set "LAN_IP=127.0.0.1"
    for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
        for /f "tokens=1" %%b in ("%%a") do (
            if "%%b" neq "127.0.0.1" set "LAN_IP=%%b"
        )
    )

    set "TS_IP="
    where tailscale >nul 2>nul
    if %ERRORLEVEL% equ 0 (
        for /f "usebackq tokens=*" %%t in (`tailscale ip -4 2^>nul`) do (
            set "TS_IP=%%t"
        )
    )

    echo  Access from your Tablet, Phone, or Computer:
    echo  ---------------------------------------------------------------
    echo   -^> Home Wi-Fi URL     : http://!LAN_IP!:%PORT%
    if defined TS_IP (
        echo   -^> Remote / Tailscale : http://!TS_IP!:%PORT%
    )
    echo   -^> Local Machine      : http://localhost:%PORT%
    echo  ---------------------------------------------------------------
    echo  Features:
    echo   - Full Windows 11 Desktop UI with Window Manager
    echo   - Interactive Terminal with Antigravity (agy) ^& Touch Toolbar
    echo   - File Explorer with Upload, Download, Search, Thumbnails
    echo   - Notepad Code Editor with direct file saving
    echo   - Task Manager with real-time CPU, RAM, Disk ^& Battery monitor
    echo   - Custom Desktop Wallpapers ^& Mobile/Tablet Optimization
    echo.
    echo  Log file : %LOG_FILE%
    echo  To stop  : stop.bat
    echo =================================================================
) else (
    echo Failed to start server. Check logs in %LOG_FILE%:
    type "%LOG_FILE%" 2>nul
    exit /b 1
)
