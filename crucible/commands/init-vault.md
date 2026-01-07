---
description: Initialize PARA directory structure for a new vault
allowed-tools: Bash, Write
---

# Initialize Vault

Create the standard PARA directory structure for a knowledge vault.

## Usage

```
/init-vault
```

## Instructions

1. **Check current directory** is the vault root (should have `.git/` or be empty)

2. **Create PARA directories**:
   ```
   01_Projects/
   02_Areas/
   02_Jobs/
   02_Jobs/Generated/
   03_Resources/
   04_Archive/
   Templates/
   .claude/commands/
   ```

3. **Create template files** if they don't exist:
   - `Templates/resume-template.md`
   - `Templates/cover-letter-template.md`

4. **Create .gitkeep files** in empty directories to ensure they're tracked

5. **Report what was created**

## Directory Purpose

| Directory | Purpose |
|-----------|---------|
| `01_Projects/` | Active work with deadlines |
| `02_Areas/` | Ongoing responsibilities (health, finance, learning) |
| `02_Jobs/` | Job descriptions and career materials |
| `02_Jobs/Generated/` | AI-generated resumes and cover letters |
| `03_Resources/` | Reference materials, articles, tools |
| `04_Archive/` | Completed or inactive items |
| `Templates/` | Document templates |
| `.claude/commands/` | Claude Code custom commands |

## Notes

- This command is idempotent: safe to run multiple times
- Existing files are not overwritten
- Creates `.gitkeep` files for git tracking of empty directories
