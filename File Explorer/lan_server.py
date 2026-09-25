#!/usr/bin/env python3
import sys
import os
import json
import urllib.parse
import mimetypes
import posixpath
import shutil
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from email.parser import BytesParser
from email.policy import default

if len(sys.argv) < 3:
    print("Usage: lan_server.py <HTML_FILE> <PORT>")
    sys.exit(1)

HTML_FILE = os.path.realpath(sys.argv[1])
PORT = int(sys.argv[2])
MAX_UPLOAD = 2 * 1024 * 1024 * 1024

HOME = os.path.expanduser("~")

# Quick-access shares (only the ones that actually exist), plus a full
# "Computer" share rooted so the whole device is browsable.
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
        raise ValueError
    return p

def resolve(share, rel=""):
    if share not in SHARES:
        raise ValueError
    root = SHARES[share]
    clean_rel = relsafe(rel)
    p = os.path.realpath(os.path.join(root, clean_rel))
    root_prefix = root if root.endswith(os.sep) else root + os.sep
    if p != root and not p.startswith(root_prefix):
        raise ValueError
    return p

def safe_name(n):
    n = os.path.basename(n.replace("\\", "/")).strip()
    if not n or n in (".", "..") or "/" in n:
        raise ValueError
    return n

class H(BaseHTTPRequestHandler):
    server_version = "FileExplorer/3.0"

    def out(self, data, ctype="text/plain; charset=utf-8", status=200):
        if isinstance(data, str):
            data = data.encode()
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def json(self, obj, status=200):
        self.out(json.dumps(obj).encode(), "application/json; charset=utf-8", status)

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        q = urllib.parse.parse_qs(u.query)

        if u.path == "/":
            self.out(open(HTML_FILE, "rb").read(), "text/html; charset=utf-8")
            return

        if u.path == "/api/shares":
            self.json([{"name": n, "root": n == "Computer"} for n in SHARE_ORDER])
            return

        if u.path == "/api/list":
            try:
                share = q.get("share", [""])[0]
                cur = resolve(share, q.get("path", [""])[0])
            except Exception:
                self.out("Invalid path", status=400)
                return
            if not os.path.isdir(cur):
                self.out("Not a directory", status=404)
                return
            try:
                names = os.listdir(cur)
            except PermissionError:
                self.out("Permission denied", status=403)
                return
            except OSError as e:
                self.out(str(e), status=500)
                return
            arr = []
            for n in names:
                p = os.path.join(cur, n)
                try:
                    st = os.lstat(p)
                except OSError:
                    continue
                arr.append({
                    "name": n,
                    "path": os.path.relpath(p, SHARES[share]).replace(os.sep, "/"),
                    "directory": os.path.isdir(p),
                    "size": st.st_size if os.path.isfile(p) else None,
                    "mtime": st.st_mtime,
                })
            self.json(arr)
            return

        if u.path == "/download":
            try:
                share = q.get("share", [""])[0]
                p = resolve(share, q.get("path", [""])[0])
            except Exception:
                self.out("Invalid path", status=400)
                return
            if not os.path.isfile(p):
                self.out("File not found", status=404)
                return
            force = q.get("dl", ["0"])[0] == "1"
            name = os.path.basename(p)
            disp = "attachment" if force else "inline"
            ctype = mimetypes.guess_type(p)[0] or "application/octet-stream"
            self.send_response(200)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(os.path.getsize(p)))
            self.send_header("Content-Disposition", f'{disp}; filename="{name}"')
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            with open(p, "rb") as f:
                shutil.copyfileobj(f, self.wfile, 1024 * 1024)
            return

        self.out("Not found", status=404)

    def do_POST(self):
        u = urllib.parse.urlparse(self.path)
        q = urllib.parse.parse_qs(u.query)

        if u.path == "/api/rename":
            try:
                d = json.loads(self.rfile.read(int(self.headers.get("Content-Length", "0"))))
                share = d["share"]
                p = resolve(share, d["path"])
                new = safe_name(d["new_name"])
                dest = os.path.join(os.path.dirname(p), new)
                if os.path.exists(dest):
                    self.out("A file or folder with that name already exists.", status=409)
                    return
                os.rename(p, dest)
                self.json({"ok": True})
            except ValueError:
                self.out("Invalid path or name", status=400)
            except Exception as e:
                self.out(str(e), status=500)
            return

        if u.path == "/api/delete":
            try:
                d = json.loads(self.rfile.read(int(self.headers.get("Content-Length", "0"))))
                p = resolve(d["share"], d["path"])
                if os.path.isdir(p):
                    shutil.rmtree(p)
                else:
                    os.remove(p)
                self.json({"ok": True})
            except ValueError:
                self.out("Invalid path", status=400)
            except Exception as e:
                self.out(str(e), status=500)
            return

        if u.path == "/upload":
            try:
                share = q.get("share", [""])[0]
                target = resolve(share, q.get("path", [""])[0])
            except Exception:
                self.out("Invalid path", status=400)
                return
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > MAX_UPLOAD:
                self.out("Upload too large or empty", status=413)
                return
            body = self.rfile.read(length)
            ctype = self.headers.get("Content-Type", "")
            if not ctype.startswith("multipart/form-data"):
                self.out("Expected multipart/form-data", status=400)
                return
            msg = BytesParser(policy=default).parsebytes(
                b"Content-Type: " + ctype.encode() + b"\r\nMIME-Version: 1.0\r\n\r\n" + body
            )
            count = 0
            for part in msg.iter_parts():
                if part.get_content_disposition() != "form-data":
                    continue
                fn = part.get_filename()
                if not fn:
                    continue
                try:
                    fn = safe_name(fn)
                except ValueError:
                    continue
                with open(os.path.join(target, fn), "wb") as f:
                    f.write(part.get_payload(decode=True) or b"")
                count += 1
            self.json({"ok": True, "count": count})
            return

        self.out("Not found", status=404)

    def log_message(self, fmt, *args):
        print("%s - %s" % (self.address_string(), fmt % args))

if __name__ == "__main__":
    print(f"File Explorer Server starting on port {PORT}...")
    ThreadingHTTPServer(("0.0.0.0", PORT), H).serve_forever()
