# LLM Provider Integration

This directory hosts the Anthropic-compatible caller used by Crucible.

## Required Environment Variables

- `ANTHROPIC_API_KEY`
- `ANTHROPIC_BASE_URL`
- `ANTHROPIC_MODEL`

Notes:
- `ANTHROPIC_BASE_URL` and `ANTHROPIC_MODEL` must be read explicitly and applied by the provider.
- Provider output must be JSON (parsed into a Python dict).

## Expected Interface

Each provider module should expose:

- `call_llm(prompt: str) -> dict`
