"""Focused tests for the Whisper memory guard (transcriber.guard_whisper_model).

These cover the decision logic only (no model is loaded), using monkeypatch to
simulate available RAM and psutil presence/absence.
"""

import app.services.transcriber as transcriber
from app.services.transcriber import guard_whisper_model


def test_guard_disabled_returns_requested(monkeypatch):
    monkeypatch.setattr(transcriber.settings, "whisper_memory_guard", False)
    # Even with "no RAM", a disabled guard must not change the model.
    monkeypatch.setattr(transcriber, "_available_ram_gb", lambda: 0.1)
    assert guard_whisper_model("large-v3", fallback="small") == "large-v3"


def test_psutil_unavailable_is_noop(monkeypatch):
    monkeypatch.setattr(transcriber.settings, "whisper_memory_guard", True)
    monkeypatch.setattr(transcriber, "_available_ram_gb", lambda: None)
    assert guard_whisper_model("large-v3", fallback="small") == "large-v3"


def test_low_ram_falls_back_when_fallback_fits(monkeypatch):
    monkeypatch.setattr(transcriber.settings, "whisper_memory_guard", True)
    # large-v3 needs ~6 + 1.5 headroom = 7.5GB; small needs ~2 + 1.5 = 3.5GB.
    monkeypatch.setattr(transcriber, "_available_ram_gb", lambda: 4.0)
    assert guard_whisper_model("large-v3", fallback="small", headroom_gb=1.5) == "small"


def test_high_ram_keeps_requested(monkeypatch):
    monkeypatch.setattr(transcriber.settings, "whisper_memory_guard", True)
    monkeypatch.setattr(transcriber, "_available_ram_gb", lambda: 16.0)
    assert guard_whisper_model("large-v3", fallback="small", headroom_gb=1.5) == "large-v3"


def test_no_fallback_when_nothing_fits(monkeypatch):
    monkeypatch.setattr(transcriber.settings, "whisper_memory_guard", True)
    # Even "small" needs 3.5GB; only 1GB free -> cannot downgrade, return requested.
    monkeypatch.setattr(transcriber, "_available_ram_gb", lambda: 1.0)
    assert guard_whisper_model("large-v3", fallback="small", headroom_gb=1.5) == "large-v3"


def test_required_ram_matches_model_path_tiers():
    assert transcriber._required_ram_gb("Systran/faster-whisper-large-v3") == 6.0
    assert transcriber._required_ram_gb("large-v3-turbo") == 4.5
    assert transcriber._required_ram_gb("small") == 2.0
    assert transcriber._required_ram_gb("unknown-model") == 1.5
