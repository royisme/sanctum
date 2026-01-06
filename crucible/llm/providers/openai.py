"""OpenAI provider integration for classification."""

from __future__ import annotations

import json
import os
from typing import Dict

import httpx

DEFAULT_MODEL = "gpt-4o-mini"
DEFAULT_TIMEOUT_SECS = 60


def call_llm(prompt: str) -> Dict:
    api_key = os.environ.get("LLM_API_KEY")
    if not api_key:
        raise RuntimeError("LLM_API_KEY is required")

    model = os.environ.get("OPENAI_MODEL", DEFAULT_MODEL)
    timeout = int(os.environ.get("OPENAI_TIMEOUT", DEFAULT_TIMEOUT_SECS))

    payload = {
        "model": model,
        "messages": [
            {"role": "user", "content": prompt},
        ],
        "max_tokens": 2000,
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    response = httpx.post(
        "https://api.openai.com/v1/chat/completions",
        headers=headers,
        json=payload,
        timeout=timeout,
    )
    response.raise_for_status()
    data = response.json()
    choices = data.get("choices", [])
    if not choices:
        raise RuntimeError("Empty OpenAI response")
    text = choices[0].get("message", {}).get("content", "").strip()
    return json.loads(text)
