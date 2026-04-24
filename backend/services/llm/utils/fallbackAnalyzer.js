/**
 * Heuristic fallback analysis when LLM fails or times out.
 * Uses keyword detection and simple rules to infer metadata.
 */
export function getFallbackAnalysis(text, reason = "LLM failure") {
  console.log("📋 Using fallback keyword-based analysis...");

  const lower = text.toLowerCase();
  const wordCount = lower.split(/\s+/).length;

  const deptKeywords = {
    HR: ["employee", "staff", "hiring", "salary", "leave", "hr"],
    Finance: ["budget", "payment", "invoice", "cost", "finance", "money"],
    Engineering: ["design", "technical", "maintenance", "engineering"],
    Legal: ["law", "contract", "agreement", "regulation"],
    Safety: ["safety", "accident", "emergency", "risk"],
    Procurement: ["purchase", "vendor", "supplier", "procurement", "order"],
  };

  const detected = [];
  for (const [dept, keywords] of Object.entries(deptKeywords)) {
    if (keywords.some((kw) => lower.includes(kw))) detected.push(dept);
  }

  const urgency = {
    critical: ["urgent", "immediate", "asap", "emergency"],
    high: ["important", "priority", "soon"],
  };

  let priority = "NORMAL";
  if (urgency.critical.some((w) => lower.includes(w))) priority = "HIGH";
  else if (urgency.high.some((w) => lower.includes(w))) priority = "HIGH";

  const departmentToId = {
    HR: 6,
    Finance: 7,
    Engineering: 4,
    Legal: 0,
    Safety: 9,
    Procurement: 0,
  };

  const assignedDepartmentIds = detected
    .map((dept) => departmentToId[dept])
    .filter((id) => Number.isInteger(id));

  return {
    title: "Document Analysis (Fallback)",
    purpose: `Automated fallback analysis due to ${reason}`,
    assigned_departments: assignedDepartmentIds.length ? assignedDepartmentIds : [1, 9],
    priority,
    deadlines: "Not applicable",
    document_type: "general",
    short_summary_en: `Document appears to be a general operational record with approximately ${wordCount} words. Manual review recommended.`,
    detailed_summary_en: [
      `Word count: ${wordCount}`,
      `Likely topics: ${detected.length ? detected.join(", ") : "general operations"}`,
      "Review recommended for routing and classification.",
    ],
    key_entities: [],
  };
}
