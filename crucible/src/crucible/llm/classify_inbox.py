#!/usr/bin/env python
"""Classify 00_Inbox items into PARA folders using LLM providers."""

from __future__ import annotations

import json
import os
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List

DEFAULT_MOC_NAME = "Index.md"
FAILED_DIR_NAME = "_failed"


def get_vault_path() -> Path:
    """Get vault path from VAULT_PATH env var or default to current directory."""
    vault_path = os.environ.get("VAULT_PATH", ".")
    return Path(vault_path)


def get_inbox_dir() -> Path:
    return get_vault_path() / "00_Inbox"


def get_output_dirs() -> dict[str, Path]:
    vault = get_vault_path()
    return {
        "projects": vault / "01_Projects",
        "areas": vault / "02_Areas",
        "resources": vault / "03_Resources",
        "archives": vault / "04_Archive",
        "jobs": vault / "02_Jobs",
    }


def get_failed_dir() -> Path:
    return get_inbox_dir() / FAILED_DIR_NAME


def move_to_failed(source_path: Path, failed_dir: Path) -> None:
    failed_dir.mkdir(parents=True, exist_ok=True)

    if source_path.parent == failed_dir:
        return

    target_path = failed_dir / source_path.name
    if target_path.exists():
        suffix = f"{int(source_path.stat().st_mtime)}"
        target_path = failed_dir / f"{source_path.stem}-{suffix}{source_path.suffix}"

    source_path.rename(target_path)


def move_all_to_failed(items: List["InboxItem"], failed_dir: Path) -> None:
    for item in items:
        if item.path.exists():
            move_to_failed(item.path, failed_dir)


@dataclass
class InboxItem:
    path: Path
    content: str


def read_inbox_items(inbox_dir: Path) -> List[InboxItem]:
    items: List[InboxItem] = []
    for path in inbox_dir.rglob("*.md"):
        if path.name.startswith("_"):
            continue
        content = path.read_text(encoding="utf-8")
        items.append(InboxItem(path=path, content=content))
    return items


def build_prompt(items: List[InboxItem]) -> str:
    payload = [
        {
            "path": item.path.as_posix(),
            "content": item.content[:4000],
        }
        for item in items
    ]
    return (
        "You are a classifier. Return JSON only.\n"
        "Schema: {\n"
        '  "items": [\n'
        "    {\n"
        '      "path": "...",\n'
        '      "category": "projects|areas|resources|archives|jobs",\n'
        '      "topic": "topic-name",\n'
        '      "summary": "short summary"\n'
        "    }\n"
        "  ]\n"
        "}\n"
        "Content:\n"
        f"{json.dumps(payload, ensure_ascii=False)}"
    )


def call_llm(prompt: str) -> Dict:
    from .providers.anthropic_provider import call_llm as provider_call

    return provider_call(prompt)


def sanitize_topic(topic: str) -> str:
    clean = "".join(c for c in topic if c.isalnum() or c in {" ", "-", "_"}).strip()
    return clean[:80] or "Misc"


def apply_classification(items: List[InboxItem], result: Dict) -> None:
    mapping = {item.path.as_posix(): item for item in items}
    output_dirs = get_output_dirs()
    failed_dir = get_failed_dir()

    for entry in result.get("items", []):
        source_path = entry.get("path")
        category = entry.get("category")
        topic = sanitize_topic(entry.get("topic", ""))
        summary = entry.get("summary", "")

        if source_path not in mapping:
            continue

        source = mapping[source_path]

        if category not in output_dirs:
            failed_dir.mkdir(parents=True, exist_ok=True)
            failed_path = failed_dir / source.path.name
            source.path.rename(failed_path)
            continue

        target_dir = output_dirs[category] / topic
        target_dir.mkdir(parents=True, exist_ok=True)
        target_path = target_dir / source.path.name

        content = source.content
        if summary:
            content = f"## AI Summary\n\n{summary}\n\n" + content

        target_path.write_text(content, encoding="utf-8")
        source.path.unlink()

        update_moc(target_dir, target_path.name)


def update_moc(folder: Path, filename: str) -> None:
    moc_path = folder / DEFAULT_MOC_NAME
    link = f"- [[{folder.name}/{filename}]]\n"
    if moc_path.exists():
        existing = moc_path.read_text(encoding="utf-8")
        if link in existing:
            return
        moc_path.write_text(existing + link, encoding="utf-8")
    else:
        moc_path.write_text(f"# {folder.name}\n\n{link}", encoding="utf-8")


def main() -> None:
    inbox_dir = get_inbox_dir()
    items = read_inbox_items(inbox_dir)
    if not items:
        print("No inbox items to classify")
        return

    prompt = build_prompt(items)

    try:
        result = call_llm(prompt)
    except Exception as exc:
        failed_dir = get_failed_dir()
        move_all_to_failed(items, failed_dir)
        print(f"Classification failed: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc

    apply_classification(items, result)


if __name__ == "__main__":
    main()
