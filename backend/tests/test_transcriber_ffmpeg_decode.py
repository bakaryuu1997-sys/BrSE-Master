import math
import shutil
import struct
import wave

import pytest

from app.services.transcriber import TranscriptionService


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg binary not installed")
def test_decode_audio_with_ffmpeg_returns_mono_float_array(tmp_path):
    path = tmp_path / "tone.wav"
    rate = 8000
    with wave.open(str(path), "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(rate)
        handle.writeframes(
            b"".join(struct.pack("<h", int(12000 * math.sin(2 * math.pi * 440 * i / rate))) for i in range(rate))
        )

    audio = TranscriptionService.decode_audio_with_ffmpeg(str(path))

    assert audio is not None
    assert audio.dtype.name == "float32"
    assert abs(len(audio) - 16000) < 400  # 1s resampled to 16 kHz
    assert float(abs(audio).max()) <= 1.0


def test_decode_audio_with_ffmpeg_returns_none_for_missing_file(tmp_path):
    assert TranscriptionService.decode_audio_with_ffmpeg(str(tmp_path / "missing.mp4")) is None
