#!/usr/bin/env python3
"""
Windows Web OS - Remote Desktop Server
Unified backend supporting:
- Windows 11 Web Desktop Shell
- Interactive PTY Terminal via WebSockets (xterm.js)
- Full File Explorer APIs (browse, stream, upload, download, rename, delete)
- Notepad Code & Text Editor APIs
- Task Manager & System Performance Monitoring
- Wallpaper & Personalization Management
"""

import os
import sys
import platform
import json
import asyncio
import struct
import signal
import shutil
import urllib.parse
import mimetypes
import posixpath
import glob
import subprocess
import aiohttp
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

# Ensure all standard web, media and document types are properly recognized
mimetypes.add_type("image/webp", ".webp")
mimetypes.add_type("image/avif", ".avif")
mimetypes.add_type("image/svg+xml", ".svg")
mimetypes.add_type("image/jpeg", ".jpg")
mimetypes.add_type("image/jpeg", ".jpeg")
mimetypes.add_type("image/png", ".png")
mimetypes.add_type("image/gif", ".gif")
mimetypes.add_type("image/bmp", ".bmp")
mimetypes.add_type("image/x-icon", ".ico")
mimetypes.add_type("application/pdf", ".pdf")
mimetypes.add_type("text/html", ".html")
mimetypes.add_type("text/html", ".htm")
mimetypes.add_type("text/html", ".xhtml")
mimetypes.add_type("text/css", ".css")
mimetypes.add_type("text/javascript", ".js")
mimetypes.add_type("application/json", ".json")
mimetypes.add_type("text/plain", ".txt")
mimetypes.add_type("text/plain", ".sh")
mimetypes.add_type("text/plain", ".py")
mimetypes.add_type("text/plain", ".log")
mimetypes.add_type("text/markdown", ".md")
mimetypes.add_type("video/mp4", ".mp4")
mimetypes.add_type("video/webm", ".webm")
mimetypes.add_type("audio/mpeg", ".mp3")
mimetypes.add_type("audio/ogg", ".ogg")
mimetypes.add_type("audio/wav", ".wav")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
HTML_FILE = os.path.join(BASE_DIR, "index.html")

PORT = int(os.environ.get("PORT", 8000))
HOST = "0.0.0.0"

HOME = os.path.expanduser("~")

# Shares configuration
_QUICK = [
    ("Home", HOME),
    ("Desktop", os.path.join(HOME, "Desktop")),
    ("Downloads", os.path.join(HOME, "Downloads")),
    ("Documents", os.path.join(HOME, "Documents")),
    ("Pictures", os.path.join(HOME, "Pictures")),
    ("Videos", os.path.join(HOME, "Videos")),
    ("Music", os.path.join(HOME, "Music")),
]
SHARES = {}
SHARE_ORDER = []
for name, p in _QUICK:
    rp = os.path.realpath(p)
    if os.path.isdir(rp):
        SHARES[name] = rp
        SHARE_ORDER.append(name)
if os.name == "nt":
    drive = os.path.splitdrive(HOME)[0] or "C:"
    SHARES["Computer"] = os.path.realpath(drive + "\\")
else:
    SHARES["Computer"] = os.path.realpath("/")
SHARE_ORDER.append("Computer")

def relsafe(p):
    p = p.replace("\\", "/")
    p = posixpath.normpath(p)
    if p in ("", "."):
        return ""
    if p.startswith("/") or p == ".." or p.startswith("../") or "/../" in p:
        raise ValueError("Invalid relative path")
    return p

def resolve(share, rel=""):
    if share not in SHARES:
        raise ValueError(f"Unknown share: {share}")
    root = SHARES[share]
    clean_rel = relsafe(rel)
    p = os.path.realpath(os.path.join(root, clean_rel))
    root_prefix = root if root.endswith(os.sep) else root + os.sep
    if p != root and not p.startswith(root_prefix):
        raise ValueError("Path outside share boundary")
    return p

def safe_name(n):
    n = os.path.basename(n.replace("\\", "/")).strip()
    if not n or n in (".", "..") or "/" in n:
        raise ValueError("Invalid file name")
    return n

# CPU stats background sampler
cpu_stats = {
    "percent": 0.0,
    "prev_idle": 0.0,
    "prev_total": 0.0,
}

async def cpu_sampler():
    while True:
        try:
            with open("/proc/stat") as f:
                fields = [float(x) for x in f.readline().strip().split()[1:]]
            idle, total = fields[3], sum(fields)
            if cpu_stats["prev_total"] > 0:
                di = idle - cpu_stats["prev_idle"]
                dt = total - cpu_stats["prev_total"]
                if dt > 0:
                    cpu_stats["percent"] = round(100.0 * (1.0 - (di / dt)), 1)
            cpu_stats["prev_idle"] = idle
            cpu_stats["prev_total"] = total
        except Exception:
            pass
        await asyncio.sleep(1.5)

# --- Routes ---

async def handle_index(request):
    return web.FileResponse(HTML_FILE)

# Terminal WebSocket handler
async def handle_ws_terminal(request):
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

    # Spawn PTY (Unix / Linux)
    pid, master_fd = pty.fork()
    if pid == 0:
        # Child process
        env = os.environ.copy()
        env["TERM"] = "xterm-256color"
        env["COLORTERM"] = "truecolor"
        env["LANG"] = os.environ.get("LANG", "en_US.UTF-8")
        
        # Ensure ~/.local/bin is in PATH for agy and other user CLIs
        local_bin = os.path.expanduser("~/.local/bin")
        if local_bin not in env.get("PATH", ""):
            env["PATH"] = local_bin + ":" + env.get("PATH", "")
        
        # Set working directory to user Home
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

    # Parent process
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
                # Check for resize control JSON
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

# Shares
async def handle_shares(request):
    return web.json_response([{"name": n, "root": n == "Computer"} for n in SHARE_ORDER])

# List directory
async def handle_list(request):
    q = request.query
    share = q.get("share", "")
    rel = q.get("path", "")
    try:
        cur = resolve(share, rel)
    except Exception:
        return web.Response(text="Invalid path", status=400)

    if not os.path.isdir(cur):
        return web.Response(text="Not a directory", status=404)

    try:
        names = os.listdir(cur)
    except PermissionError:
        return web.Response(text="Permission denied", status=403)
    except OSError as e:
        return web.Response(text=str(e), status=500)

    items = []
    for n in sorted(names, key=lambda s: (not os.path.isdir(os.path.join(cur, s)), s.lower())):
        p = os.path.join(cur, n)
        try:
            st = os.lstat(p)
            is_dir = os.path.isdir(p)
            items.append({
                "name": n,
                "path": os.path.relpath(p, SHARES[share]).replace(os.sep, "/"),
                "directory": is_dir,
                "size": st.st_size if not is_dir else None,
                "mtime": st.st_mtime,
            })
        except OSError:
            continue

    return web.json_response(items)

# Helper to serve a file for download or inline viewing
async def serve_file_response(request, share, rel, force_dl=False):
    try:
        p = resolve(share, rel)
    except Exception:
        return web.Response(text="Invalid path", status=400)

    if not os.path.isfile(p):
        return web.Response(text="File not found", status=404)

    name = os.path.basename(p)
    ext = os.path.splitext(p)[1].lower()
    is_html = ext in (".html", ".htm", ".xhtml")

    ascii_name = name.encode("ascii", "replace").decode("ascii").replace('"', "")
    encoded_name = urllib.parse.quote(name, encoding="utf-8")

    headers = {
        "Cache-Control": "public, max-age=3600",
    }

    if force_dl:
        headers["Content-Disposition"] = f'attachment; filename="{ascii_name}"; filename*=UTF-8\'\'{encoded_name}'
    else:
        # Inline viewing: do not force download
        # For HTML/webpages, avoid Content-Disposition so browsers render them natively without download prompts
        if not is_html:
            headers["Content-Disposition"] = f'inline; filename="{ascii_name}"; filename*=UTF-8\'\'{encoded_name}'

    return web.FileResponse(p, headers=headers)

# Download / Stream file by query parameter (?share=...&path=...&dl=1)
async def handle_download(request):
    q = request.query
    share = q.get("share", "")
    rel = q.get("path", "")
    force_dl = q.get("dl", "0") == "1"
    return await serve_file_response(request, share, rel, force_dl=force_dl)

# Inline view route (/view/{share}/{path:.*})
async def handle_view(request):
    share = request.match_info.get("share", "")
    rel = request.match_info.get("path", "")
    force_dl = request.query.get("dl", "0") == "1"
    return await serve_file_response(request, share, rel, force_dl=force_dl)

# Multipart Upload
async def handle_upload(request):
    q = request.query
    share = q.get("share", "")
    rel = q.get("path", "")
    try:
        target = resolve(share, rel)
    except Exception:
        return web.Response(text="Invalid path", status=400)

    if not os.path.isdir(target):
        return web.Response(text="Target is not a directory", status=404)

    reader = await request.multipart()
    count = 0
    while True:
        part = await reader.next()
        if part is None:
            break
        if part.filename:
            try:
                fn = safe_name(part.filename)
            except ValueError:
                continue
            dest = os.path.join(target, fn)
            with open(dest, "wb") as f:
                while True:
                    chunk = await part.read_chunk()
                    if not chunk:
                        break
                    f.write(chunk)
            count += 1

    return web.json_response({"ok": True, "count": count})

# Rename
async def handle_rename(request):
    try:
        d = await request.json()
        share = d["share"]
        p = resolve(share, d["path"])
        new = safe_name(d["new_name"])
        dest = os.path.join(os.path.dirname(p), new)
        if os.path.exists(dest):
            return web.Response(text="A file or folder with that name already exists.", status=409)
        os.rename(p, dest)
        return web.json_response({"ok": True})
    except ValueError as e:
        return web.Response(text=str(e), status=400)
    except Exception as e:
        return web.Response(text=str(e), status=500)

# Delete
async def handle_delete(request):
    try:
        d = await request.json()
        p = resolve(d["share"], d["path"])
        if os.path.isdir(p):
            shutil.rmtree(p)
        else:
            os.remove(p)
        return web.json_response({"ok": True})
    except ValueError as e:
        return web.Response(text=str(e), status=400)
    except Exception as e:
        return web.Response(text=str(e), status=500)

# Make directory
async def handle_mkdir(request):
    try:
        d = await request.json()
        folder = resolve(d["share"], d.get("path", ""))
        name = safe_name(d.get("name", "New Folder"))
        target = os.path.join(folder, name)
        if os.path.exists(target):
            return web.Response(text="Directory already exists", status=409)
        os.makedirs(target, exist_ok=False)
        return web.json_response({"ok": True, "name": name})
    except Exception as e:
        return web.Response(text=str(e), status=400)

# File Read for Notepad
async def handle_file_read(request):
    q = request.query
    share = q.get("share", "")
    rel = q.get("path", "")
    try:
        p = resolve(share, rel)
    except Exception:
        return web.Response(text="Invalid path", status=400)

    if not os.path.isfile(p):
        return web.Response(text="File not found", status=404)

    # Prevent reading enormous binary files into the editor
    if os.path.getsize(p) > 8 * 1024 * 1024:
        return web.Response(text="File is too large (>8MB) for Notepad", status=400)

    try:
        with open(p, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
        return web.json_response({
            "ok": True,
            "name": os.path.basename(p),
            "size": os.path.getsize(p),
            "content": content
        })
    except Exception as e:
        return web.Response(text=str(e), status=500)

# File Save for Notepad
async def handle_file_save(request):
    try:
        d = await request.json()
        share = d["share"]
        rel = d["path"]
        content = d.get("content", "")
        p = resolve(share, rel)
        with open(p, "w", encoding="utf-8") as f:
            f.write(content)
        return web.json_response({"ok": True, "size": len(content.encode("utf-8"))})
    except Exception as e:
        return web.Response(text=str(e), status=500)

# System Stats API
async def handle_system_stats(request):
    # Memory
    total_mem = 0
    used_mem = 0
    try:
        with open("/proc/meminfo") as f:
            mem = {}
            for line in f:
                parts = line.split(":")
                if len(parts) == 2:
                    mem[parts[0].strip()] = int(parts[1].split()[0])
        total_mem = mem.get("MemTotal", 0) * 1024
        avail_mem = mem.get("MemAvailable", 0) * 1024
        used_mem = total_mem - avail_mem
    except Exception:
        pass

    if total_mem == 0 and os.name == "nt":
        try:
            import ctypes
            class MEMORYSTATUSEX(ctypes.Structure):
                _fields_ = [
                    ("dwLength", ctypes.c_ulong),
                    ("dwMemoryLoad", ctypes.c_ulong),
                    ("ullTotalPhys", ctypes.c_ulonglong),
                    ("ullAvailPhys", ctypes.c_ulonglong),
                    ("ullTotalPageFile", ctypes.c_ulonglong),
                    ("ullAvailPageFile", ctypes.c_ulonglong),
                    ("ullTotalVirtual", ctypes.c_ulonglong),
                    ("ullAvailVirtual", ctypes.c_ulonglong),
                    ("sullAvailExtendedVirtual", ctypes.c_ulonglong),
                ]
            stat = MEMORYSTATUSEX()
            stat.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
            ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(stat))
            total_mem = stat.ullTotalPhys
            avail_mem = stat.ullAvailPhys
            used_mem = total_mem - avail_mem
        except Exception:
            pass

    # Disk
    root_path = SHARES.get("Computer", HOME)
    du = shutil.disk_usage(root_path)

    # Uptime
    uptime = 0
    try:
        with open("/proc/uptime") as f:
            uptime = float(f.read().split()[0])
    except Exception:
        if os.name == "nt":
            try:
                import ctypes
                uptime = ctypes.windll.kernel32.GetTickCount64() / 1000.0
            except Exception:
                pass

    # Battery
    bat_info = None
    bats = glob.glob("/sys/class/power_supply/BAT*")
    if bats:
        try:
            with open(os.path.join(bats[0], "capacity")) as f:
                cap = int(f.read().strip())
            with open(os.path.join(bats[0], "status")) as f:
                st = f.read().strip()
            bat_info = {"capacity": cap, "status": st}
        except Exception:
            pass

    hostname = platform.node()
    kernel = platform.release()
    arch = platform.machine()

    return web.json_response({
        "hostname": hostname,
        "kernel": kernel,
        "arch": arch,
        "uptime": uptime,
        "cpu_percent": cpu_stats["percent"],
        "memory": {
            "total": total_mem,
            "used": used_mem,
            "percent": round(used_mem / total_mem * 100, 1) if total_mem else 0,
        },
        "disk": {
            "total": du.total,
            "used": du.used,
            "free": du.free,
            "percent": round(du.used / du.total * 100, 1),
        },
        "battery": bat_info,
    })

# System Processes
async def handle_system_processes(request):
    try:
        if os.name == "nt":
            p = subprocess.run(
                ["tasklist", "/FO", "CSV", "/NH"],
                capture_output=True, text=True, timeout=3
            )
            procs = []
            for l in p.stdout.strip().splitlines()[:35]:
                parts = [x.strip(' "') for x in l.split('","')]
                if len(parts) >= 5:
                    procs.append({
                        "pid": parts[1],
                        "user": "User",
                        "cpu": "0.0",
                        "mem": parts[4],
                        "name": parts[0]
                    })
            return web.json_response(procs)
        else:
            p = subprocess.run(
                ["ps", "-eo", "pid,user,%cpu,%mem,comm", "--sort=-%cpu"],
                capture_output=True, text=True, timeout=3
            )
            lines = p.stdout.strip().split("\n")
            procs = []
            if len(lines) > 1:
                for l in lines[1:36]:
                    parts = l.strip().split(None, 4)
                    if len(parts) >= 5:
                        procs.append({
                            "pid": parts[0],
                            "user": parts[1],
                            "cpu": parts[2],
                            "mem": parts[3],
                            "name": parts[4]
                        })
            return web.json_response(procs)
    except Exception as e:
        return web.Response(text=str(e), status=500)

# Process Kill
async def handle_process_kill(request):
    try:
        d = await request.json()
        pid = int(d.get("pid", 0))
        if pid <= 1:
            return web.Response(text="Cannot kill system process", status=400)
        if os.name == "nt":
            subprocess.run(["taskkill", "/F", "/PID", str(pid)], capture_output=True)
        else:
            os.kill(pid, signal.SIGTERM)
        return web.json_response({"ok": True})
    except Exception as e:
        return web.Response(text=str(e), status=500)

# Wallpapers list
async def handle_wallpapers(request):
    wall_dir = os.path.join(STATIC_DIR, "wallpapers")
    wps = []
    if os.path.isdir(wall_dir):
        for f in sorted(os.listdir(wall_dir)):
            if f.endswith((".svg", ".jpg", ".jpeg", ".png", ".webp")):
                name = os.path.splitext(f)[0].replace("-", " ").title()
                wps.append({
                    "id": f,
                    "title": name,
                    "url": f"/static/wallpapers/{f}"
                })
    return web.json_response(wps)

# ================= SESSION STATE & MULTI-DEVICE SYNC =================
SESSION_FILE = os.path.join(BASE_DIR, "session_state.json")

DEFAULT_SESSION = {
    "wallpaper": "/static/wallpapers/win11-bloom-dark.svg",
    "is_live_wallpaper": False,
    "windows": [
        {"appId": "antigravity", "data": None, "maximized": True}
    ],
    "active_app": "antigravity",
    "antigravity": {
        "conversation_id": None,
        "cwd": os.path.join(HOME, "Desktop")
    },
    "notepad": {
        "share": "",
        "path": "",
        "name": ""
    }
}

def load_session_state():
    if os.path.isfile(SESSION_FILE):
        try:
            with open(SESSION_FILE, "r", encoding="utf-8") as f:
                st = json.load(f)
                merged = dict(DEFAULT_SESSION)
                merged.update(st)
                return merged
        except Exception:
            pass
    return dict(DEFAULT_SESSION)

def save_session_state(st):
    try:
        tmp = SESSION_FILE + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(st, f, indent=2)
        os.replace(tmp, SESSION_FILE)
    except Exception as e:
        print("Error saving session state:", e)

async def broadcast_session_state(app, state):
    clients = app.get("sse_clients", set())
    if not clients:
        return
    msg = f"data: {json.dumps(state)}\n\n".encode("utf-8")
    dead = set()
    for q in list(clients):
        try:
            await q.put(msg)
        except Exception:
            dead.add(q)
    for d in dead:
        clients.discard(d)

async def handle_session_get(request):
    state = load_session_state()
    return web.json_response(state)

async def handle_session_post(request):
    try:
        data = await request.json()
    except Exception:
        return web.Response(text="Invalid JSON", status=400)
    state = load_session_state()
    state.update(data)
    save_session_state(state)
    await broadcast_session_state(request.app, state)
    return web.json_response(state)

async def handle_session_events(request):
    resp = web.StreamResponse(
        status=200,
        headers={
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*"
        }
    )
    await resp.prepare(request)
    q = asyncio.Queue()
    request.app["sse_clients"].add(q)

    # Immediately send the current state
    state = load_session_state()
    initial_msg = f"data: {json.dumps(state)}\n\n".encode("utf-8")
    try:
        await resp.write(initial_msg)
        while True:
            msg = await q.get()
            await resp.write(msg)
    except (asyncio.CancelledError, ConnectionResetError):
        pass
    finally:
        request.app["sse_clients"].discard(q)
    return resp

# Upload custom wallpaper
async def handle_upload_wallpaper(request):
    wall_dir = os.path.join(STATIC_DIR, "wallpapers")
    os.makedirs(wall_dir, exist_ok=True)
    try:
        reader = await request.multipart()
        part = await reader.next()
        if not part or not part.filename:
            return web.json_response({"ok": False, "error": "No file provided"}, status=400)
        
        clean_name = "custom_" + safe_name(part.filename)
        dest = os.path.join(wall_dir, clean_name)
        with open(dest, "wb") as f:
            while True:
                chunk = await part.read_chunk()
                if not chunk:
                    break
                f.write(chunk)

        url = f"/static/wallpapers/{clean_name}"
        st = load_session_state()
        st["wallpaper"] = url
        st["is_live_wallpaper"] = False
        save_session_state(st)
        await broadcast_session_state(request.app, st)

        return web.json_response({
            "ok": True,
            "url": url,
            "id": clean_name,
            "title": clean_name
        })
    except Exception as e:
        return web.json_response({"ok": False, "error": str(e)}, status=500)

# Set wallpaper from external URL (downloads locally to eliminate CORS and black screens)
async def handle_download_wallpaper_url(request):
    try:
        d = await request.json()
        raw_url = str(d.get("url", "")).strip()
        if not raw_url or not (raw_url.startswith("http://") or raw_url.startswith("https://")):
            return web.json_response({"ok": False, "error": "Please provide a valid http or https image URL."}, status=400)

        import hashlib
        url_hash = hashlib.md5(raw_url.encode("utf-8")).hexdigest()[:12]

        timeout = aiohttp.ClientTimeout(total=20)
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        async with aiohttp.ClientSession(headers=headers, timeout=timeout) as session:
            async with session.get(raw_url) as resp:
                if resp.status != 200:
                    return web.json_response({"ok": False, "error": f"Failed to load image (HTTP {resp.status})"}, status=400)
                content_type = resp.headers.get("Content-Type", "").lower()
                data = await resp.read()
                if len(data) < 100:
                    return web.json_response({"ok": False, "error": "Downloaded file is empty or not an image."}, status=400)

        ext = ".jpg"
        if "png" in content_type or raw_url.lower().endswith(".png"): ext = ".png"
        elif "webp" in content_type or raw_url.lower().endswith(".webp"): ext = ".webp"
        elif "svg" in content_type or raw_url.lower().endswith(".svg"): ext = ".svg"
        elif "gif" in content_type or raw_url.lower().endswith(".gif"): ext = ".gif"

        wall_dir = os.path.join(STATIC_DIR, "wallpapers")
        os.makedirs(wall_dir, exist_ok=True)
        clean_name = f"url_wallpaper_{url_hash}{ext}"
        dest = os.path.join(wall_dir, clean_name)
        with open(dest, "wb") as f:
            f.write(data)

        local_url = f"/static/wallpapers/{clean_name}"
        st = load_session_state()
        st["wallpaper"] = local_url
        st["is_live_wallpaper"] = False
        save_session_state(st)
        await broadcast_session_state(request.app, st)

        return web.json_response({
            "ok": True,
            "url": local_url,
            "id": clean_name,
            "title": "Online Wallpaper"
        })
    except Exception as e:
        return web.json_response({"ok": False, "error": f"Error fetching image: {str(e)}"}, status=500)

# ================= ANTIGRAVITY CONVERSATION HISTORY =================
async def handle_antigravity_conversations(request):
    brain_dir = os.path.expanduser("~/.gemini/antigravity-cli/brain")
    convs = []
    if os.path.isdir(brain_dir):
        for entry in os.scandir(brain_dir):
            if entry.is_dir():
                log_file = os.path.join(entry.path, ".system_generated", "logs", "transcript.jsonl")
                if os.path.isfile(log_file):
                    try:
                        st = os.stat(log_file)
                        mtime = st.st_mtime
                        first_prompt = ""
                        msg_count = 0
                        with open(log_file, "r", encoding="utf-8", errors="replace") as f:
                            for line in f:
                                line = line.strip()
                                if not line:
                                    continue
                                try:
                                    obj = json.loads(line)
                                    msg_count += 1
                                    if not first_prompt and obj.get("type") == "USER_INPUT":
                                        c = obj.get("content", "")
                                        if "<USER_REQUEST>" in c:
                                            c = c.split("<USER_REQUEST>")[1].split("</USER_REQUEST>")[0].strip()
                                        first_prompt = c[:120]
                                except Exception:
                                    pass
                        convs.append({
                            "id": entry.name,
                            "title": first_prompt or f"Conversation {entry.name[:8]}",
                            "mtime": mtime,
                            "messages": msg_count
                        })
                    except Exception:
                        pass
    convs.sort(key=lambda x: x["mtime"], reverse=True)
    return web.json_response(convs)

async def handle_antigravity_conversation_get(request):
    conv_id = request.match_info.get("id", "").strip()
    if not conv_id or "/" in conv_id or "\\" in conv_id or ".." in conv_id:
        return web.Response(text="Invalid id", status=400)
    
    log_file = os.path.expanduser(f"~/.gemini/antigravity-cli/brain/{conv_id}/.system_generated/logs/transcript.jsonl")
    if not os.path.isfile(log_file):
        return web.Response(text="Conversation not found", status=404)

    messages = []
    title = ""
    try:
        with open(log_file, "r", encoding="utf-8", errors="replace") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                    t = obj.get("type")
                    if t == "USER_INPUT":
                        c = obj.get("content", "")
                        if "<USER_REQUEST>" in c:
                            c = c.split("<USER_REQUEST>")[1].split("</USER_REQUEST>")[0].strip()
                        if not title:
                            title = c[:120]
                        messages.append({
                            "role": "user",
                            "text": c,
                            "time": obj.get("created_at")
                        })
                    elif t == "PLANNER_RESPONSE":
                        c = obj.get("content", "")
                        if c:
                            messages.append({
                                "role": "assistant",
                                "text": c,
                                "time": obj.get("created_at")
                            })
                except Exception:
                    pass
    except Exception as e:
        return web.Response(text=str(e), status=500)

    return web.json_response({
        "id": conv_id,
        "title": title or f"Conversation {conv_id[:8]}",
        "messages": messages
    })

async def handle_antigravity_conversation_delete(request):
    try:
        d = await request.json()
        conv_id = d.get("id", "").strip()
        if not conv_id or "/" in conv_id or "\\" in conv_id or ".." in conv_id:
            return web.json_response({"ok": False, "error": "Invalid ID"}, status=400)
        conv_dir = os.path.expanduser(f"~/.gemini/antigravity-cli/brain/{conv_id}")
        if os.path.isdir(conv_dir):
            shutil.rmtree(conv_dir, ignore_errors=True)
        return web.json_response({"ok": True})
    except Exception as e:
        return web.json_response({"ok": False, "error": str(e)}, status=500)
            
# Antigravity HTML Page
async def handle_antigravity_page(request):
    antigravity_file = os.path.join(BASE_DIR, "antigravity.html")
    if os.path.isfile(antigravity_file):
        return web.FileResponse(antigravity_file)
    return web.Response(text="antigravity.html not found", status=404)

# Antigravity SSE Streaming Endpoint
async def handle_antigravity_stream(request):
    try:
        d = await request.json()
    except Exception:
        d = {}

    prompt = str(d.get("prompt", "")).strip()
    if not prompt:
        return web.Response(text="Empty prompt", status=400)

    conversation_id = str(d.get("conversation_id", "")).strip()
    cwd = str(d.get("cwd", os.path.join(HOME, "Desktop"))).strip()
    auto_approve = bool(d.get("auto_approve", True))

    if not os.path.isdir(cwd):
        cwd = os.path.join(HOME, "Desktop")
        if not os.path.isdir(cwd):
            cwd = HOME

    cmd = [
        os.path.expanduser("~/.local/bin/agy"),
        "--input-format", "text",
        "--output-format", "stream-json"
    ]
    if auto_approve:
        cmd.append("--dangerously-skip-permissions")
    if conversation_id:
        cmd.extend(["--conversation", conversation_id])
    cmd.extend(["-p", prompt])

    resp = web.StreamResponse(
        status=200,
        reason='OK',
        headers={
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        }
    )
    await resp.prepare(request)

    env = os.environ.copy()
    env["TERM"] = "xterm-256color"
    local_bin = os.path.expanduser("~/.local/bin")
    if local_bin not in env.get("PATH", ""):
        env["PATH"] = local_bin + ":" + env.get("PATH", "")

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        cwd=cwd,
        env=env,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )

    full_response = ""
    active_conv_id = conversation_id

    try:
        while True:
            line = await proc.stdout.readline()
            if not line:
                break
            line_str = line.decode("utf-8", errors="replace").strip()
            if not line_str:
                continue
            try:
                ev = json.loads(line_str)
                ev_type = ev.get("event")
                if ev_type == "init":
                    active_conv_id = ev.get("conversation_id", active_conv_id)
                    await resp.write(f"data: {json.dumps({'type': 'init', 'conversation_id': active_conv_id})}\n\n".encode())
                elif ev_type == "step_update":
                    step = ev.get("step_update", {})
                    text_delta = step.get("text_delta", "")
                    step_type = step.get("step_type", "")
                    if text_delta:
                        full_response += text_delta
                        await resp.write(f"data: {json.dumps({'type': 'delta', 'delta': text_delta})}\n\n".encode())
                    if step_type and step_type != "agent_response":
                        await resp.write(f"data: {json.dumps({'type': 'tool', 'step_type': step_type, 'state': step.get('state')})}\n\n".encode())
                elif ev_type == "result":
                    res = ev.get("result", {})
                    active_conv_id = res.get("conversation_id", active_conv_id)
                    res_text = res.get("response", "") or full_response
                    await resp.write(f"data: {json.dumps({'type': 'done', 'response': res_text, 'conversation_id': active_conv_id, 'usage': res.get('usage')})}\n\n".encode())
                    if active_conv_id:
                        st = load_session_state()
                        if st.get("antigravity", {}).get("conversation_id") != active_conv_id:
                            st.setdefault("antigravity", {})["conversation_id"] = active_conv_id
                            save_session_state(st)
                            asyncio.create_task(broadcast_session_state(request.app, st))
            except json.JSONDecodeError:
                pass

        await proc.wait()
        await resp.write(b"data: {\"type\": \"end\"}\n\n")
    except (asyncio.CancelledError, ConnectionResetError):
        try:
            proc.terminate()
        except Exception:
            pass
    finally:
        try:
            if proc.returncode is None:
                proc.kill()
        except Exception:
            pass

    return resp

def init_app():
    app = web.Application()
    app["sse_clients"] = set()
    
    # Background task for CPU sampling
    async def start_background_tasks(app):
        app["cpu_task"] = asyncio.create_task(cpu_sampler())

    async def cleanup_background_tasks(app):
        app["cpu_task"].cancel()
        await app["cpu_task"]

    app.on_startup.append(start_background_tasks)
    app.on_cleanup.append(cleanup_background_tasks)

    # Routes
    app.router.add_get("/", handle_index)
    app.router.add_get("/antigravity", handle_antigravity_page)
    app.router.add_post("/api/antigravity/stream", handle_antigravity_stream)
    app.router.add_get("/ws/terminal", handle_ws_terminal)
    
    # File Explorer
    app.router.add_get("/api/shares", handle_shares)
    app.router.add_get("/api/list", handle_list)
    app.router.add_get("/download", handle_download)
    app.router.add_get("/view/{share}/{path:.*}", handle_view)
    app.router.add_post("/upload", handle_upload)
    app.router.add_post("/api/rename", handle_rename)
    app.router.add_post("/api/delete", handle_delete)
    app.router.add_post("/api/mkdir", handle_mkdir)
    
    # Notepad
    app.router.add_get("/api/file/read", handle_file_read)
    app.router.add_post("/api/file/save", handle_file_save)
    
    # System
    app.router.add_get("/api/system/stats", handle_system_stats)
    app.router.add_get("/api/system/processes", handle_system_processes)
    app.router.add_post("/api/system/kill", handle_process_kill)
    
    # Wallpapers
    app.router.add_get("/api/wallpapers", handle_wallpapers)
    app.router.add_post("/upload/wallpaper", handle_upload_wallpaper)
    app.router.add_post("/api/wallpaper/download_url", handle_download_wallpaper_url)

    # Multi-device session & real-time LAN sync
    app.router.add_get("/api/session/state", handle_session_get)
    app.router.add_post("/api/session/state", handle_session_post)
    app.router.add_get("/api/session/events", handle_session_events)

    # Antigravity conversation history
    app.router.add_get("/api/antigravity/conversations", handle_antigravity_conversations)
    app.router.add_get("/api/antigravity/conversation/{id}", handle_antigravity_conversation_get)
    app.router.add_post("/api/antigravity/conversation/delete", handle_antigravity_conversation_delete)

    # Static assets
    app.router.add_static("/static", STATIC_DIR, show_index=False)

    return app

if __name__ == "__main__":
    app = init_app()
    print(f"Starting Windows Web OS on port {PORT}...")
    web.run_app(app, host=HOST, port=PORT, access_log=None)
