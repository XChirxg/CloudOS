#!/bin/bash
set -e

echo "================================================================="
echo "                TAILSCALE REMOTE ACCESS SETUP                    "
echo "================================================================="
echo

# 1. Check if Tailscale is installed
if ! command -v tailscale &>/dev/null; then
    echo "-> Installing Tailscale package..."
    sudo apt-get install -y tailscale
    echo "-> Tailscale installed successfully!"
    echo
else
    echo "-> Tailscale is already installed."
fi

# 2. Start Tailscale and generate login link
echo "-> Connecting to Tailscale network..."
echo "-> If this is the first time, click or copy the authentication link below:"
echo "-----------------------------------------------------------------"
sudo tailscale up --operator="$USER"
echo "-----------------------------------------------------------------"

# 3. Get Tailscale IP
TS_IP=$(tailscale ip -4 2>/dev/null || true)

if [ -n "$TS_IP" ]; then
    PORT="${PORT:-8000}"
    echo
    echo "================================================================="
    echo "                    SETUP COMPLETE!                              "
    echo "================================================================="
    echo " Your Linux PC is now accessible from anywhere!"
    echo
    echo " 1. Install the Tailscale app on your Phone and Tablet:"
    echo "    - iOS: App Store -> Tailscale"
    echo "    - Android: Play Store -> Tailscale"
    echo
    echo " 2. Log in with the SAME account you just authenticated above."
    echo
    echo " 3. Turn Tailscale ON in your phone/tablet app."
    echo
    echo " 4. Open this URL in your phone or tablet browser from ANYWHERE:"
    echo "    -----------------------------------------------------------"
    echo "    http://$TS_IP:$PORT"
    echo "    -----------------------------------------------------------"
    echo "================================================================="
else
    echo "Note: If authentication is pending, open the link printed above in your browser."
fi
