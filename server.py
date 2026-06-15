#!/usr/bin/env python3
"""成长中心菜品图生成 - 静态文件服务器

用法:
  python3 server.py [端口号]
  PORT=8080 python3 server.py

环境变量:
  PORT        监听端口 (默认 8765)
  HOST        监听地址 (默认 0.0.0.0)
  LOG_LEVEL   日志级别 (默认 INFO)
  API_KEY     PPIO API Key (也可通过 .env 文件配置)
  T2I_URL     文生图 API 端点
  EDIT_URL    图生图/编辑 API 端点
"""

import os
import sys
import json
import gzip
import signal
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from io import BytesIO

ROOT_DIR = Path(__file__).parent.resolve()
DOTENV_PATH = ROOT_DIR / ".env"
PORT = int(os.environ.get("PORT", sys.argv[1] if len(sys.argv) > 1 else 8765))
HOST = os.environ.get("HOST", "0.0.0.0")
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()


def load_dotenv(path=DOTENV_PATH):
    """读取 .env 文件，将变量注入 os.environ（不覆盖已有值）"""
    if not Path(path).exists():
        return
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip()
            if key and key not in os.environ:
                os.environ[key] = value


load_dotenv()

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

    def do_GET(self):
        # 动态生成 /config.js，注入环境变量到前端
        if self.path == "/config.js" or self.path == "/config.js/":
            self._serve_config_js()
            return
        super().do_GET()

    def _serve_config_js(self):
        config = {
            "API_KEY": os.environ.get("API_KEY", ""),
            "T2I_URL": os.environ.get("T2I_URL", "https://api.ppio.com/v3/gpt-image-2-text-to-image"),
            "EDIT_URL": os.environ.get("EDIT_URL", "https://api.ppio.com/v3/gpt-image-2-edit"),
            "API_FORMAT": os.environ.get("API_FORMAT", "ppio"),
        }
        js = f"window.__CONFIG__={json.dumps(config)};"
        body = js.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/javascript; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

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

    api_key = os.environ.get("API_KEY", "")
    print(f"🚀 成长中心菜品图生成 - 服务器")
    print(f"   地址: http://{HOST}:{PORT}")
    print(f"   根目录: {ROOT_DIR}")
    print(f"   API Key: {'已配置 ✓' if api_key else '未配置 ✗ (请在 .env 中设置 API_KEY)'}")
    print(f"   Ctrl+C 停止\n")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 服务器已停止")
        server.server_close()


if __name__ == "__main__":
    main()
