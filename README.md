# OSFiles (Windows like Web OS)

A lightweight, modern web-based desktop environment and remote management system for Linux. Access your Linux machine, terminal, files, and AI assistant from any browser on your phone, tablet, or PC over your local Wi-Fi or securely over Tailscale.

---

## 🌟 Key Features

### 📂 File Explorer
- **Smart Inline Viewing**: Double-click (or tap) images (`.png`, `.jpg`, `.webp`, `.svg`, etc.), webpages (`.html`, `.htm`), and PDFs (`.pdf`) to open and view them immediately in your browser without unwanted downloads.
- **Touch-Friendly Long Press & Right-Click Context Menu**: Long-press on touchscreens or right-click with a mouse to open the popup action menu with options to:
  - 📥 **Download file** directly to your client device.
  - 🌐 **Open in New Tab** for clean inline viewing.
  - 📝 **Edit in Notepad** for text, scripts, and web code.
  - 🎨 **Set as Desktop Wallpaper** (for images).
  - ✏️ **Rename** or 🗑️ **Delete** files and directories.
- **Multi-File Uploads**: Drag and drop or use the upload button to upload multiple files directly into any directory.
- **Folder Navigation**: Quick access sidebar (Home, Desktop, Downloads, Documents, Pictures, Videos, Music, and Computer root) with breadcrumbs navigation, history (Back/Forward), and live search filtering.
- **View Modes**: Toggle between responsive Grid view and Detailed List view.

### 🖥️ Interactive Web Terminal
- Full PTY terminal in your browser powered by **xterm.js** and WebSockets.
- Truecolor and 256-color support, dynamic terminal window resizing, and access to all installed Linux command-line tools (e.g., `bash`, `agy`, `tmux`, `htop`, `git`, `python`).

### 🤖 Antigravity AI Coding Partner
- Integrated AI coding partner application window with conversation history, persistent context, and real-time streaming responses.

### 📝 Notepad Text & Code Editor
- In-browser code and text editor with syntax font, line numbers, status indicators, and keyboard shortcuts (`Ctrl+S` / `Cmd+S` to save directly to the filesystem).

### 📊 Task Manager & System Monitor
- Live system resource monitor tracking real-time CPU usage, RAM utilization, and disk storage.
- Process manager listing active processes with PID, memory/CPU usage, and instant kill process controls.

### 🎨 Personalization & Dynamic Wallpapers
- Built-in wallpapers including Windows 11 Dark & Light bloom, Cyber Matrix, Midnight Nebula, Nature Sunset, and Slate Titanium.
- **Interactive Live Space Stars**: Dynamic interactive starfield animation.
- Custom wallpaper upload and URL download support.

### 🔄 Multi-Device Real-Time Sync
- Powered by Server-Sent Events (SSE) to sync wallpapers, window states, and active tasks in real time across mobile phones, tablets, and desktop browsers.

### 📱 Responsive Mobile & Tablet Experience
- Optimized touch controls, long-press contextual menus, fullscreen launcher, and adaptive window stacking.

---

## 📋 Prerequisites

- **Operating System**: Linux (Ubuntu, Debian, Fedora, Arch, Raspberry Pi OS, etc.)
- **Python**: Python 3.10 or higher
- **Network**: Local Area Network (Wi-Fi/Ethernet) and/or Tailscale for remote access

---

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/<your-username>/OSFiles.git
cd OSFiles
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```
*(Only `aiohttp>=3.9.0` is required; all other libraries are standard library modules).*

### 3. Start the Server
```bash
./start.sh
```
By default, the server runs on port `8000`. You can specify a custom port:
```bash
PORT=9000 ./start.sh
```

### 4. Open in Your Browser
- **On the host machine**: `http://localhost:8000`
- **On another phone/tablet/PC on the same Wi-Fi**: `http://<YOUR_LAN_IP>:8000`
- **Remotely via Tailscale**: `http://<YOUR_TAILSCALE_IP>:8000`

### 5. Stopping the Server
```bash
./stop.sh
```

---

## 🌐 Remote Access with Tailscale

To access your OSFiles desktop from anywhere in the world without port forwarding:

1. Install and authenticate Tailscale on your Linux host:
   ```bash
   ./setup_tailscale.sh
   ```
2. Get your host's Tailscale IP:
   ```bash
   tailscale ip -4
   ```
3. Connect to `http://<YOUR_TAILSCALE_IP>:8000` from any authorized device on your tailnet.

---

## ⚙️ Running as a Background System Service (systemd)

To ensure OSFiles automatically starts when your computer boots:

1. Create a systemd unit file `/etc/systemd/system/osfiles.service`:
   ```ini
   [Unit]
   Description=OSFiles Web Desktop Server
   After=network.target

   [Service]
   Type=simple
   User=YOUR_LINUX_USERNAME
   WorkingDirectory=/path/to/OSFiles
   ExecStart=/usr/bin/python3 -u /path/to/OSFiles/server.py
   Restart=always
   RestartSec=3
   Environment=PORT=8000

   [Install]
   WantedBy=multi-user.target
   ```
2. Enable and start the service:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now osfiles.service
   ```
3. Check status:
   ```bash
   sudo systemctl status osfiles.service
   ```

---

## 📁 Repository Structure

```
OSFiles/
├── server.py              # Asynchronous aiohttp backend (REST APIs, PTY, SSE, File Serving)
├── index.html             # Windows 11 Desktop shell, WindowManager, Explorer, Notepad, Task Manager
├── antigravity.html       # Antigravity AI coding assistant chat client
├── start.sh               # Server startup script with port detection and detachment
├── stop.sh                # Graceful server shutdown script
├── setup_tailscale.sh     # Tailscale helper configuration script
├── requirements.txt       # Python dependencies
├── .gitignore             # Git ignore file
├── README.md              # Project documentation
├── AGENTS.md              # Architecture reference & instructions for AI coding assistants
├── static/
│   ├── vendor/xterm/      # Offline xterm.js bundle for terminal emulation
│   └── wallpapers/        # Pre-installed high-definition desktop wallpapers
```

---

## 🤖 Instructions for AI Assistants

If you are developing or maintaining this project with an AI coding assistant (Antigravity, Cursor, Copilot, etc.), please refer to [`AGENTS.md`](./AGENTS.md) for detailed architecture maps, API endpoint schemas, and guidelines for adding new applications and features.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
