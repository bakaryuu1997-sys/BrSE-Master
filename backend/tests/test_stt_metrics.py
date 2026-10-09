import math

from app.services.stt_metrics import (
    aggregate_confidence,
    build_stt_benchmark,
    effective_chunk_workers,
    segment_confidence,
)


def test_effective_chunk_workers_clamps_to_core_budget():
    # 8 cores, 4 threads each -> budget 2, even if 4 configured
    assert effective_chunk_workers(4, 8, chunk_count=10, cpu_threads=4) == 2
    # never exceeds the chunk count
    assert effective_chunk_workers(4, 16, chunk_count=1, cpu_threads=1) == 1
    # never below 1, even with junk inputs
    assert effective_chunk_workers(0, None, chunk_count=0, cpu_threads=0) == 1
    # respects the configured upper bound
    assert effective_chunk_workers(1, 32, chunk_count=10, cpu_threads=1) == 1


def test_segment_confidence_maps_logprob_to_unit_interval():
    assert segment_confidence(0.0) == 1.0
    assert segment_confidence(None) == 0.0
    assert segment_confidence(-1.0) == round(math.exp(-1.0), 3)
    # very low log-prob clamps toward 0, never below 0
    assert 0.0 <= segment_confidence(-50.0) <= 0.01


def test_aggregate_confidence_is_duration_weighted():
    segments = [
        {"start": 0, "end": 1, "confidence": 0.4},   # weight 1
        {"start": 1, "end": 4, "confidence": 0.9},   # weight 3
    ]
    # (0.4*1 + 0.9*3) / 4 = 0.775
    assert aggregate_confidence(segments) == 0.775
    assert aggregate_confidence([]) == 0.0


def test_aggregate_confidence_derives_from_logprob_when_needed():
    segments = [{"start": 0, "end": 1, "avg_logprob": 0.0}]
    assert aggregate_confidence(segments) == 1.0


def test_build_stt_benchmark_realtime_factor():
    bench = build_stt_benchmark(
        engine="local",
        model="small",
        device="cpu",
        transcribe_seconds=60,
        audio_seconds=120,
    )
    assert bench["realtime_factor"] == 2.0
    assert bench["engine"] == "local"
    assert bench["model"] == "small"
    assert bench["device"] == "cpu"


def test_build_stt_benchmark_handles_zero_time():
    bench = build_stt_benchmark(
        engine="local", model="small", device="cpu", transcribe_seconds=0, audio_seconds=10
    )
    assert bench["realtime_factor"] == 0.0
