# Sanctum Crucible

Knowledge alchemy tools for Sanctum vault: resume generation, vault initialization, and more.

## Installation

This plugin can be installed via Claude Code:

```bash
# From GitHub
/plugin install https://github.com/royzhu/gatherer.git#subdirectory=crucible
```

## Usage

### /generate-resume

Generate a tailored resume and cover letter from a job description.

**Syntax:**
```
/generate-resume [job-file.md]
```

**Example:**
```
/generate-resume 02_Jobs/google-swe.md
```

**Outputs:**
- Resume: `02_Jobs/Generated/{job-stem}-resume.md`
- Cover letter: `02_Jobs/Generated/{job-stem}-cover-letter.md`

**Requirements:**
- Job description file must exist in your vault
- `Templates/` directory must contain resume and cover letter templates

### /init-vault

Initialize PARA directory structure for a new vault.

**Syntax:**
```
/init-vault
```

**Creates:**
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

**Note:** This command is idempotent - safe to run multiple times.

## Templates

The plugin uses these templates in the `Templates/` directory:

### resume-template.md

Markdown structure for your resume. Customize with your:

- Contact information
- Summary
- Work experience
- Skills
- Education

### cover-letter-template.md

Markdown structure for cover letters. Customize with:

- Opening paragraph
- Body paragraphs matching job requirements
- Closing paragraph

## Plugin Structure

```
crucible/
├── .claude-plugin/
│   └── plugin.json              # Plugin manifest
├── commands/                       # Claude Code commands
│   ├── generate-resume.md
│   └── init-vault.md
├── templates/                       # Document templates
│   ├── resume-template.md
│   └── cover-letter-template.md
└── README.md
```

## Development

To test locally:

```bash
# From sanctum directory
cc --plugin-dir ./crucible
```

## License

MIT
