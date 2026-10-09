"""Focused tests for the fully-offline Tesseract OCR path (no AI/key/network).

pytesseract + Pillow are imported lazily inside run_local_tesseract_ocr, so we
inject fakes via sys.modules and assert the word→line grouping, CJK-aware
joining, reading order, and bounding-box percentages — no binary required.
"""

import asyncio
import sys
import types

import pytest

from app.api.routes import ai as ai_routes


def _install_fakes(monkeypatch, data, size=(200, 100)):
    fake_pt = types.ModuleType("pytesseract")

    class _Output:
        DICT = "dict"

    fake_pt.Output = _Output
    fake_pt.image_to_data = lambda image, lang, output_type: data

    class _FakeImage:
        def __init__(self):
            self.size = size

        def load(self):
            return None

    fake_pil = types.ModuleType("PIL")
    fake_image_mod = types.ModuleType("PIL.Image")
    fake_image_mod.open = lambda *a, **k: _FakeImage()
    fake_pil.Image = fake_image_mod

    monkeypatch.setitem(sys.modules, "pytesseract", fake_pt)
    monkeypatch.setitem(sys.modules, "PIL", fake_pil)
    monkeypatch.setitem(sys.modules, "PIL.Image", fake_image_mod)


def test_local_ocr_groups_words_into_lines_with_boxes(monkeypatch):
    data = {
        "text": ["Login", "form", "", "ログイン"],
        "conf": ["90", "88", "-1", "80"],
        "block_num": [1, 1, 1, 1],
        "par_num": [1, 1, 1, 1],
        "line_num": [1, 1, 1, 2],
        "left": [10, 55, 0, 10],
        "top": [10, 10, 0, 40],
        "width": [40, 30, 0, 60],
        "height": [12, 12, 0, 14],
    }
    _install_fakes(monkeypatch, data)

    regions = ai_routes.run_local_tesseract_ocr("data:image/png;base64,iVBORw0KGgo=")

    assert len(regions) == 2
    # Line 1: latin words joined with a space, in reading order.
    assert regions[0]["text"] == "Login form"
    assert regions[0]["source_language"] == "unknown"
    assert regions[0]["leftPercent"] == 5.0      # 10/200*100
    assert regions[0]["topPercent"] == 10.0      # 10/100*100
    assert regions[0]["wPercent"] == 37.5        # (85-10)/200*100
    assert regions[0]["hPercent"] == 12.0
    # Line 2: CJK joined tight (no spaces) and detected as Japanese.
    assert regions[1]["text"] == "ログイン"
    assert regions[1]["source_language"] == "ja"
    assert regions[1]["leftPercent"] == 5.0
    # Translation fields stay empty — extraction is local, translation is optional AI.
    assert regions[1]["translation_ja"] == ""


def test_local_ocr_skips_low_confidence_and_empty(monkeypatch):
    data = {
        "text": ["", "noise", "Real"],
        "conf": ["-1", "-1", "95"],
        "block_num": [1, 1, 1],
        "par_num": [1, 1, 1],
        "line_num": [1, 1, 2],
        "left": [0, 0, 5],
        "top": [0, 0, 5],
        "width": [0, 0, 20],
        "height": [0, 0, 10],
    }
    _install_fakes(monkeypatch, data)

    regions = ai_routes.run_local_tesseract_ocr("iVBORw0KGgo=")

    assert [r["text"] for r in regions] == ["Real"]


def test_perform_ocr_local_mode_returns_tesseract_engine(monkeypatch):
    data = {
        "text": ["Hello"],
        "conf": ["91"],
        "block_num": [1],
        "par_num": [1],
        "line_num": [1],
        "left": [0],
        "top": [0],
        "width": [50],
        "height": [10],
    }
    _install_fakes(monkeypatch, data)

    req = ai_routes.OcrRequest(base64_image="iVBORw0KGgo=", mode="local")
    result = asyncio.run(ai_routes.perform_ocr(req))

    assert result["success"] is True
    assert result["engine"] == "tesseract-local"
    assert result["translations"][0]["text"] == "Hello"


def test_local_ocr_missing_engine_raises_runtimeerror(monkeypatch):
    # Simulate pytesseract not installed → clear RuntimeError (mapped to 503 upstream).
    monkeypatch.setitem(sys.modules, "pytesseract", None)
    with pytest.raises(RuntimeError):
        ai_routes.run_local_tesseract_ocr("iVBORw0KGgo=")


def test_ocr_route_is_registered_to_perform_ocr(monkeypatch):
    """Regression guard: POST /api/ai/ocr must reach perform_ocr, not a helper.

    The @router.post("/ocr") decorator was once stranded on the _contains_cjk
    helper, so every request 422'd on a missing "text" query param and the real
    handler was never registered — the whole OCR endpoint was dead. Calling the
    live route (not perform_ocr directly, like the tests above) is the only thing
    that catches a misplaced/missing decorator.
    """
    from fastapi.testclient import TestClient

    from app.main import app

    data = {
        "text": ["Hello"],
        "conf": ["91"],
        "block_num": [1],
        "par_num": [1],
        "line_num": [1],
        "left": [0],
        "top": [0],
        "width": [50],
        "height": [10],
    }
    _install_fakes(monkeypatch, data)

    client = TestClient(app)
    response = client.post(
        "/api/ai/ocr",
        json={"base64_image": "iVBORw0KGgo=", "mode": "local"},
    )

    # 422 here means the route is bound to the wrong function (the original bug).
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["engine"] == "tesseract-local"
    assert body["translations"][0]["text"] == "Hello"
