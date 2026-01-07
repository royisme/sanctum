---
description: Generate tailored resume and cover letter from job description
allowed-tools: Read, Write, Glob
argument-hint: [job-file.md]
---

# Generate Resume

Generate a tailored resume and cover letter based on a job description file.

## Input

Job description file: $1

Example: `/generate-resume 02_Jobs/google-swe.md`

## Templates

Load these templates for reference:
- Resume template: @Templates/resume-template.md
- Cover letter template: @Templates/cover-letter-template.md

## Instructions

1. **Read the job description** from the provided file path ($1)
2. **Extract key requirements**:
   - Required skills and technologies
   - Years of experience
   - Key responsibilities
   - Company culture signals
3. **Generate resume**:
   - Tailor experience bullets to match job requirements
   - Highlight relevant skills prominently
   - Use keywords from the job description
   - Keep to 1-2 pages
4. **Generate cover letter**:
   - Address specific requirements mentioned in JD
   - Show enthusiasm for the company/role
   - Include concrete examples from experience
   - Keep to 3-4 paragraphs
5. **Save outputs**:
   - Resume: `02_Jobs/Generated/{job-stem}-resume.md`
   - Cover letter: `02_Jobs/Generated/{job-stem}-cover-letter.md`

## Output Format

### Resume

```markdown
# [Your Name]

[Contact info]

## Summary
[2-3 sentences tailored to the role]

## Experience
### [Company] - [Role] (dates)
- [Achievement with metrics, matching JD keywords]
- ...

## Skills
[Prioritized by relevance to JD]

## Education
[Relevant education]
```

### Cover Letter

```markdown
Dear Hiring Manager,

[Opening: specific interest in the role/company]

[Body: 1-2 paragraphs matching experience to requirements]

[Closing: call to action]

Best regards,
[Your Name]
```
