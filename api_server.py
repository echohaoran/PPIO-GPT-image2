#!/usr/bin/env python3
"""PPIO GPT Image 2 — OpenAI-Compatible API Server

Exposes OpenAI image generation endpoints and proxies to PPIO GPT Image 2 API.
Designed for integration with Open WebUI and other OpenAI-compatible clients.

Usage:
    python3 api_server.py
    API_PORT=8766 python3 api_server.py

Environment variables (also read from .env):
    API_KEY     PPIO API Key (required)
    T2I_URL     Text-to-image endpoint
    EDIT_URL    Image edit endpoint
    API_PORT    Server port (default 8766)
    API_HOST    Listen address (default 0.0.0.0)
"""

import os
import time
import base64
import logging
from pathlib import Path
from typing import Optional

import httpx
import uvicorn
from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Environment & .env
# ---------------------------------------------------------------------------

ROOT_DIR = Path(__file__).parent.resolve()
DOTENV_PATH = ROOT_DIR / ".env"


def load_dotenv(path: Path = DOTENV_PATH) -> None:
    """Read .env file and inject variables into os.environ (no override)."""
    if not path.exists():
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

API_KEY = os.environ.get("API_KEY", "")
T2I_URL = os.environ.get("T2I_URL", "https://api.ppio.com/v3/gpt-image-2-text-to-image")
EDIT_URL = os.environ.get("EDIT_URL", "https://api.ppio.com/v3/gpt-image-2-edit")
API_PORT = int(os.environ.get("API_PORT", "8766"))
API_HOST = os.environ.get("API_HOST", "0.0.0.0")

REQUEST_TIMEOUT = 300.0  # 5 minutes

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("ppio-api")

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="PPIO GPT Image 2 OpenAI-Compatible API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def openai_error(message: str, code: str = "invalid_request_error", status: int = 400) -> JSONResponse:
    """Return an OpenAI-compatible error response."""
    return JSONResponse(
        status_code=status,
        content={
            "error": {
                "message": message,
                "type": "invalid_request_error",
                "code": code,
            }
        },
    )


def ppio_headers(api_key: str = "") -> dict:
    key = api_key or API_KEY
    return {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }


def extract_user_api_key(request: Request) -> str:
    """Extract API key from Authorization header (Bearer token). Returns empty string if absent."""
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        return auth[7:].strip()
    return ""


async def call_ppio(client: httpx.AsyncClient, url: str, body: dict, api_key: str = "") -> dict:
    """Call PPIO API and return parsed JSON. Raises on transport errors."""
    resp = await client.post(url, json=body, headers=ppio_headers(api_key), timeout=REQUEST_TIMEOUT)
    resp.raise_for_status()
    return resp.json()


def extract_ppio_image_urls(ppio_data: dict) -> list[str]:
    """Extract image URLs from PPIO response. Raises ValueError on error codes.

    PPIO format v1: {"code": 200, "images": ["https://..."]}
    PPIO format v2: {"base_resp": {"status_code": 0, "status_msg": "success"}, "images": ["https://..."]}
    """
    # Check v2 format first (base_resp.status_code)
    base_resp = ppio_data.get("base_resp")
    if base_resp is not None:
        status_code = base_resp.get("status_code")
        if status_code != 0:
            msg = base_resp.get("status_msg") or str(ppio_data)
            raise ValueError(f"PPIO API error (status_code={status_code}): {msg}")
        images = ppio_data.get("images", [])
        if not images:
            raise ValueError(f"PPIO API returned no images: {str(ppio_data)[:300]}")
        return images

    # Fall back to v1 format (code field)
    code = ppio_data.get("code")
    if code not in (200, 0, "200", "0"):
        msg = ppio_data.get("message") or ppio_data.get("error") or str(ppio_data)
        raise ValueError(f"PPIO API error (code={code}): {msg}")
    images = ppio_data.get("images", [])
    if not images:
        raise ValueError(f"PPIO API returned no images: {str(ppio_data)[:300]}")
    return images


async def download_as_base64(client: httpx.AsyncClient, url: str) -> str:
    """Download an image URL and return its base64-encoded content."""
    resp = await client.get(url, timeout=60.0)
    resp.raise_for_status()
    return base64.b64encode(resp.content).decode("ascii")


def map_quality(quality: str) -> str:
    """Map OpenAI-style quality values to PPIO quality values.

    OpenAI uses: "standard", "hd"
    PPIO uses:   "medium", "high"
    """
    quality_lower = quality.lower()
    mapping = {
        "standard": "medium",
        "hd": "high",
        "auto": "high",
    }
    return mapping.get(quality_lower, quality_lower)


PPIO_ALLOWED_SIZES = {
    "1024x1024", "1024x1536", "1536x1024",
    "2048x2048", "2048x1152", "3840x2160", "2160x3840",
    "2048x1360", "1360x2048", "1152x2048",
    "2048x1536", "1536x2048", "2048x880", "880x2048",
    "688x2048", "2048x688", "2048x1024", "1024x2048",
    "auto",
}

OPENAI_SIZE_MAP = {
    "256x256": "1024x1024",
    "512x512": "1024x1024",
    "1024x1024": "1024x1024",
    "1024x1792": "1024x1536",
    "1792x1024": "1536x1024",
}


def map_size(size: str) -> str:
    """Map OpenAI-style size values to PPIO allowed sizes.

    OpenAI uses: 256x256, 512x512, 1024x1024, 1024x1792, 1792x1024
    PPIO uses:   specific enum values + "auto"
    """
    normalized = size.replace("×", "x").replace("X", "x").strip()

    if normalized in PPIO_ALLOWED_SIZES:
        return normalized

    if normalized in OPENAI_SIZE_MAP:
        return OPENAI_SIZE_MAP[normalized]

    # For unknown sizes, try to find closest by aspect ratio
    try:
        w, h = normalized.split("x")
        w, h = int(w), int(h)
        ratio = w / h
        best = "1024x1024"
        best_diff = float("inf")
        for allowed in PPIO_ALLOWED_SIZES:
            if allowed == "auto":
                continue
            aw, ah = allowed.split("x")
            aw, ah = int(aw), int(ah)
            ar = aw / ah
            diff = abs(ratio - ar)
            if diff < best_diff:
                best_diff = diff
                best = allowed
        logger.info("Size %s not in PPIO allowed list, mapped to %s (closest aspect ratio)", size, best)
        return best
    except Exception:
        logger.warning("Cannot parse size '%s', falling back to 1024x1024", size)
        return "1024x1024"


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class ImageGenerationRequest(BaseModel):
    prompt: str
    model: str = "gpt-image-2"
    n: int = 1
    size: str = "1024x1024"
    quality: str = "high"
    response_format: str = "url"


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/")
async def health_check():
    return {"status": "ok", "service": "PPIO GPT Image 2 OpenAI-Compatible API"}


@app.get("/v1/models")
async def list_models():
    return {
        "object": "list",
        "data": [
            {
                "id": "gpt-image-2",
                "object": "model",
                "created": 1700000000,
                "owned_by": "ppio",
            }
        ],
    }


@app.post("/v1/images/generations")
async def generate_image(body: ImageGenerationRequest, request: Request):
    """Text-to-image generation — proxies to PPIO T2I API."""
    user_key = extract_user_api_key(request)
    effective_key = user_key or API_KEY

    if not effective_key:
        return openai_error("API_KEY is not configured. Provide your own key via Authorization header.", "invalid_api_key", 500)

    quality = map_quality(body.quality)
    size = map_size(body.size)

    ppio_body = {
        "prompt": body.prompt,
        "size": size,
        "n": body.n,
        "quality": quality,
        "moderation": "low",
        "output_format": "png",
        "output_compression": 100,
        "background": "opaque",
    }

    logger.info("POST /v1/images/generations | prompt=%s | size=%s | quality=%s->%s | model=%s | n=%d | custom_key=%s",
                body.prompt[:80], body.size, body.quality, quality, body.model, body.n, "yes" if user_key else "no")
    logger.debug("PPIO request body: %s", ppio_body)

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(T2I_URL, json=ppio_body, headers=ppio_headers(effective_key), timeout=REQUEST_TIMEOUT)

            logger.info("PPIO response: HTTP %d | body=%s", resp.status_code, resp.text[:500])

            if resp.status_code >= 400:
                logger.error("PPIO API error %d: %s", resp.status_code, resp.text[:1000])
                return openai_error(
                    f"PPIO API returned HTTP {resp.status_code}: {resp.text[:500]}",
                    "upstream_error", 502,
                )

            ppio_data = resp.json()
            image_urls = extract_ppio_image_urls(ppio_data)

            data_items = []
            for url in image_urls:
                if body.response_format == "b64_json":
                    b64 = await download_as_base64(client, url)
                    data_items.append({"b64_json": b64})
                else:
                    data_items.append({"url": url})

        return {"created": int(time.time()), "data": data_items}

    except ValueError as e:
        return openai_error(str(e), "upstream_error", 502)
    except httpx.TimeoutException:
        return openai_error("PPIO API request timed out (5 min).", "timeout", 504)
    except Exception as e:
        logger.exception("Unexpected error in /v1/images/generations")
        return openai_error(f"Internal error: {e}", "server_error", 500)


@app.post("/v1/images/edits")
async def edit_image(
    request: Request,
    image: UploadFile = File(...),
    mask: Optional[UploadFile] = File(None),
    prompt: str = Form(...),
    model: str = Form("gpt-image-2"),
    n: int = Form(1),
    size: str = Form("1024x1024"),
    quality: str = Form("high"),
    response_format: str = Form("url"),
):
    """Image edit / inpaint — proxies to PPIO Edit API."""
    user_key = extract_user_api_key(request)
    effective_key = user_key or API_KEY

    if not effective_key:
        return openai_error("API_KEY is not configured. Provide your own key via Authorization header.", "invalid_api_key", 500)

    quality = map_quality(quality)
    size = map_size(size)

    # Read uploaded files and convert to data URLs
    image_bytes = await image.read()
    image_content_type = image.content_type or "image/png"
    image_b64 = base64.b64encode(image_bytes).decode("ascii")
    image_data_url = f"data:{image_content_type};base64,{image_b64}"

    body = {
        "prompt": prompt,
        "size": size,
        "n": n,
        "quality": quality,
        "moderation": "low",
        "output_format": "png",
        "output_compression": 100,
        "background": "opaque",
        "image": image_data_url,
    }

    if mask is not None:
        mask_bytes = await mask.read()
        mask_content_type = mask.content_type or "image/png"
        mask_b64 = base64.b64encode(mask_bytes).decode("ascii")
        body["mask"] = f"data:{mask_content_type};base64,{mask_b64}"

    logger.info("POST /v1/images/edits | prompt=%s | size=%s | quality=%s | mask=%s | custom_key=%s",
                prompt[:80], size, quality, "yes" if mask else "no", "yes" if user_key else "no")

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(EDIT_URL, json=body, headers=ppio_headers(effective_key), timeout=REQUEST_TIMEOUT)

            logger.info("PPIO response: HTTP %d | body=%s", resp.status_code, resp.text[:500])

            if resp.status_code >= 400:
                logger.error("PPIO API error %d: %s", resp.status_code, resp.text[:1000])
                return openai_error(
                    f"PPIO API returned HTTP {resp.status_code}: {resp.text[:500]}",
                    "upstream_error", 502,
                )

            ppio_data = resp.json()
            image_urls = extract_ppio_image_urls(ppio_data)

            data_items = []
            for url in image_urls:
                if response_format == "b64_json":
                    b64 = await download_as_base64(client, url)
                    data_items.append({"b64_json": b64})
                else:
                    data_items.append({"url": url})

        return {"created": int(time.time()), "data": data_items}

    except ValueError as e:
        return openai_error(str(e), "upstream_error", 502)
    except httpx.TimeoutException:
        return openai_error("PPIO API request timed out (5 min).", "timeout", 504)
    except Exception as e:
        logger.exception("Unexpected error in /v1/images/edits")
        return openai_error(f"Internal error: {e}", "server_error", 500)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    api_key_display = "configured ✓" if API_KEY else "NOT configured ✗ (set API_KEY in .env)"
    print("=" * 60)
    print("  PPIO GPT Image 2 — OpenAI-Compatible API Server")
    print("=" * 60)
    print(f"  Address:       http://{API_HOST}:{API_PORT}")
    print(f"  API Key:       {api_key_display}")
    print(f"  T2I endpoint:  {T2I_URL}")
    print(f"  Edit endpoint: {EDIT_URL}")
    print()
    print("  Endpoints:")
    print(f"    GET  http://{API_HOST}:{API_PORT}/              (health check)")
    print(f"    GET  http://{API_HOST}:{API_PORT}/v1/models      (list models)")
    print(f"    POST http://{API_HOST}:{API_PORT}/v1/images/generations  (text-to-image)")
    print(f"    POST http://{API_HOST}:{API_PORT}/v1/images/edits        (image edit)")
    print()
    print("  Open WebUI configuration:")
    print(f"    Base URL:  http://<host>:{API_PORT}/v1")
    print(f"    API Key:   any non-empty string")
    print("=" * 60)
    print()

    if not API_KEY:
        logger.warning("API_KEY is not set! PPIO API calls will fail. "
                       "Set API_KEY in .env or as an environment variable.")

    uvicorn.run(app, host=API_HOST, port=API_PORT, log_level="info")


if __name__ == "__main__":
    main()
