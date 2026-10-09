"""AI helpers for the BrSE Assistant.

9Router exposes an OpenAI-compatible HTTP API. We call it via httpx instead of
importing the OpenAI SDK at module import time so the non-AI app and tests keep
working even when the SDK is not installed in a local/container image yet.
"""

import json

import httpx

from app.core.config import settings
from app.core.ai_runtime import get_selected_ai_model
from app.core.ai_http import get_ai_async_client

# ---------------------------------------------------------------------------
# 9Router HTTP helper
# ---------------------------------------------------------------------------

OLLAMA_MODEL_ALIASES = {
    "qwen2.5-coder:7b-instruct": "qwen2.5-coder:7b-instruct",
    "gemma4:12b": "gemma4:12b",
    "qwen3.5:9b": "qwen3.5:9b",
    "ollama/qwen3.5": "qwen3.5:9b",
}


def is_ollama_model(model: str) -> bool:
    return model.startswith("ollama/") or model in OLLAMA_MODEL_ALIASES


def normalize_ollama_model(model: str) -> str:
    if model in OLLAMA_MODEL_ALIASES:
        return OLLAMA_MODEL_ALIASES[model]
    if model.startswith("ollama/"):
        return model.removeprefix("ollama/")
    return model


def get_selected_runtime_metadata() -> dict[str, str]:
    model = get_selected_ai_model()
    if is_ollama_model(model):
        return {
            "model": model,
            "provider": "ollama",
            "base_url": settings.ollama_base_url,
        }
    return {
        "model": model,
        "provider": "9router",
        "base_url": settings.openai_base_url,
    }


async def create_chat_completion(
    messages: list[dict[str, str]],
    *,
    temperature: float,
    max_tokens: int,
    model: str | None = None,
) -> str:
    """Send a chat completion request to the configured 9Router endpoint."""
    selected_model = model or get_selected_ai_model()
    if is_ollama_model(selected_model):
        return await create_ollama_chat_completion(
            messages,
            temperature=temperature,
            max_tokens=max_tokens,
            model=selected_model,
        )

    endpoint = f"{settings.openai_base_url.rstrip('/')}/chat/completions"
    payload = {
        "model": selected_model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": False,
    }
    headers = {
        "Authorization": f"Bearer {settings.openai_api_key}",
        "Content-Type": "application/json",
    }

    try:
        client = get_ai_async_client()
        response = await client.post(endpoint, json=payload, headers=headers)
        response.raise_for_status()
    except httpx.HTTPError as exc:
        raise RuntimeError(f"9Router request failed: {exc}") from exc

    data = _decode_chat_completion_response(response)

    try:
        return data["choices"][0]["message"]["content"] or ""
    except (KeyError, IndexError, TypeError) as exc:
        raise RuntimeError(f"Invalid 9Router response: {data}") from exc


async def create_ollama_chat_completion(
    messages: list[dict[str, str]],
    *,
    temperature: float,
    max_tokens: int,
    model: str,
) -> str:
    """Send a chat request directly to the local Ollama runtime."""
    endpoint = f"{settings.ollama_base_url.rstrip('/')}/api/chat"
    payload = {
        "model": normalize_ollama_model(model),
        "messages": messages,
        "stream": False,
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens,
        },
    }

    try:
        client = get_ai_async_client()
        response = await client.post(endpoint, json=payload)
        response.raise_for_status()
        data = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise RuntimeError(f"Ollama request failed: {exc}") from exc

    try:
        return data["message"]["content"] or ""
    except (KeyError, TypeError) as exc:
        raise RuntimeError(f"Invalid Ollama response: {data}") from exc


async def stream_chat_completion(
    messages: list[dict[str, str]],
    *,
    temperature: float,
    max_tokens: int,
    model: str | None = None,
):
    """Stream a chat completion from 9Router using Server-Sent Events."""
    selected_model = model or get_selected_ai_model()
    if is_ollama_model(selected_model):
        async for chunk in stream_ollama_chat_completion(
            messages,
            temperature=temperature,
            max_tokens=max_tokens,
            model=selected_model,
        ):
            yield chunk
        return

    endpoint = f"{settings.openai_base_url.rstrip('/')}/chat/completions"
    payload = {
        "model": selected_model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": True,
    }
    headers = {
        "Authorization": f"Bearer {settings.openai_api_key}",
        "Content-Type": "application/json",
    }

    client = get_ai_async_client()
    async with client.stream("POST", endpoint, json=payload, headers=headers) as response:
        if response.status_code != 200:
            body = await response.aread()
            raise RuntimeError(f"9Router stream failed ({response.status_code}): {body.decode()[:200]}")
        
        async for line in response.aiter_lines():
            if not line.strip() or not line.startswith("data:"):
                continue
            
            data_str = line.removeprefix("data:").strip()
            if data_str == "[DONE]":
                break
            
            try:
                chunk = json.loads(data_str)
                content = chunk.get("choices", [{}])[0].get("delta", {}).get("content", "")
                if content:
                    yield content
            except json.JSONDecodeError:
                continue


async def stream_ollama_chat_completion(
    messages: list[dict[str, str]],
    *,
    temperature: float,
    max_tokens: int,
    model: str,
):
    """Stream chat chunks directly from the local Ollama runtime."""
    endpoint = f"{settings.ollama_base_url.rstrip('/')}/api/chat"
    payload = {
        "model": normalize_ollama_model(model),
        "messages": messages,
        "stream": True,
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens,
        },
    }

    client = get_ai_async_client()
    async with client.stream("POST", endpoint, json=payload) as response:
        if response.status_code != 200:
            body = await response.aread()
            raise RuntimeError(f"Ollama stream failed ({response.status_code}): {body.decode()[:200]}")

        async for line in response.aiter_lines():
            if not line.strip():
                continue
            try:
                data = json.loads(line)
            except json.JSONDecodeError:
                continue
            content = data.get("message", {}).get("content", "")
            if content:
                yield content


def _decode_chat_completion_response(response: httpx.Response) -> dict:
    """Decode JSON or OpenAI-style SSE responses from local 9Router."""
    try:
        return response.json()
    except json.JSONDecodeError:
        pass

    text = response.text.strip()
    if not text:
        raise RuntimeError("9Router returned an empty response.")

    if text.startswith("data:"):
        return _decode_sse_chat_completion(text)

    extracted = _decode_mixed_chat_completion(text)
    if extracted is not None:
        return extracted

    preview = text[:500].replace("\n", " ")
    raise RuntimeError(f"9Router returned a non-JSON response: {preview}")


def _decode_sse_chat_completion(text: str) -> dict:
    content_parts: list[str] = []
    final_data: dict | None = None

    for line in text.splitlines():
        line = line.strip()
        if not line.startswith("data:"):
            continue

        chunk = line.removeprefix("data:").strip()
        if not chunk or chunk == "[DONE]":
            continue

        try:
            data = json.loads(chunk)
        except json.JSONDecodeError as exc:
            raise RuntimeError(f"Invalid 9Router SSE chunk: {chunk[:300]}") from exc

        final_data = data
        delta = data.get("choices", [{}])[0].get("delta", {})
        if isinstance(delta, dict) and delta.get("content"):
            content_parts.append(delta["content"])

    if content_parts:
        return {"choices": [{"message": {"content": "".join(content_parts)}}]}

    if final_data is not None:
        return final_data

    raise RuntimeError("9Router returned an SSE response without content.")


def _decode_mixed_chat_completion(text: str) -> dict | None:
    """Decode providers that append SSE sentinels or whitespace around JSON objects."""
    decoder = json.JSONDecoder()
    index = 0
    content_parts: list[str] = []
    final_data: dict | None = None

    while index < len(text):
        while index < len(text) and text[index].isspace():
            index += 1
        if index >= len(text):
            break
        if text.startswith("data:", index):
            next_line = text.find("\n", index)
            if next_line == -1:
                break
            index = next_line + 1
            continue
        try:
            data, next_index = decoder.raw_decode(text, index)
        except json.JSONDecodeError:
            break

        if isinstance(data, dict):
            final_data = data
            choice = data.get("choices", [{}])[0]
            message = choice.get("message", {}) if isinstance(choice, dict) else {}
            delta = choice.get("delta", {}) if isinstance(choice, dict) else {}
            if isinstance(message, dict) and message.get("content"):
                content_parts.append(message["content"])
            elif isinstance(delta, dict) and delta.get("content"):
                content_parts.append(delta["content"])
        index = next_index

    if content_parts:
        return {"choices": [{"message": {"content": "".join(content_parts)}}]}
    return final_data


def parse_ai_json(raw: str, fallback_error: str) -> dict:
    candidates = [raw]
    cleaned = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    if cleaned != raw:
        candidates.append(cleaned)

    array_start = cleaned.find("[")
    array_end = cleaned.rfind("]")
    if 0 <= array_start < array_end:
        candidates.append(cleaned[array_start : array_end + 1])

    object_start = cleaned.find("{")
    object_end = cleaned.rfind("}")
    if 0 <= object_start < object_end:
        candidates.append(cleaned[object_start : object_end + 1])

    for candidate in candidates:
        if not candidate.strip():
            continue
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            continue
        except Exception:
            break

    return {"error": fallback_error, "raw": raw}

# ---------------------------------------------------------------------------
# Helper: Keigo Correction
# ---------------------------------------------------------------------------

KEIGO_SYSTEM_PROMPT = """あなたはベトナム人BrSEを支援するビジネス日本語・敬語の専門家です。
ユーザー入力は日本語の下書き、ベトナム語の意図メモ、または日越混在テキストです。
入力が日本語の場合は、意味を保ったまま自然なビジネス敬語へ修正してください。
入力がベトナム語の場合は、意図を読み取り、顧客・上司に送れる自然な日本語敬語文を作成してください。
入力が日越混在の場合は、事実関係を落とさず、日本語のビジネス文に統合してください。
出力の improved は必ず日本語にしてください。説明はベトナム語で簡潔にしてください。
必ず以下のJSON形式で回答してください（コードブロックなし）:
{
  "level": "丁寧語 or 敬語 or 謙譲語 or カジュアル",
  "score": 0-100,
  "improved": "修正後のテキスト",
  "changes": [{"original": "元の表現", "corrected": "修正後", "reason_vi": "ベトナム語での理由"}],
  "summary_vi": "全体的な評価（ベトナム語で）"
}"""


async def generate_keigo_correction(
    text: str,
    *,
    customer_style: str = "",
    communication_notes: str = "",
    report_rule: str = "",
    system_prompt: str | None = None,
) -> dict:
    """Check and correct Keigo level, return structured JSON."""
    user_message = f"以下の入力を、必要に応じて日本語ビジネス敬語へ変換・修正してください:\n\n{text}"
    if customer_style or communication_notes or report_rule:
        user_message += (
            "\n\n【顧客・コミュニケーション文脈】\n"
            f"- 顧客スタイル: {customer_style or 'なし'}\n"
            f"- 報告ルール: {report_rule or 'なし'}\n"
            f"- 補足メモ: {communication_notes or 'なし'}\n"
            "上記の文脈がある場合は、それに合うビジネス敬語・柔らかさ・依頼表現も考慮してください。"
        )
    raw = await create_chat_completion(
        messages=[
            {"role": "system", "content": system_prompt or KEIGO_SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        temperature=0.3,
        max_tokens=1500,
    )
    return parse_ai_json(raw, "AI response could not be parsed")


# ---------------------------------------------------------------------------
# Helper: Daily Report (HORENSO) from Vietnamese bullet points
# ---------------------------------------------------------------------------

REPORT_SYSTEM_PROMPT = """あなたはベトナム人BrSEをサポートするAIアシスタントです。
ベトナム語のタスクリストを受け取り、日本の報告文化「ホウレンソウ（報・連・相）」の形式に沿った
日本語の日次報告書を生成してください。

必ず以下のJSON形式で回答してください（コードブロックなし）:
{
  "horenso_text": "完全な日本語報告書テキスト",
  "tasks_done_jp": ["完了タスク1（日本語）", "完了タスク2（日本語）"],
  "tasks_wip_jp": ["進行中タスク1（日本語）"],
  "tasks_tomorrow_jp": ["明日のタスク1（日本語）"],
  "blockers_jp": "問題・連絡事項（日本語）、なければ「特になし」"
}"""

REPORT_USER_TEMPLATE = """以下のベトナム語情報から日次報告書を作成してください:

プロジェクト: {project}
担当者: {owner}
進捗: {progress}%

【業務内容メモ（ベトナム語）】
{bullet_points}

【完了したタスク】
{tasks_done}

【進行中のタスク】
{tasks_wip}

【明日の予定】
{tasks_tomorrow}

【問題・ブロッカー】
{blockers}

※業務内容メモ（bullet_points）がある場合は、そこから情報を抽出して各項目に割り当て、日本語の報告書を作成してください。"""


async def generate_daily_report(
    project: str,
    owner: str,
    progress: str,
    tasks_done: list[str],
    tasks_wip: str,
    tasks_tomorrow: str,
    blockers: str,
    bullet_points: str = "",
    customer_style: str = "",
    report_rule: str = "",
    timezone_rule: str = "",
    communication_notes: str = "",
    system_prompt: str | None = None,
) -> dict:
    """Generate Japanese HORENSO report from Vietnamese input, return structured JSON."""
    user_msg = REPORT_USER_TEMPLATE.format(
        project=project,
        owner=owner,
        progress=progress,
        tasks_done="\n".join(f"- {t}" for t in tasks_done) if tasks_done else "なし",
        tasks_wip=tasks_wip or "なし",
        tasks_tomorrow=tasks_tomorrow or "未定",
        blockers=blockers or "なし",
        bullet_points=bullet_points or "なし",
    )
    if customer_style or report_rule or timezone_rule or communication_notes:
        user_msg += (
            "\n\n【顧客・報告ルール】\n"
            f"- 顧客スタイル: {customer_style or 'なし'}\n"
            f"- 報告ルール: {report_rule or 'なし'}\n"
            f"- タイムゾーン/稼働ルール: {timezone_rule or 'なし'}\n"
            f"- コミュニケーションメモ: {communication_notes or 'なし'}\n"
            "上記がある場合は、報告の語調・粒度・依頼の置き方・注意喚起の仕方に反映してください。"
        )
    raw = await create_chat_completion(
        messages=[
            {"role": "system", "content": system_prompt or REPORT_SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
        temperature=0.3,
        max_tokens=2000,
    )
    return parse_ai_json(raw, "Parse failed")


# ---------------------------------------------------------------------------
# Helper: Meeting Minutes Extraction
# ---------------------------------------------------------------------------

MINUTES_SYSTEM_PROMPT = """あなたは会議の議事録作成を支援するAIです。
会議のチャットログや文字起こしテキストを解析し、構造化された議事録データを抽出してください。

必ず以下のJSON形式で回答してください（コードブロックなし）:
{
  "project_name": "プロジェクト名（不明の場合は空文字）",
  "summary_vi": "会議の要約（ベトナム語で2〜3文）",
  "agenda_items": [
    {
      "title": "議題タイトル（日本語）",
      "discussion": "議論内容の要約（日本語）",
      "decision": "決定事項（日本語）、なければ「継続検討」"
    }
  ],
  "action_items": [
    {
      "content": "アクション内容（日本語）",
      "owner": "担当者名",
      "deadline": "期日 YYYY-MM-DD形式、不明は空文字",
      "status": "未着手"
    }
  ]
}"""


async def extract_meeting_minutes(
    transcript: str,
    *,
    customer_style: str = "",
    report_rule: str = "",
    timezone_rule: str = "",
    communication_notes: str = "",
    system_prompt: str | None = None,
) -> dict:
    """Analyze chat transcript / meeting log and extract structured minutes JSON."""
    context = ""
    if customer_style or report_rule or timezone_rule or communication_notes:
        context = (
            "【顧客・議事録作成ルール】\n"
            f"- 顧客スタイル: {customer_style or 'なし'}\n"
            f"- 報告ルール: {report_rule or 'なし'}\n"
            f"- タイムゾーン/稼働ルール: {timezone_rule or 'なし'}\n"
            f"- コミュニケーションメモ: {communication_notes or 'なし'}\n"
            "上記がある場合は、決定事項・未決事項・次アクションの粒度と表現に反映してください。\n\n"
        )
    raw = await create_chat_completion(
        messages=[
            {"role": "system", "content": system_prompt or MINUTES_SYSTEM_PROMPT},
            {"role": "user", "content": f"{context}以下の会議内容を解析してください:\n\n{transcript}"},
        ],
        temperature=0.2,
        max_tokens=3000,
    )
    return parse_ai_json(raw, "Parse failed")


CHAT_SYSTEM_PROMPT = """あなたはBrSE Assistant（Bridge Software Engineer Assistant）のBrSE向けAIアシスタントです。
回答は短く、実務で使いやすい日本語・ベトナム語を必要に応じて使い分けてください。
顧客データや機密情報を入力しないよう注意喚起し、メール・Q&A・議事録・敬語の相談を支援します。"""

REQUIREMENT_SYSTEM_PROMPT = """あなたは経験豊富なBrSE兼PMです。
ユーザーが要件を曖昧なまま実装へ流さないよう支援してください。

回答方針:
- 基本はベトナム語で説明する
- 必要に応じて顧客に送れる自然な日本語の確認質問も添える
- 不明点を「確認すべきこと」「なぜ重要か」「聞き方」に分ける
- UI/API/DB/権限/例外/非機能/受入条件/運用影響の観点を忘れない
- 断定しすぎず、BrSEが次に何を聞けばよいかを実務的に示す
- 機密情報を入力しないよう必要に応じて注意する

出力は読みやすいMarkdownで返す。"""


async def generate_chat_reply(message: str) -> dict:
    """Simple 9Router chat test used by the floating AI widget."""
    raw = await create_chat_completion(
        messages=[
            {"role": "system", "content": CHAT_SYSTEM_PROMPT},
            {"role": "user", "content": message},
        ],
        temperature=0.4,
        max_tokens=900,
    )
    return {
        "reply": raw.strip(),
        **get_selected_runtime_metadata(),
    }


async def generate_requirement_reply(
    question: str,
    *,
    requirement_context: str = "",
    customer_style: str = "",
    communication_notes: str = "",
) -> dict:
    """Help BrSE clarify ambiguous requirements and draft customer questions."""
    context_parts = [
        f"【Requirement context】\n{requirement_context}" if requirement_context else "",
        f"【Customer style】\n{customer_style}" if customer_style else "",
        f"【Communication notes】\n{communication_notes}" if communication_notes else "",
    ]
    context = "\n\n".join(part for part in context_parts if part)
    user_content = "\n\n".join(
        part
        for part in [
            context,
            f"【Question】\n{question}",
        ]
        if part
    )
    raw = await create_chat_completion(
        messages=[
            {"role": "system", "content": REQUIREMENT_SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        temperature=0.3,
        max_tokens=1800,
    )
    return {
        "reply": raw.strip(),
        **get_selected_runtime_metadata(),
    }


SLIDE_SUMMARY_SYSTEM_PROMPT = """あなたはBrSE向けのエグゼクティブ資料作成アシスタントです。
長いMarkdownや議事メモを読み取り、5〜8枚のプレゼンテーション用スライドに再構成してください。

厳守事項:
- 出力は必ずJSONのみ（コードブロックなし）
- スライドはMarkdown形式で返す
- 各スライドは `# タイトル` で開始する
- スライド区切りは `---` を使う
- 必要に応じて `subtitle:`, `tag:`, `takeaway:`, `layout:` を使う
- 1スライドあたりの箇条書きは原則3〜5点
- ビジネス向けで、冗長な説明や実装詳細を避ける

JSON形式:
{
  "deck_title": "資料タイトル",
  "markdown": "# Slide 1 ...",
  "summary": "構成意図の短い説明"
}"""


SLIDE_REWRITE_SYSTEM_PROMPT = """あなたはBrSE向けの資料編集アシスタントです。
与えられたスライドMarkdownの箇条書きを、指定されたトーンに合わせて書き換えてください。

トーン定義:
- executive: 経営層向け。短く、意思決定・影響・結論を先に出す
- japanese-client: 日本の顧客向け。丁寧で角が立たず、状況・依頼・リスクを明確にする

厳守事項:
- 出力は必ずJSONのみ（コードブロックなし）
- 返すMarkdownは元のスライド構成を保つ
- `#`, `---`, `subtitle:`, `tag:`, `takeaway:`, `layout:` は必要に応じて維持する
- 元の意味を勝手に変えない
- 長すぎる箇条書きは簡潔にする

JSON形式:
{
  "markdown": "# Slide 1 ...",
  "summary": "どのように書き換えたかの短い説明"
}"""


async def summarize_markdown_to_slides(markdown: str, max_slides: int = 6, project_context: str = "") -> dict:
    """Turn long markdown into a 5-8 slide deck in our markdown slide format."""
    bounded_max_slides = min(8, max(5, max_slides))
    context_block = (
        f"プロジェクト制約・顧客ルール:\n{project_context.strip()}\n\n"
        if project_context.strip()
        else ""
    )
    raw = await create_chat_completion(
        messages=[
            {"role": "system", "content": SLIDE_SUMMARY_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"以下のMarkdownを{bounded_max_slides}枚以内のスライドに再構成してください。\n\n"
                    f"{context_block}"
                    f"{markdown}"
                ),
            },
        ],
        temperature=0.35,
        max_tokens=3200,
    )
    return parse_ai_json(raw, "Slide summary parse failed")


async def rewrite_slide_bullets(markdown: str, tone: str, project_context: str = "") -> dict:
    """Rewrite slide bullets while preserving slide structure."""
    normalized_tone = tone.strip().lower() or "executive"
    if normalized_tone not in {"executive", "japanese-client"}:
        normalized_tone = "executive"
    context_block = (
        f"プロジェクト制約・顧客ルール:\n{project_context.strip()}\n\n"
        if project_context.strip()
        else ""
    )

    raw = await create_chat_completion(
        messages=[
            {"role": "system", "content": SLIDE_REWRITE_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"トーン: {normalized_tone}\n\n"
                    f"{context_block}"
                    "以下のスライドMarkdownを指定トーンに合わせて書き換えてください:\n\n"
                    f"{markdown}"
                ),
            },
        ],
        temperature=0.3,
        max_tokens=2800,
    )
    return parse_ai_json(raw, "Slide rewrite parse failed")


# ---------------------------------------------------------------------------
# F9 — Knowledge Base Q&A
# ---------------------------------------------------------------------------

KNOWLEDGE_SYSTEM_PROMPT = """あなたはBrSEアシスタントです。
提供されたプロジェクトのナレッジベース（仕様書、設計書、プロセスなど）の内容に基づいて、ユーザーの質問に回答してください。
回答は正確かつ簡潔に、実務に役立つ形で提供してください。
回答は日本語を基本とし、必要に応じてベトナム語で補足説明を加えてください。
もしナレッジベースに答えがない場合は、一般的なBrSEの知識に基づいて回答し、その旨を伝えてください。"""


async def generate_knowledge_answer(question: str, context: str) -> str:
    """Generate an answer based on provided knowledge context."""
    raw = await create_chat_completion(
        messages=[
            {"role": "system", "content": KNOWLEDGE_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"【ナレッジベースのコンテキスト】\n{context}\n\n【ユーザーの質問】\n{question}",
            },
        ],
        temperature=0.3,
        max_tokens=2500,
    )
    return raw.strip()


async def generate_ocr_from_image(base64_image: str) -> dict:
    """Call 9router multimodal API to extract text and return multilingual OCR regions."""
    # Ensure clean base64 data
    if "," in base64_image:
        base64_data = base64_image.split(",")[1]
        # Get mime type if present in prefix (e.g. data:image/jpeg;base64)
        mime_type = "image/png"
        if "data:" in base64_image and ";base64" in base64_image:
            prefix = base64_image.split(";")[0]
            if ":" in prefix:
                mime_type = prefix.split(":")[1]
        full_url = f"data:{mime_type};base64,{base64_data}"
    else:
        base64_data = base64_image
        # Check first character of base64 string to guess mime type
        # '/' is typical for JPEG (0xFF), 'i' is typical for PNG (0x89)
        first_char = base64_data[0] if base64_data else ""
        mime_type = "image/jpeg" if first_char == "/" else "image/png"
        full_url = f"data:{mime_type};base64,{base64_data}"

    system_prompt = (
        "You are an OCR and multilingual translator for BrSE work.\n"
        "Auto-detect the source language for each visible text region.\n"
        "Return ONLY a valid JSON array. No markdown. No explanation.\n"
        "Each item must contain: text, source_language, translation_ja, translation_vi, translation_en, leftPercent, topPercent, wPercent, hPercent.\n"
        "Also include translation as an alias of translation_vi for backward compatibility.\n"
        "All position fields are percentages from 0 to 100, never pixel coordinates.\n"
        "If source text is already Japanese, translation_ja should equal the original text. If already English, translation_en should equal the original text. If already Vietnamese, translation_vi and translation should equal the original text.\n"
        "If the screenshot contains source code, keep text as exact visible code with punctuation, casing, spaces, and indentation; translate comments/labels when useful but do not translate identifiers inside text.\n"
        "For source code, prefer one JSON item per visible code line so downstream tools can rebuild copyable code layout.\n"
        "If no readable text exists, return []."
    )

    configured = settings.ocr_vision_model.strip() or "gemini/gemini-3.1-flash-lite-preview"
    gemini_key = (settings.gemini_api_key or "").strip()
    local_vision_model = (settings.ocr_local_vision_model or "qwen3.5:9b").strip()

    # OCR engine selection — "local default, cloud optional":
    #   * An explicit Ollama OCR_VISION_MODEL always runs locally.
    #   * Otherwise, with a Gemini key configured we use the cloud model (best
    #     quality); without a key we fall back to a local Ollama vision model so
    #     screenshot OCR works fully offline instead of blocking on the
    #     9router -> Google Gemini lane (which can be unreachable).
    if is_ollama_model(configured):
        model = configured
    elif configured.startswith("gemini/"):
        model = configured if gemini_key else local_vision_model
    elif gemini_key or (settings.openai_api_key and settings.openai_api_key.strip()):
        model = configured
    else:
        model = local_vision_model

    use_ollama = is_ollama_model(model)
    use_direct_gemini = bool(gemini_key) and model.startswith("gemini/")

    if use_ollama:
        endpoint = f"{settings.ollama_base_url.rstrip('/')}/api/chat"
        api_model = normalize_ollama_model(model)
        headers = {"Content-Type": "application/json"}
    elif use_direct_gemini:
        # Direct Gemini path: call Google's OpenAI-compatible endpoint directly
        # instead of routing through 9router.
        endpoint = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
        api_model = model.split("/", 1)[1]
        headers = {
            "Authorization": f"Bearer {gemini_key}",
            "Content-Type": "application/json",
        }
    else:
        endpoint = f"{settings.openai_base_url.rstrip('/')}/chat/completions"
        api_model = model
        headers = {
            "Authorization": f"Bearer {settings.openai_api_key}",
            "Content-Type": "application/json",
        }

    def to_ollama_messages(messages: list[dict]) -> list[dict]:
        """Convert OpenAI vision messages to Ollama /api/chat shape.

        Ollama takes plain-text content plus an `images` array of raw base64
        (no `data:` prefix), not OpenAI image_url content blocks.
        """
        converted: list[dict] = []
        for message in messages:
            content = message["content"]
            if isinstance(content, str):
                converted.append({"role": message["role"], "content": content})
                continue
            texts = [block["text"] for block in content if block.get("type") == "text"]
            entry: dict = {"role": message["role"], "content": "\n".join(texts)}
            if any(block.get("type") == "image_url" for block in content):
                entry["images"] = [base64_data]
            converted.append(entry)
        return converted

    async def request_vision(messages: list[dict]) -> str:
        if use_ollama:
            payload = {
                "model": api_model,
                "messages": to_ollama_messages(messages),
                "stream": False,
                # num_predict default (128) truncates OCR badly — raise it.
                "options": {"temperature": 0.2, "num_predict": 6000},
            }
        else:
            payload = {
                "model": api_model,
                "messages": messages,
                "temperature": 0.2,
                "max_tokens": 6000,
                "stream": False,
            }
        try:
            client = get_ai_async_client()
            response = await client.post(endpoint, json=payload, headers=headers)
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise RuntimeError(f"OCR vision request failed for {model}: {exc}") from exc

        try:
            data = response.json()
            if use_ollama:
                raw_content = data["message"]["content"] or ""
            else:
                raw_content = data["choices"][0]["message"]["content"] or ""
        except (KeyError, IndexError, TypeError, ValueError) as exc:
            raise RuntimeError(f"Invalid OCR vision response structure: {exc}") from exc
        if not raw_content.strip():
            raise RuntimeError(f"OCR vision model {model} returned empty content.")
        return raw_content

    primary_messages = [
        {"role": "system", "content": system_prompt},
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Read all visible UI/document text in this screenshot and return the JSON array requested by the system prompt.",
                },
                {"type": "image_url", "image_url": {"url": full_url}},
            ],
        },
    ]
    retry_messages = [
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": (
                        "Return ONLY a valid JSON array of text regions. Fields: text, "
                        "source_language, translation_ja, translation_vi, translation, translation_en, "
                        "leftPercent, topPercent, wPercent, hPercent. "
                        "Position fields must be percentages from 0 to 100, not pixels. "
                        "If this is source code, preserve exact visible code text and indentation in text."
                    ),
                },
                {"type": "image_url", "image_url": {"url": full_url}},
            ],
        },
    ]

    raw_text = await request_vision(primary_messages)
    parsed = parse_ai_json(raw_text, "Failed to parse OCR response JSON")
    if isinstance(parsed, dict) and parsed.get("error"):
        raw_text = await request_vision(retry_messages)
        parsed = parse_ai_json(raw_text, "Failed to parse OCR response JSON")
    if isinstance(parsed, dict) and parsed.get("error"):
        fallback_text = raw_text.strip()
        return [
            {
                "text": fallback_text[:2000],
                "source_language": "unknown",
                "translation_ja": fallback_text[:2000],
                "translation_vi": fallback_text[:2000],
                "translation": fallback_text[:2000],
                "translation_en": fallback_text[:2000],
                "leftPercent": 0.0,
                "topPercent": 0.0,
                "wPercent": 100.0,
                "hPercent": 100.0,
            }
        ]
    return parsed
