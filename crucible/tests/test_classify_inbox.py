import os
from pathlib import Path

import pytest

from crucible.llm import classify_inbox


@pytest.fixture(autouse=True)
def _clear_llm_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for key in [
        "VAULT_PATH",
        "ANTHROPIC_API_KEY",
        "ANTHROPIC_BASE_URL",
        "ANTHROPIC_MODEL",
        "ANTHROPIC_TIMEOUT",
    ]:
        monkeypatch.delenv(key, raising=False)


def _write_inbox_item(vault: Path, name: str = "item.md") -> Path:
    inbox = vault / "00_Inbox"
    inbox.mkdir(parents=True, exist_ok=True)
    path = inbox / name
    path.write_text("hello\n", encoding="utf-8")
    return path


def test_classify_inbox_moves_items_to_failed_on_llm_error(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    vault = tmp_path / "vault"
    vault.mkdir()

    item = _write_inbox_item(vault, "inbox-test.md")

    monkeypatch.setenv("VAULT_PATH", str(vault))

    with pytest.raises(SystemExit) as exc:
        classify_inbox.main()

    assert exc.value.code == 1

    failed = vault / "00_Inbox" / "_failed" / item.name
    assert failed.exists()
    assert not item.exists()


def test_classify_inbox_moves_items_to_para_on_success(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    vault = tmp_path / "vault"
    vault.mkdir()

    item = _write_inbox_item(vault, "foo.md")

    monkeypatch.setenv("VAULT_PATH", str(vault))

    result = {
        "items": [
            {
                "path": item.as_posix(),
                "category": "resources",
                "topic": "AI-Tools",
                "summary": "Test summary",
            }
        ]
    }

    monkeypatch.setattr(classify_inbox, "call_llm", lambda _prompt: result)

    classify_inbox.main()

    target = vault / "03_Resources" / "AI-Tools" / "foo.md"
    assert target.exists()
    assert not item.exists()

    content = target.read_text(encoding="utf-8")
    assert content.startswith("## AI Summary")
    assert "Test summary" in content

    moc = vault / "03_Resources" / "AI-Tools" / "Index.md"
    assert moc.exists()
    assert "- [[AI-Tools/foo.md]]" in moc.read_text(encoding="utf-8")


def test_apply_classification_moves_invalid_category_to_failed(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    vault = tmp_path / "vault"
    vault.mkdir()

    monkeypatch.setenv("VAULT_PATH", str(vault))

    item_path = _write_inbox_item(vault, "bad.md")
    item = classify_inbox.InboxItem(path=item_path, content=item_path.read_text(encoding="utf-8"))

    result = {
        "items": [
            {
                "path": item_path.as_posix(),
                "category": "not-a-real-category",
                "topic": "Whatever",
                "summary": "",
            }
        ]
    }

    classify_inbox.apply_classification([item], result)

    failed = vault / "00_Inbox" / "_failed" / "bad.md"
    assert failed.exists()
    assert not item_path.exists()
