@echo off
setlocal EnableDelayedExpansion

echo =================================================================
echo                 TAILSCALE REMOTE ACCESS SETUP                    
echo =================================================================
echo.

rem 1. Check if Tailscale is installed
where tailscale >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo -^> Tailscale is not detected in PATH.
    echo -^> Attempting installation via winget...
    where winget >nul 2>nul
    if !ERRORLEVEL! equ 0 (
        echo -^> Installing Tailscale via winget...
        winget install Tailscale.Tailscale --accept-source-agreements --accept-package-agreements
        echo -^> If installed, please open Tailscale or reopen terminal.
    ) else (
        echo -^> Winget not found. Please install Tailscale manually:
        echo    https://tailscale.com/download/windows
        echo.
        pause
        exit /b 1
    )
) else (
    echo -^> Tailscale is already installed.
)

rem 2. Start Tailscale
echo -^> Connecting to Tailscale network...
echo -^> If this is the first time, authenticate when the browser opens:
echo -----------------------------------------------------------------
tailscale up
echo -----------------------------------------------------------------

rem 3. Get Tailscale IP
set "TS_IP="
for /f "usebackq tokens=*" %%t in (`tailscale ip -4 2^>nul`) do (
    set "TS_IP=%%t"
)

if defined TS_IP (
    if "%PORT%"=="" set PORT=8000
    echo.
    echo =================================================================
    echo                    SETUP COMPLETE^^!                              
    echo =================================================================
    echo  Your Windows PC is now accessible from anywhere^^!
    echo.
    echo  1. Install the Tailscale app on your Phone and Tablet:
    echo     - iOS: App Store -^> Tailscale
    echo     - Android: Play Store -^> Tailscale
    echo.
    echo  2. Log in with the SAME account you just authenticated above.
    echo.
    echo  3. Turn Tailscale ON in your phone/tablet app.
    echo.
    echo  4. Open this URL in your phone or tablet browser from ANYWHERE:
    echo     -----------------------------------------------------------
    echo     http://!TS_IP!:%PORT%
    echo     -----------------------------------------------------------
    echo =================================================================
) else (
    echo Note: If authentication is pending, complete authentication in Tailscale.
)
