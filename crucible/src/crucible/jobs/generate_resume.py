#!/usr/bin/env python
"""Generate resume and cover letter drafts from job description and templates."""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Dict

import importlib.resources

from ..llm.classify_inbox import get_vault_path


def read_template(name: str) -> str:
    return (
        importlib.resources.files("crucible.templates").joinpath(name).read_text(encoding="utf-8")
    )


def get_output_dir() -> Path:
    return get_vault_path() / "02_Jobs" / "Generated"


@dataclass
class JobInput:
    job_path: Path
    job_content: str
    resume_template: str
    cover_template: str


def read_job_input(job_path: Path) -> JobInput:
    resume_template = read_template("resume-template.md")
    cover_template = read_template("cover-letter-template.md")
    job_content = job_path.read_text(encoding="utf-8")
    return JobInput(
        job_path=job_path,
        job_content=job_content,
        resume_template=resume_template,
        cover_template=cover_template,
    )


def build_job_prompt(job_input: JobInput) -> str:
    payload = {
        "job_description": job_input.job_content,
        "resume_template": job_input.resume_template,
        "cover_letter_template": job_input.cover_template,
    }
    return (
        "You are a career assistant. Return JSON only.\n"
        "Schema: {\n"
        '  "resume": "filled markdown",\n'
        '  "cover_letter": "filled markdown"\n'
        "}\n"
        f"Content:\n{json.dumps(payload, ensure_ascii=False)}"
    )


def call_llm_job(prompt: str) -> Dict:
    from ..llm.providers.anthropic_provider import call_llm as provider_call

    return provider_call(prompt)


def write_outputs(job_path: Path, result: Dict) -> None:
    output_dir = get_output_dir()
    output_dir.mkdir(parents=True, exist_ok=True)
    stem = job_path.stem
    resume_path = output_dir / f"{stem}-resume.md"
    cover_path = output_dir / f"{stem}-cover-letter.md"

    resume_text = result.get("resume", "")
    cover_text = result.get("cover_letter", "")

    resume_path.write_text(resume_text, encoding="utf-8")
    cover_path.write_text(cover_text, encoding="utf-8")


def main() -> None:
    job_path_env = os.environ.get("JOB_PATH")
    if not job_path_env:
        raise RuntimeError("Set JOB_PATH to a job markdown file")

    job_path = Path(job_path_env)
    if not job_path.exists():
        raise FileNotFoundError(job_path)

    job_input = read_job_input(job_path)
    prompt = build_job_prompt(job_input)
    result = call_llm_job(prompt)
    write_outputs(job_path, result)


if __name__ == "__main__":
    main()
