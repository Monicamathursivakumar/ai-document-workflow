/**
 * Builds the structured analysis prompt for the LLM.
 * Simplified for local llama3:8b model - English only, straightforward JSON structure
 */
export function buildAnalysisPrompt(text) {
  return `Analyze the following document and return ONLY a JSON object (no markdown, no other text).

Document:
"""
${text.substring(0, 2000)}
"""

Return valid JSON with these fields ONLY:
{
  "short_summary_en": "1-2 sentence summary",
  "detailed_summary_en": ["key point 1", "key point 2", "key point 3"],
  "priority": "LOW",
  "document_type": "report",
  "assigned_departments": [1, 9],
  "key_entities": ["optional list of names or dates"]
}

Rules:
- ONLY valid JSON
- short_summary_en: 1-2 sentences max
- detailed_summary_en: 3 bullet points max
- priority: choose LOW, NORMAL, or HIGH based on urgency
- document_type: policy, procedure, report, directive, or general
- assigned_departments: array of department IDs (0-10)
- Do not include any text before or after the JSON`;
}
