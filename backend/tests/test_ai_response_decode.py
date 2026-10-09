import httpx
import pytest

from app.core.ai import _decode_chat_completion_response


def test_decode_chat_completion_json_response() -> None:
    response = httpx.Response(
        200,
        json={"choices": [{"message": {"content": "Xin chao"}}]},
    )

    data = _decode_chat_completion_response(response)

    assert data["choices"][0]["message"]["content"] == "Xin chao"


def test_decode_chat_completion_sse_response() -> None:
    response = httpx.Response(
        200,
        content=(
            'data: {"choices":[{"delta":{"content":"Xin "}}]}\n\n'
            'data: {"choices":[{"delta":{"content":"chao"}}]}\n\n'
            "data: [DONE]\n\n"
        ),
        headers={"content-type": "text/event-stream"},
    )

    data = _decode_chat_completion_response(response)

    assert data["choices"][0]["message"]["content"] == "Xin chao"


def test_decode_chat_completion_json_with_done_sentinel_response() -> None:
    response = httpx.Response(
        200,
        content=(
            '{"choices":[{"message":{"content":"Xin chao"}}]}'
            "data: [DONE]\n\n"
        ),
    )

    data = _decode_chat_completion_response(response)

    assert data["choices"][0]["message"]["content"] == "Xin chao"


def test_decode_chat_completion_rejects_non_json_text() -> None:
    response = httpx.Response(200, content="plain text error")

    with pytest.raises(RuntimeError, match="non-JSON"):
        _decode_chat_completion_response(response)
