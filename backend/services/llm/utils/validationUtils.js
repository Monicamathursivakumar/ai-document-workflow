import { DEPARTMENTS } from "../../utils.js";

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "your",
  "about",
  "document",
  "summary",
  "content",
  "analysis",
  "report",
  "project",
  "instructions",
  "please",
  "need",
  "need",
  "need",
  "not",
  "available",
  "available",
  "info",
  "information",
  "details",
  "general",
  "update",
  "file",
  "page",
  "pages",
  "section",
  "sections",
  "documented",
  "review",
  "completed",
  "summary",
  "detailed",
  "short",
  "quick",
  "manual",
  "recommended",
]);

const buildFallbackTags = (...values) => {
  const tokens = [];

  for (const value of values) {
    const text = Array.isArray(value) ? value.join(" ") : String(value || "");
    const matches = text.toLowerCase().match(/[a-z0-9&]+/g) || [];

    for (const token of matches) {
      const normalized = token.replace(/&/g, "").trim();
      if (!normalized) continue;
      if (STOPWORDS.has(normalized)) continue;
      if (normalized.length < 3 && !["soc", "hr", "it", "ai", "qa", "ops"].includes(normalized)) continue;
      tokens.push(normalized);
    }
  }

  return [...new Set(tokens)].slice(0, 10);
};

/**
 * Validates, normalizes, and cleans structured LLM output.
 * Handles simplified prompt response format from local llama3:8b model.
 */
export function validateAndCleanResult(result = {}) {
  const validDepartments = DEPARTMENTS;

  const clean = (v) => (typeof v === "string" ? v.trim() : v);

  return {
    title: "Document Analysis",
    purpose: clean(result.purpose) || "Not specified",
    assigned_departments: Array.isArray(result.assigned_departments)
      ? result.assigned_departments.filter((d) => validDepartments.includes(d))
      : [1, 9], // Default: Metro Operations, Safety & Security
    priority: ["NORMAL", "LOW", "HIGH"].includes(result.priority?.toUpperCase?.())
      ? result.priority.toUpperCase()
      : "NORMAL",
    deadlines: clean(result.deadlines) || "Not applicable",
    document_type: clean(result.document_type) || "general",
    
    // English summaries (main content)
    short_summary_en: clean(result.short_summary_en) || "Summary not available.",
    detailed_summary_en: Array.isArray(result.detailed_summary_en)
      ? result.detailed_summary_en.map((s) => clean(s)).filter(Boolean)
      : [],
    
    // Malayalam summaries (empty for simple English-only analysis)
    short_summary_ml: "",
    detailed_summary_ml: [],
    
    // Hindi summaries (empty for simple English-only analysis)
    short_summary_hi: "",
    detailed_summary_hi: [],
    
    // Tamil summaries (empty for simple English-only analysis)
    short_summary_ta: "",
    detailed_summary_ta: [],
    
    key_entities: Array.isArray(result.key_entities)
      ? result.key_entities.filter(Boolean).slice(0, 10)
      : buildFallbackTags(
          result.short_summary_en,
          result.detailed_summary_en,
          result.document_type,
          result.purpose,
        ),
  };
}
