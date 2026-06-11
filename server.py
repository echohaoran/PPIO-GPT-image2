#!/usr/bin/env python3
"""成长中心菜品图生成 - 静态文件服务器

用法:
  python3 server.py [端口号]
  PORT=8080 python3 server.py

环境变量:
  PORT        监听端口 (默认 8765)
  HOST        监听地址 (默认 0.0.0.0)
  LOG_LEVEL   日志级别 (默认 INFO)
"""

import os
import sys
import gzip
import signal
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from io import BytesIO

ROOT_DIR = Path(__file__).parent.resolve()
PORT = int(os.environ.get("PORT", sys.argv[1] if len(sys.argv) > 1 else 8765))
HOST = os.environ.get("HOST", "0.0.0.0")
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()

CACHE_CONTROL = {
    ".html": "no-cache",
    ".css": "public, max-age=3600",
    ".js": "public, max-age=3600",
    ".png": "public, max-age=86400",
    ".jpg": "public, max-age=86400",
    ".svg": "public, max-age=86400",
    ".ico": "public, max-age=86400",
    ".json": "public, max-age=3600",
}

CONTENT_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT_DIR), **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        ext = Path(self.path).suffix.lower()
        if ext in CACHE_CONTROL:
            self.send_header("Cache-Control", CACHE_CONTROL[ext])
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def guess_type(self, path):
        ext = Path(path).suffix.lower()
        return CONTENT_TYPES.get(ext, super().guess_type(path))

    def log_message(self, format, *args):
        if LOG_LEVEL == "DEBUG":
            super().log_message(format, *args)


def main():
    server = HTTPServer((HOST, PORT), Handler)

    def shutdown(signum, frame):
        print("\n👋 服务器正在关闭...")
        server.shutdown()

    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGINT, shutdown)

    print(f"🚀 成长中心菜品图生成 - 服务器")
    print(f"   地址: http://{HOST}:{PORT}")
    print(f"   根目录: {ROOT_DIR}")
    print(f"   Ctrl+C 停止\n")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 服务器已停止")
        server.server_close()


if __name__ == "__main__":
    main()
