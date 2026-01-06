from pathlib import Path

from crucible.llm.classify_inbox import update_moc


def test_update_moc_deduplicates_link(tmp_path: Path) -> None:
    folder = tmp_path / "AI-Tools"
    folder.mkdir()

    update_moc(folder, "foo.md")
    update_moc(folder, "foo.md")

    moc = folder / "Index.md"
    content = moc.read_text(encoding="utf-8")

    assert content.count("- [[AI-Tools/foo.md]]") == 1
