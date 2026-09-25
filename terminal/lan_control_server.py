#!/usr/bin/env python3
"""
Interactive LAN Terminal Server
Fixed with real PTY (pseudo-terminal) support & WebSocket streaming.
Supports Antigravity CLI (agy), bash, vim, htop, and all interactive programs.
"""

import os
import sys
import json
import asyncio
import struct
import signal
from aiohttp import web, WSMsgType

try:
    import pty
    import fcntl
    import termios
    HAVE_PTY = True
except ImportError:
    pty = None
    fcntl = None
    termios = None
    HAVE_PTY = False

PORT = int(os.environ.get("PORT", 8001))
HOST = "0.0.0.0"
HOME = os.path.expanduser("~")

INDEX = r"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Interactive Terminal - Remote Linux</title>
<link rel="stylesheet" href="/vendor/xterm.css">
<style>
:root {
  --bg: #141414;
  --surface: #1e1e1e;
  --border: #333;
  --accent: #4cc2ff;
  --text: #e0e0e0;
}
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
html, body { height: 100%; margin: 0; padding: 0; background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; overflow: hidden; }
.app-container { display: flex; flex-direction: column; height: 100vh; height: 100dvh; }
.top-bar {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  padding: 8px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  user-select: none;
}
.brand { display: flex; align-items: center; gap: 9px; font-weight: 600; font-size: 14px; }
.brand svg { width: 18px; height: 18px; fill: var(--accent); }
.status-pill { font-size: 11px; padding: 3px 8px; border-radius: 12px; background: rgba(76,194,255,0.15); color: var(--accent); }
.actions { display: flex; gap: 6px; }
.btn {
  background: #2a2a2a;
  border: 1px solid var(--border);
  color: #eee;
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
}
.btn:hover { background: #383838; }
.btn:active { background: #444; }
#terminal-container { flex: 1; padding: 6px; background: #0c0c0c; overflow: hidden; position: relative; }
.xterm { height: 100%; }
.xterm-viewport { overflow-y: auto !important; }

/* Touch Keyboard Helper Bar for Android Tablet & Phone */
.touch-toolbar {
  background: var(--surface);
  border-top: 1px solid var(--border);
  padding: 6px 8px;
  display: flex;
  gap: 5px;
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}
.touch-toolbar::-webkit-scrollbar { display: none; }
.tkey {
  background: #282828;
  border: 1px solid #3c3c3c;
  color: #e5e5e5;
  border-radius: 5px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 500;
  font-family: ui-monospace, monospace;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  touch-action: manipulation;
  flex-shrink: 0;
}
.tkey:active, .tkey.active { background: var(--accent); color: #000; }
.tkey.primary { background: #1a365d; border-color: #2b6cb0; color: #90cdf4; font-weight: 600; }
</style>
<script src="/vendor/xterm.js"></script>
<script src="/vendor/xterm-addon-fit.js"></script>
</head>
<body>
<div class="app-container">
  <div class="top-bar">
    <div class="brand">
      <svg viewBox="0 0 24 24"><path d="M4 17l6-6-6-6m8 14h8"/></svg>
      <span>Interactive Terminal</span>
      <span class="status-pill" id="conn-status">Connecting...</span>
    </div>
    <div class="actions">
      <button class="btn" onclick="sendCtrl('l')">Clear</button>
      <button class="btn" onclick="toggleFullscreen()">Fullscreen</button>
      <button class="btn" onclick="reconnect()">Reconnect</button>
    </div>
  </div>

  <div id="terminal-container"></div>

  <!-- Touch key bar for mobile & tablet -->
  <div class="touch-toolbar">
    <button class="tkey primary" onclick="sendInput('agy\n')">agy</button>
    <button class="tkey" onclick="sendInput('\x1b')">ESC</button>
    <button class="tkey" onclick="sendInput('\t')">TAB</button>
    <button class="tkey" onclick="sendCtrl('c')">Ctrl+C</button>
    <button class="tkey" onclick="sendCtrl('d')">Ctrl+D</button>
    <button class="tkey" onclick="sendCtrl('z')">Ctrl+Z</button>
    <button class="tkey" onclick="sendInput('\x1b[A')">▲</button>
    <button class="tkey" onclick="sendInput('\x1b[B')">▼</button>
    <button class="tkey" onclick="sendInput('\x1b[D')">◀</button>
    <button class="tkey" onclick="sendInput('\x1b[C')">▶</button>
    <button class="tkey" onclick="sendInput('|')">|</button>
    <button class="tkey" onclick="sendInput('~')">~</button>
    <button class="tkey" onclick="sendInput('-')">-</button>
    <button class="tkey" onclick="sendInput('/')">/</button>
  </div>
</div>

<script>
let term, fitAddon, ws;
const statusEl = document.getElementById('conn-status');

function initTerminal() {
  term = new Terminal({
    cursorBlink: true,
    fontFamily: 'Cascadia Code, Menlo, Monaco, Consolas, "Courier New", monospace',
    fontSize: 14,
    lineHeight: 1.2,
    theme: {
      background: '#0c0c0c',
      foreground: '#cccccc',
      cursor: '#4cc2ff',
      selectionBackground: '#264f78',
      black: '#000000', red: '#cd3131', green: '#0dbc79', yellow: '#e5e510',
      blue: '#2472c8', magenta: '#bc3fbc', cyan: '#11a8cd', white: '#e5e5e5',
      brightBlack: '#666666', brightRed: '#f14c4c', brightGreen: '#23d18b', brightYellow: '#f5f543',
      brightBlue: '#3b8eea', brightMagenta: '#d670d6', brightCyan: '#29b8db', brightWhite: '#ffffff'
    }
  });

  fitAddon = new FitAddon.FitAddon();
  term.loadAddon(fitAddon);
  term.open(document.getElementById('terminal-container'));

  setTimeout(() => {
    fitAddon.fit();
    connectWS();
  }, 100);

  window.addEventListener('resize', () => {
    fitAddon.fit();
    sendResize();
  });
}

function connectWS() {
  statusEl.textContent = 'Connecting...';
  statusEl.style.color = '#e5e510';
  
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${location.host}/ws`);
  ws.binaryType = 'arraybuffer';

  ws.onopen = () => {
    statusEl.textContent = 'Connected';
    statusEl.style.color = '#0dbc79';
    sendResize();
  };

  ws.onmessage = (e) => {
    if (e.data instanceof ArrayBuffer) {
      term.write(new Uint8Array(e.data));
    } else {
      term.write(e.data);
    }
  };

  ws.onclose = () => {
    statusEl.textContent = 'Disconnected';
    statusEl.style.color = '#cd3131';
    term.write('\r\n\x1b[31m[Session closed. Click Reconnect to restart.]\x1b[0m\r\n');
  };

  ws.onerror = () => {
    statusEl.textContent = 'Error';
    statusEl.style.color = '#cd3131';
  };

  term.onData(data => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
}

function sendResize() {
  if (ws && ws.readyState === WebSocket.OPEN && term) {
    ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
  }
}

function sendInput(str) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(str);
  }
  term.focus();
}

function sendCtrl(key) {
  const code = key.toLowerCase().charCodeAt(0) - 96;
  if (code > 0 && code <= 26) {
    sendInput(String.fromCharCode(code));
  }
}

function reconnect() {
  if (ws) { ws.close(); }
  term.reset();
  connectWS();
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(()=>{});
  } else {
    document.exitFullscreen().catch(()=>{});
  }
}

window.addEventListener('DOMContentLoaded', initTerminal);
</script>
</body>
</html>
"""

async def handle_index(request):
    return web.Response(text=INDEX, content_type="text/html")

async def handle_ws(request):
    ws = web.WebSocketResponse(heartbeat=25.0)
    await ws.prepare(request)

    if not HAVE_PTY:
        shell_cmd = os.environ.get("COMSPEC", "cmd.exe")
        env = os.environ.copy()
        try:
            proc = await asyncio.create_subprocess_exec(
                shell_cmd,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
                cwd=HOME,
                env=env,
            )
        except Exception as e:
            await ws.send_str(f"\r\nFailed to start shell: {e}\r\n")
            await ws.close()
            return ws

        async def win_stdout_to_ws():
            try:
                while not ws.closed and proc.returncode is None:
                    data = await proc.stdout.read(1024)
                    if not data:
                        break
                    await ws.send_bytes(data)
            except Exception:
                pass

        pipe_task = asyncio.create_task(win_stdout_to_ws())
        try:
            async for msg in ws:
                if msg.type == WSMsgType.TEXT:
                    if msg.data.startswith("{") and "resize" in msg.data:
                        continue
                    if proc.stdin and not proc.stdin.is_closing():
                        proc.stdin.write(msg.data.encode("utf-8", errors="replace"))
                        await proc.stdin.drain()
                elif msg.type == WSMsgType.BYTES:
                    if proc.stdin and not proc.stdin.is_closing():
                        proc.stdin.write(msg.data)
                        await proc.stdin.drain()
                elif msg.type in (WSMsgType.CLOSE, WSMsgType.CLOSING, WSMsgType.ERROR):
                    break
        except Exception:
            pass
        finally:
            pipe_task.cancel()
            if proc.returncode is None:
                try:
                    proc.terminate()
                except Exception:
                    pass
            if not ws.closed:
                await ws.close()
            return ws

    pid, master_fd = pty.fork()
    if pid == 0:
        env = os.environ.copy()
        env["TERM"] = "xterm-256color"
        env["COLORTERM"] = "truecolor"
        env["LANG"] = os.environ.get("LANG", "en_US.UTF-8")
        
        local_bin = os.path.expanduser("~/.local/bin")
        if local_bin not in env.get("PATH", ""):
            env["PATH"] = local_bin + ":" + env.get("PATH", "")
            
        try:
            os.chdir(HOME)
        except Exception:
            pass
            
        shell = os.environ.get("SHELL", "/bin/bash")
        try:
            os.execvpe(shell, [shell, "-l"], env)
        except Exception:
            os.execvpe("/bin/sh", ["/bin/sh"], env)
        sys.exit(1)

    fl = fcntl.fcntl(master_fd, fcntl.F_GETFL)
    fcntl.fcntl(master_fd, fcntl.F_SETFL, fl | os.O_NONBLOCK)

    loop = asyncio.get_running_loop()
    read_queue = asyncio.Queue()

    def on_master_readable():
        try:
            chunk = os.read(master_fd, 8192)
            if chunk:
                read_queue.put_nowait(chunk)
            else:
                read_queue.put_nowait(None)
        except (BlockingIOError, OSError):
            read_queue.put_nowait(None)

    loop.add_reader(master_fd, on_master_readable)

    async def pty_to_ws():
        try:
            while not ws.closed:
                data = await read_queue.get()
                if data is None:
                    break
                await ws.send_bytes(data)
        except Exception:
            pass

    pipe_task = asyncio.create_task(pty_to_ws())

    try:
        async for msg in ws:
            if msg.type == WSMsgType.TEXT:
                if msg.data.startswith("{") and "resize" in msg.data:
                    try:
                        p = json.loads(msg.data)
                        if p.get("type") == "resize":
                            cols = int(p.get("cols", 80))
                            rows = int(p.get("rows", 24))
                            fcntl.ioctl(
                                master_fd,
                                termios.TIOCSWINSZ,
                                struct.pack("HHHH", rows, cols, 0, 0),
                            )
                            continue
                    except Exception:
                        pass
                os.write(master_fd, msg.data.encode("utf-8", errors="replace"))
            elif msg.type == WSMsgType.BYTES:
                os.write(master_fd, msg.data)
            elif msg.type in (WSMsgType.CLOSE, WSMsgType.CLOSING, WSMsgType.ERROR):
                break
    except Exception:
        pass
    finally:
        pipe_task.cancel()
        try:
            loop.remove_reader(master_fd)
        except Exception:
            pass
        try:
            os.close(master_fd)
        except Exception:
            pass
        try:
            os.kill(pid, signal.SIGHUP)
            await asyncio.sleep(0.05)
            os.kill(pid, signal.SIGTERM)
            os.waitpid(pid, os.WNOHANG)
        except Exception:
            pass
        if not ws.closed:
            await ws.close()

    return ws

def main():
    app = web.Application()
    app.router.add_get("/", handle_index)
    app.router.add_get("/ws", handle_ws)
    
    # Vendor files from parent static directory
    static_vendor = os.path.realpath(os.path.join(os.path.dirname(__file__), "..", "static", "vendor", "xterm"))
    if os.path.isdir(static_vendor):
        app.router.add_static("/vendor", static_vendor, show_index=False)
        
    print(f"Interactive LAN Terminal Server starting on http://0.0.0.0:{PORT}")
    web.run_app(app, host=HOST, port=PORT, access_log=None)

if __name__ == "__main__":
    main()
