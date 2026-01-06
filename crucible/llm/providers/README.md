# LLM Provider Integration

This directory hosts provider-specific callers for classification and synthesis.

## Required Environment Variables
- LLM_PROVIDER: claude or openai
- LLM_API_KEY: provider key

## Expected Interface
Each provider module should expose a function:

- call_llm(prompt: str) -> dict

The function should return parsed JSON with the schema described in classify_inbox.py.
