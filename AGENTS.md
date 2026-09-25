# AGENTS.md — Instructions for AI Coding Assistants

This document provides architectural context, API contracts, codebase layout, and implementation guidelines for AI coding assistants (such as Google Antigravity, Cursor, GitHub Copilot, Claude, etc.) working on the **OSFiles** project.

---

## 🏗️ Architectural Overview

OSFiles is a lightweight web desktop environment built on a two-tier architecture designed to run on any Linux host without external database dependencies:

1. **Backend (`server.py`)**:
   - Single-file asynchronous server implemented with `aiohttp` on Python 3.10+.
   - Manages interactive pseudo-terminal (PTY) sessions via WebSockets.
   - Provides REST APIs for file operations, Notepad text saving/reading, system stats, wallpapers, and process management.
   - Implements Server-Sent Events (SSE) for multi-device live desktop state synchronization.
   - Serves static assets and provides inline/attachment file streaming.

2. **Frontend (`index.html`)**:
   - Zero-build, pure vanilla HTML5, CSS3, and modern JavaScript (ES6+).
   - Fully client-rendered Windows 11 Fluent UI desktop shell.
   - Centralized `WindowManager` handling window life-cycles, dragging, resizing, minimizing, and maximizing.
   - Built-in apps: File Explorer (`AppExplorer`), Terminal (xterm.js), Notepad, Task Manager, Settings/Wallpapers, and Antigravity AI.

---

## 📁 Codebase Map

| File / Folder | Purpose |
|---|---|
| [`server.py`](file:///home/genius/Desktop/OSFiles/server.py) | Main server backend, PTY management, REST endpoints, file streaming |
| [`index.html`](file:///home/genius/Desktop/OSFiles/index.html) | Complete frontend shell, window manager, and built-in applications |
| [`antigravity.html`](file:///home/genius/Desktop/OSFiles/antigravity.html) | Standalone Antigravity AI chat interface |
| [`start.sh`](file:///home/genius/Desktop/OSFiles/start.sh) | Process manager to launch unbuffered daemonized server with PID tracking |
| [`stop.sh`](file:///home/genius/Desktop/OSFiles/stop.sh) | Graceful process termination and port freeing script |
| [`setup_tailscale.sh`](file:///home/genius/Desktop/OSFiles/setup_tailscale.sh) | Automates remote access configuration via Tailscale |
| [`static/wallpapers/`](file:///home/genius/Desktop/OSFiles/static/wallpapers) | Default SVGs and user-uploaded custom wallpapers |
| [`static/vendor/xterm/`](file:///home/genius/Desktop/OSFiles/static/vendor/xterm) | Local offline bundle of xterm.js terminal emulator |

---

## 🛡️ Security & Path Sandboxing

All file operations in `server.py` **must** route through the `resolve(share, rel)` function:
- Pre-configured `SHARES` map to host directories: `Home`, `Desktop`, `Downloads`, `Documents`, `Pictures`, `Videos`, `Music`, and `Computer` (`/`).
- `relsafe(rel)` strips leading slashes, normalizes directory traverses (`..`), and checks that resolved real paths stay strictly within the target share's root boundary.
- **Rule for AI**: Never bypass `resolve()` when reading, writing, renaming, deleting, or streaming files.

---

## 📡 Key Server Endpoints

### File Operations
- `GET /api/shares`: Returns list of available storage shares and root indicators.
- `GET /api/list?share=<share>&path=<relpath>`: Returns JSON array of items with name, size, modified timestamp, and `directory` flag.
- `GET /view/{share}/{path:.*}`: Inline file viewing. Dispatches proper MIME types (images, PDFs, media, text) without forcing downloads. For HTML files, omits `Content-Disposition` so browsers render them natively as interactive webpages.
- `GET /download?share=<share>&path=<relpath>&dl=1`: Triggers attachment download with `Content-Disposition: attachment`.
- `POST /upload?share=<share>&path=<relpath>`: Multipart file upload handling multiple files.
- `POST /api/rename`: Body `{ share, path, new_name }`.
- `POST /api/delete`: Body `{ share, path }`.
- `POST /api/mkdir`: Body `{ share, path, name }`.

### Terminal & System
- `GET /ws/terminal`: WebSocket endpoint managing a spawned PTY child process (`pty.fork()`) with full environment and terminal resizing (`{"resize": {"cols": N, "rows": N}}`).
- `GET /api/system/stats`: Returns live CPU utilization percentage, RAM used/total, and disk usage.
- `GET /api/system/processes`: Returns active process table.
- `POST /api/system/kill`: Body `{ pid }`.

### Multi-Device State Sync
- `GET /api/session/state`: Returns current synced state (wallpaper, open windows).
- `POST /api/session/state`: Broadcasts updated state to connected devices.
- `GET /api/session/events`: Server-Sent Events (SSE) stream delivering real-time state changes.

---

## 🎨 Frontend Design Guidelines

1. **No Node / NPM Build Tools**:
   - All frontend code must remain directly runnable by standard web browsers without bundling or transpiling (e.g. no Webpack, Vite, React, or TypeScript build steps).
2. **Touch & Mobile Support**:
   - Long-press gestures are handled via `setupLongPressAndContextMenu(element, callback)`.
   - The global flag `suppressClickUntil` prevents accidental clicks/taps immediately after releasing a touch long-press.
   - Any newly created card, list row, or desktop icon should register `setupLongPressAndContextMenu` to guarantee consistent mobile tablet and phone UX.
3. **Inline Viewing vs. Downloading**:
   - Double-clicking or selecting "Open" on images, webpages, and PDFs must invoke `openInNewPage(share, path)`, opening the `/view/` route in a new tab (`_blank`).
   - File downloads must be explicitly triggered through the context menu ("Download file") calling `downloadFile(share, path)`.

---

## ➕ Adding a New Application to the Desktop

To add a new built-in application to the Windows Web OS shell:

1. **Add SVG Icon**: Define an icon in the `ICONS` object in `index.html`.
2. **Register App**: Add an entry to the `APPS` array:
   ```javascript
   {
     id: 'myapp',
     name: 'My Application',
     desc: 'Short description of what it does',
     icon: ICONS.myapp,
     open: (data) => WindowManager.open('myapp', data)
   }
   ```
3. **Mount App Body**: In `WindowManager.open(appId, data)`, attach the DOM rendering and event listeners to `winObj.el.querySelector('.win-body')` or create a modular handler object:
   ```javascript
   const AppMyApp = {
     mount(win, container) {
       container.innerHTML = `<div>...</div>`;
       return () => { /* cleanup on window close */ };
     }
   };
   ```
4. **Window Controls**: The `winObj` automatically receives minimize, maximize, close, drag, resize, and taskbar integration.
