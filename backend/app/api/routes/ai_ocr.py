"""
ai_ocr.py — OCR endpoint + helpers, split out of the oversized ai.py.

Owns POST /ai/ocr and everything it needs: the request model, the SSRF-guarded
remote-image fetch, the fully-offline Tesseract path, and the vision/AI path.
Kept in its own module so the route decorator sits right next to its handler
(a stranded @router.post once bound /ocr to a helper and killed the endpoint).

The public symbols are re-exported from ai.py for backward compatibility with
existing tests and callers.
"""

import base64
import io
import ipaddress
import socket
from typing import Any, Optional
from urllib.parse import urljoin, urlparse

import anyio
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.ai import generate_ocr_from_image
from app.core.config import settings
from app.core.redaction import redact_sensitive_text

router = APIRouter()


class OcrRequest(BaseModel):
    base64_image: Optional[str] = None
    image_url: Optional[str] = None
    text: Optional[str] = None
    mode: str = "hybrid"


# Max image size accepted when fetching a remote image_url (bytes).
OCR_IMAGE_URL_MAX_BYTES = 8 * 1024 * 1024
# Cap redirects so a remote URL cannot bounce us around indefinitely.
OCR_IMAGE_URL_MAX_REDIRECTS = 3


def _is_blocked_ip(ip_text: str) -> bool:
    """Block loopback/private/link-local/reserved targets (SSRF guard)."""
    try:
        ip = ipaddress.ip_address(ip_text)
    except ValueError:
        return True  # unparseable address → block defensively
    return bool(
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_reserved
        or ip.is_multicast
        or ip.is_unspecified
    )


def _resolve_host_ips(host: str, port: int) -> list[str]:
    infos = socket.getaddrinfo(host, port, proto=socket.IPPROTO_TCP)
    return [info[4][0] for info in infos]


async def _assert_public_image_url(url: str) -> None:
    """Reject non-http(s) URLs and any host that resolves to an internal IP.

    Validated before every request hop so a redirect cannot smuggle us to an
    internal address. Localhost-first deployments are low risk, but this keeps
    the route safe if the backend is ever exposed through a tunnel.
    """
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise HTTPException(status_code=400, detail="image_url must be an http(s) URL.")
    host = parsed.hostname
    if not host:
        raise HTTPException(status_code=400, detail="image_url has no host.")
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    try:
        ips = await anyio.to_thread.run_sync(_resolve_host_ips, host, port)
    except socket.gaierror as exc:
        raise HTTPException(status_code=502, detail=f"Cannot resolve image_url host: {exc}") from exc
    if not ips or any(_is_blocked_ip(ip) for ip in ips):
        raise HTTPException(
            status_code=400,
            detail="image_url resolves to a private or internal address (blocked).",
        )


async def fetch_image_url_as_base64(image_url: str) -> str:
    """Fetch a remote image URL server-side and return it as a data: base64 URI.

    Done on the backend so the extension can OCR an image link without hitting
    browser CORS restrictions. Restricted to http(s), public hosts only (SSRF
    guard), a bounded redirect chain, and a size cap.
    """
    url = (image_url or "").strip()
    if not url.lower().startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="image_url must be an http(s) URL.")
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=False) as client:
            for _ in range(OCR_IMAGE_URL_MAX_REDIRECTS + 1):
                await _assert_public_image_url(url)
                response = await client.get(url)
                location = response.headers.get("location")
                if response.is_redirect and location:
                    url = urljoin(url, location)
                    continue
                response.raise_for_status()
                break
            else:
                raise HTTPException(status_code=502, detail="image_url exceeded the redirect limit.")
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Failed to fetch image_url: {exc}") from exc

    content_type = (response.headers.get("content-type") or "").split(";")[0].strip().lower()
    if content_type and not content_type.startswith("image/"):
        raise HTTPException(
            status_code=415,
            detail=f"image_url did not return an image (content-type: {content_type}).",
        )
    data = response.content
    if not data:
        raise HTTPException(status_code=502, detail="image_url returned an empty body.")
    if len(data) > OCR_IMAGE_URL_MAX_BYTES:
        raise HTTPException(status_code=413, detail="image_url image exceeds the 8MB limit.")

    mime = content_type or "image/png"
    encoded = base64.b64encode(data).decode("ascii")
    return f"data:{mime};base64,{encoded}"

def _contains_cjk(text: str) -> bool:
    return any(
        "぀" <= ch <= "ヿ"  # hiragana/katakana
        or "㐀" <= ch <= "鿿"  # CJK ideographs
        or "＀" <= ch <= "￯"  # full-width forms
        for ch in text
    )


def run_local_tesseract_ocr(image_data: str, lang: str = "jpn+vie+eng") -> list[dict[str, Any]]:
    """Fully offline image→text OCR via Tesseract — no AI, key, or network.

    Returns region dicts in the same shape the OCR UI already consumes (original
    text in reading order + bounding-box percentages). Translation fields are
    left empty: extraction is local; translation stays an optional AI step.
    """
    try:
        import pytesseract
        from PIL import Image
    except ImportError as exc:  # pragma: no cover - image ships tesseract
        raise RuntimeError(
            "Local OCR engine (Tesseract/Pillow) is not installed in this backend image."
        ) from exc

    payload = image_data.split(",", 1)[1] if "," in image_data else image_data
    try:
        raw = base64.b64decode(payload, validate=False)
        image = Image.open(io.BytesIO(raw))
        image.load()
    except Exception as exc:
        raise RuntimeError("Could not decode image for local OCR.") from exc

    width, height = image.size
    if not width or not height:
        raise RuntimeError("Invalid image dimensions for local OCR.")

    try:
        data = pytesseract.image_to_data(
            image, lang=lang, output_type=pytesseract.Output.DICT
        )
    except Exception as exc:
        raise RuntimeError(f"Tesseract OCR failed: {exc}") from exc

    # Group recognized words into text lines keyed by Tesseract's block/par/line.
    lines: dict[tuple[int, int, int], dict[str, Any]] = {}
    for i in range(len(data["text"])):
        text = (data["text"][i] or "").strip()
        try:
            conf = float(data["conf"][i])
        except (TypeError, ValueError):
            conf = -1.0
        if not text or conf < 0:
            continue
        key = (data["block_num"][i], data["par_num"][i], data["line_num"][i])
        left, top = int(data["left"][i]), int(data["top"][i])
        right, bottom = left + int(data["width"][i]), top + int(data["height"][i])
        entry = lines.get(key)
        if entry is None:
            lines[key] = {"words": [text], "left": left, "top": top, "right": right, "bottom": bottom}
        else:
            entry["words"].append(text)
            entry["left"] = min(entry["left"], left)
            entry["top"] = min(entry["top"], top)
            entry["right"] = max(entry["right"], right)
            entry["bottom"] = max(entry["bottom"], bottom)

    regions: list[dict[str, Any]] = []
    for key in sorted(lines.keys()):
        entry = lines[key]
        words = entry["words"]
        # Japanese/Chinese has no word spaces; join tight when the line is CJK.
        joined = "".join(words) if _contains_cjk("".join(words)) else " ".join(words)
        line_text = joined.strip()
        if not line_text:
            continue
        regions.append({
            "text": line_text,
            "source_language": "ja" if _contains_cjk(line_text) else "unknown",
            "translation_ja": "",
            "translation_vi": "",
            "translation": "",
            "translation_en": "",
            "leftPercent": round(entry["left"] / width * 100, 2),
            "topPercent": round(entry["top"] / height * 100, 2),
            "wPercent": round((entry["right"] - entry["left"]) / width * 100, 2),
            "hPercent": round((entry["bottom"] - entry["top"]) / height * 100, 2),
        })
    return regions


@router.post("/ocr")
async def perform_ocr(request: OcrRequest) -> dict[str, Any]:
    """Perform OCR on base64 image or translate raw text offline."""
    if request.mode == "local":
        # Fully offline OCR: extract text from the image with Tesseract. No AI,
        # no API key, no network — always available as a fallback engine.
        if (not request.base64_image or not request.base64_image.strip()) and request.image_url:
            request.base64_image = await fetch_image_url_as_base64(request.image_url)
        if not request.base64_image or not request.base64_image.strip():
            raise HTTPException(status_code=400, detail="Image data is empty.")
        try:
            regions = await anyio.to_thread.run_sync(
                run_local_tesseract_ocr, request.base64_image
            )
        except RuntimeError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        return {"success": True, "engine": "tesseract-local", "translations": regions}

    if request.mode == "offline":
        raw_text = (request.text or "").strip()
        if not raw_text:
            raise HTTPException(status_code=400, detail="Extracted text is empty.")
        
        system_prompt = (
            "You are an expert multilingual OCR translator for Bridge Software Engineers.\n"
            "Auto-detect the source language of the raw OCR text.\n"
            "Translate the following raw OCR text block extracted from a technical document or specification.\n"
            "Translate it into clear, technical, professional Japanese, Vietnamese, and English.\n"
            "Output ONLY a valid JSON object. Do not include markdown code block syntax (like ```json), return ONLY the raw JSON.\n"
            "The JSON object MUST contain exactly these fields:\n"
            "- 'source_language': The detected source language code such as ja, en, vi, mixed, or unknown.\n"
            "- 'translation_ja': The clear Japanese translation.\n"
            "- 'translation_vi': The clear Vietnamese translation.\n"
            "- 'translation': Alias of translation_vi for backward compatibility.\n"
            "- 'translation_en': The clear English translation."
        )
        
        try:
            from app.core.ai import create_chat_completion, parse_ai_json
            response_raw = await create_chat_completion(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": raw_text}
                ],
                temperature=0.3,
                max_tokens=1500
            )
            parsed = parse_ai_json(response_raw, "Offline translation failed")
            
            return {
                "success": True,
                "translations": [
                    {
                        "text": raw_text,
                        "source_language": parsed.get("source_language") or "unknown",
                        "translation_ja": parsed.get("translation_ja") or "",
                        "translation_vi": parsed.get("translation_vi") or parsed.get("translation") or "",
                        "translation": parsed.get("translation") or parsed.get("translation_vi") or "",
                        "translation_en": parsed.get("translation_en") or "",
                        "leftPercent": 0.0,
                        "topPercent": 0.0,
                        "wPercent": 100.0,
                        "hPercent": 100.0
                    }
                ]
            }
        except Exception as exc:
            raise HTTPException(
                status_code=503,
                detail=redact_sensitive_text(str(exc), extra_secrets=[settings.openai_api_key, settings.nine_router_api_key, settings.gemini_api_key]),
            ) from exc

    # Hybrid Mode (Image-based workflow)
    if (not request.base64_image or not request.base64_image.strip()) and request.image_url:
        request.base64_image = await fetch_image_url_as_base64(request.image_url)

    if not request.base64_image or not request.base64_image.strip():
        raise HTTPException(status_code=400, detail="Image data is empty.")

    def read_image_dimensions(image_data: str) -> tuple[int | None, int | None]:
        try:
            payload = image_data.split(",", 1)[1] if "," in image_data else image_data
            raw = base64.b64decode(payload, validate=False)
        except Exception:
            return None, None
        if raw.startswith(b"\x89PNG\r\n\x1a\n") and len(raw) >= 24:
            return int.from_bytes(raw[16:20], "big"), int.from_bytes(raw[20:24], "big")
        if raw.startswith(b"\xff\xd8"):
            index = 2
            while index + 9 < len(raw):
                if raw[index] != 0xFF:
                    index += 1
                    continue
                marker = raw[index + 1]
                block_length = int.from_bytes(raw[index + 2:index + 4], "big")
                if marker in {0xC0, 0xC2} and index + 9 < len(raw):
                    return (
                        int.from_bytes(raw[index + 7:index + 9], "big"),
                        int.from_bytes(raw[index + 5:index + 7], "big"),
                    )
                index += max(block_length + 2, 2)
        return None, None

    image_width, image_height = read_image_dimensions(request.base64_image)

    def safe_float(val, default=0.0, axis_size: int | None = None, force_pixels: bool = False):
        if val is None:
            return default
        try:
            if isinstance(val, str):
                val = val.replace('%', '').strip()
            value = float(val)
            if axis_size and (force_pixels or value > 100):
                value = value / axis_size * 100
            return min(100.0, max(0.0, value))
        except (ValueError, TypeError):
            return default

    def standardize_ocr_translations(translations: list[Any]) -> list[dict[str, Any]]:
        box_keys = (
            "leftPercent",
            "topPercent",
            "wPercent",
            "hPercent",
            "left",
            "top",
            "width",
            "height",
            "x",
            "y",
            "w",
            "h",
        )

        def item_uses_pixel_box(item: dict[str, Any]) -> bool:
            box = item.get("box") if isinstance(item.get("box"), dict) else item
            return any(safe_float(box.get(key), default=0.0) > 100 for key in box_keys)

        uses_pixel_boxes = any(
            isinstance(item, dict) and item_uses_pixel_box(item)
            for item in translations
        )
        standardized = []
        for item in translations:
            if not isinstance(item, dict):
                continue
            text = item.get("text") or item.get("original") or ""
            source_language = item.get("source_language") or item.get("language") or "unknown"
            trans_ja = item.get("translation_ja") or item.get("japanese") or ""
            trans_vi = item.get("translation_vi") or item.get("translation") or item.get("vietnamese") or ""
            trans_en = item.get("translation_en") or item.get("english") or ""
            if source_language == "ja" and not trans_ja:
                trans_ja = text
            if source_language == "vi" and not trans_vi:
                trans_vi = text
            if source_language == "en" and not trans_en:
                trans_en = text
            box = item.get("box") if isinstance(item.get("box"), dict) else item
            left = box.get("leftPercent") or box.get("left") or box.get("x") or 0
            top = box.get("topPercent") or box.get("top") or box.get("y") or 0
            w = box.get("wPercent") or box.get("width") or box.get("w") or 0
            h = box.get("hPercent") or box.get("height") or box.get("h") or 0
            standardized.append(
                {
                    "text": text,
                    "source_language": source_language,
                    "translation_ja": trans_ja,
                    "translation_vi": trans_vi,
                    "translation": trans_vi,
                    "translation_en": trans_en,
                    "leftPercent": safe_float(left, axis_size=image_width, force_pixels=uses_pixel_boxes),
                    "topPercent": safe_float(top, axis_size=image_height, force_pixels=uses_pixel_boxes),
                    "wPercent": safe_float(w, axis_size=image_width, force_pixels=uses_pixel_boxes),
                    "hPercent": safe_float(h, axis_size=image_height, force_pixels=uses_pixel_boxes),
                }
            )
        return standardized

    try:
        result = await generate_ocr_from_image(request.base64_image)
        # 9Router OCR returns an array directly, but our extension expects { success: true, translations: Array }
        # Let's handle both array and object formats safely.
        if isinstance(result, list):
            return {"success": True, "translations": standardize_ocr_translations(result)}
        elif isinstance(result, dict):
            if "error" in result:
                return {"success": False, "error": result["error"]}
            
            # If it returned a dictionary, let's map it safely
            translations = result.get("regions") or result.get("translations")
            if translations is None:
                # Fallback to key-value scanning
                for k in ["regions", "translations", "data", "results"]:
                    if k in result and isinstance(result[k], list):
                        translations = result[k]
                        break
            if translations is None:
                # If it's a dict containing the text/translation keys directly, wrap it in a list
                if "text" in result and "translation" in result:
                    translations = [result]
                else:
                    translations = []
            return {"success": True, "translations": standardize_ocr_translations(translations)}
        else:
            raise RuntimeError("Vision model returned unsupported output format.")
    except RuntimeError as exc:
        raise HTTPException(
            status_code=503,
            detail=redact_sensitive_text(str(exc), extra_secrets=[settings.openai_api_key, settings.nine_router_api_key, settings.gemini_api_key]),
        ) from exc
