from __future__ import annotations

import json
import os

from anthropic import Anthropic

DEFAULT_TIMEOUT_SECS = 60


def call_llm(prompt: str) -> dict:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    base_url = os.environ.get("ANTHROPIC_BASE_URL")
    model = os.environ.get("ANTHROPIC_MODEL")

    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY is required")
    if not base_url:
        raise RuntimeError("ANTHROPIC_BASE_URL is required")
    if not model:
        raise RuntimeError("ANTHROPIC_MODEL is required")

    timeout = float(os.environ.get("ANTHROPIC_TIMEOUT", DEFAULT_TIMEOUT_SECS))

    client = Anthropic(
        api_key=api_key,
        base_url=base_url,
        timeout=timeout,
    )

    message = client.messages.create(
        model=model,
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}],
    )

    content = message.content
    if not content:
        raise RuntimeError("Empty Anthropic response")

    text = content[0].text.strip()
    if not text:
        raise RuntimeError("Empty Anthropic message text")

    return json.loads(text)
