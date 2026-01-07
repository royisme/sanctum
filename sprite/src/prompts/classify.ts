export const CLASSIFICATION_PROMPT = `You are a PARA classifier. Return JSON only.

Schema:
{
  "items": [
    {
      "index": 0,
      "category": "projects|areas|resources|archives|jobs",
      "topic": "topic-name",
      "summary": "short summary"
    }
  ]
}

Classification Guidelines:
- projects: Active work with deadlines
- areas: Ongoing responsibilities (health, finance, learning)
- resources: Reference materials, articles, tools
- archives: Completed or inactive items
- jobs: Job postings, career opportunities

Task:
Classify the following messages. If a message contains a URL, use the content to determine the category.
`
