import os
from pathlib import Path

import pytest

from crucible import init_vault


@pytest.fixture(autouse=True)
def _clear_vault_path(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("VAULT_PATH", raising=False)


def test_init_vault_creates_required_dirs(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    vault = tmp_path / "vault"
    vault.mkdir()

    monkeypatch.setenv("VAULT_PATH", str(vault))

    init_vault.init_vault()

    for rel in init_vault.REQUIRED_DIRS:
        assert (vault / rel).exists(), rel
