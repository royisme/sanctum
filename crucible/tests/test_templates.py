import pytest

from crucible.jobs.generate_resume import read_template


def test_packaged_templates_are_readable() -> None:
    resume = read_template("resume-template.md")
    cover = read_template("cover-letter-template.md")

    assert resume.strip().startswith("---")
    assert 'template: "resume"' in resume

    assert cover.strip().startswith("---")
    assert 'template: "cover-letter"' in cover
