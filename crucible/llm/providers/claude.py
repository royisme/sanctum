"""Claude provider integration for classification."""

from __future__ import annotations

import json
import os
from typing import Dict

import httpx

DEFAULT_MODEL = "claude-3-5-sonnet-20241022"
DEFAULT_TIMEOUT_SECS = 60


def call_llm(prompt: str) -> Dict:
    api_key = os.environ.get("LLM_API_KEY")
    if not api_key:
        raise RuntimeError("LLM_API_KEY is required")

    model = os.environ.get("CLAUDE_MODEL", DEFAULT_MODEL)
    timeout = int(os.environ.get("CLAUDE_TIMEOUT", DEFAULT_TIMEOUT_SECS))

    payload = {
        "model": model,
        "max_tokens": 2000,
        "messages": [
            {
                "role": "user",
                "content": prompt,
            }
        ],
    }

    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }

    response = httpx.post(
        "https://api.anthropic.com/v1/messages",
        headers=headers,
        json=payload,
        timeout=timeout,
    )
    response.raise_for_status()
    data = response.json()
    content = data.get("content", [])
    if not content:
        raise RuntimeError("Empty Claude response")
    text = content[0].get("text", "").strip()
    return json.loads(text)
