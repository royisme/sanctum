#!/usr/bin/env python
"""Initialize vault directory structure."""

import os
from pathlib import Path

REQUIRED_DIRS = [
    "00_Inbox",
    "00_Inbox/_failed",
    "01_Projects",
    "02_Areas",
    "02_Jobs",
    "02_Jobs/Generated",
    "03_Resources",
    "04_Archive",
]


def get_vault_path() -> Path:
    vault_path = os.environ.get("VAULT_PATH", ".")
    return Path(vault_path)


def init_vault() -> None:
    vault_path = get_vault_path()
    print(f"Initializing vault at: {vault_path.resolve()}")

    for dir_name in REQUIRED_DIRS:
        dir_path = vault_path / dir_name
        if not dir_path.exists():
            print(f"Creating: {dir_name}")
            dir_path.mkdir(parents=True, exist_ok=True)
        else:
            print(f"Exists: {dir_name}")


if __name__ == "__main__":
    init_vault()
