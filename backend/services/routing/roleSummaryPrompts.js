/**
 * Role-Based Summary Prompt Builder
 * Generates specialized prompts based on user role for document analysis
 * Each role gets a different lens on the same document
 */

const ROLE_PROMPTS = {
  // Classification & Detection (Internal - All documents)
  BASE_CLASSIFICATION: `You are a document intelligence system for a metro rail organization (KMRL).

Analyze this document and classify it into:
1. Document Type (e.g., Safety Circular, Design Change Note, Invoice, Policy, etc.)
2. Primary Department (Projects, Systems, Finance, Safety, HR, etc.)
3. Urgency Level: CRITICAL, TIME_BOUND, or INFORMATIONAL
4. Compliance Impact: Yes/No (regulatory, safety, legal)
5. Key Dates (deadlines, effective dates, review dates)
6. Action Required: Yes/No
7. Stakeholders Affected (list roles)

Return ONLY a valid JSON object:
{
  "document_type": "string",
  "primary_department": "string",
  "urgency": "CRITICAL|TIME_BOUND|INFORMATIONAL",
  "compliance_impact": true|false,
  "key_dates": ["date1", "date2"],
  "action_required": true|false,
  "affected_roles": ["role1", "role2"]
}`,

  // Role-specific summaries
  DIRECTOR_PROJECTS: `You are assisting the Director (Projects) of a metro rail corporation.

Analyze this document and summarize ONLY points relevant to the Director (Projects):
- Construction impact and scope changes
- Design or specification changes
- Cost implications and budget impact  
- Schedule risks and milestone delays
- Land acquisition, utility, or contractor issues
- Environmental or regulatory blockers

Ignore operational, HR, or financial details not impacting projects.

Return exactly 5 bullet points or fewer. Highlight risks with ⚠️. Mention deadlines explicitly.
Format as an array of strings: ["point1", "point2", ...]`,

  DIRECTOR_SYSTEMS: `You are assisting the Director (Systems) of KMRL.

Summarize focusing on systems and technical operations:
- Signaling, telecom, track, electrification, or AFC system impact
- Integration risks with existing OCC (Operation Control Center) systems
- System dependencies and data flow impact
- Testing, commissioning, or deployment requirements
- Operational readiness and go-live issues

Ignore project costs, HR policies, or financial topics.

Return 5 bullet points max. Mark system-critical items with 🚦. Use technical but clear language.
Format as array: ["point1", "point2", ...]`,

  DIRECTOR_FINANCE: `You are assisting the Director (Finance) of KMRL.

Summarize focusing on financial and budgetary impact:
- Financial impact and cost changes
- Budget deviation or overspend alerts
- Payments, invoices, vendor issues, penalties
- Funding or loan disbursement relevance
- Audit findings or compliance risk

Ignore operational or project details unless they affect budget.

Return 5 points max. Highlight amounts in bold: **₹100 Cr**. Mark payment deadlines with ⏰.
Format as array: ["point1", "point2", ...]`,

  SAFETY_HEAD: `You are assisting the Safety Head of KMRL (senior safety authority).

Summarize focusing on safety and incident management:
- Safety hazards or incident details
- Root cause analysis findings
- Corrective and preventive actions (CAPA)
- Employee safety impact and training needs
- Compliance with CMRS safety regulations
- Risk assessment outcomes

Return 5 bullets max. Use plain, decisive language. Mark high-risk items with 🛑.
Format as array: ["point1", "point2", ...]`,

  GM_ADMIN: `You are assisting the GM (Administration) of KMRL.

Summarize focusing on HR, legal, and admin matters:
- HR policy changes or updates
- Staff impact and notification needs
- Contractual or legal clauses
- Training or disciplinary requirements  
- Vendor contract terms
- Compliance and audit requirements

Use simple, non-technical language. Highlight mandatory actions.
Return 5 points max. Format as array: ["point1", "point2", ...]`,

  MD_EXECUTIVE: `You are assisting the Managing Director of KMRL.

Provide a concise executive summary:
1. What happened / What is the issue
2. Why it matters (business/safety/compliance impact)
3. What action is required
4. Who is responsible
5. Deadline (if any)

Use 3-4 bullets maximum. Plain, decisive language. Avoid jargon.
Format as array: ["point1", "point2", ...]`,

  STAFF: `You are assisting KMRL staff members.

Summarize this document in simple, easy-to-understand language:
- What does this document mean for me?
- What actions do I need to take?
- Any mandatory requirements or deadlines?
- Who should I contact for questions?

Return 4 points max. Use simple Hindi/Malayalam-friendly English.
Format as array: ["point1", "point2", ...]`,
};

/**
 * Get the appropriate prompt for a given user role
 * @param {string} userRole - User's role (e.g., "DIRECTOR_PROJECTS", "SAFETY_HEAD")
 * @param {string} promptType - Type of prompt: "classification", "summary", etc.
 * @returns {string} The prompt template for that role
 */
export function getRolePrompt(userRole, promptType = "summary") {
  if (promptType === "classification") {
    return ROLE_PROMPTS.BASE_CLASSIFICATION;
  }

  // Map director titles to prompt keys
  const rolePromptMap = {
    DIRECTOR_PROJECTS,
    DIRECTOR_SYSTEMS,
    DIRECTOR_FINANCE,
    SAFETY_HEAD,
    GM_ADMIN,
    MD: "MD_EXECUTIVE",
    STAFF,
  };

  const promptKey = rolePromptMap[userRole] || "STAFF";
  return ROLE_PROMPTS[promptKey] || ROLE_PROMPTS.STAFF;
}

/**
 * Build a complete analysis prompt for a specific role
 * @param {string} userRole - User role
 * @param {string} documentText - Full document text
 * @returns {string} Complete prompt ready for LLM
 */
export function buildRoleSpecificPrompt(userRole, documentText) {
  const rolePrompt = getRolePrompt(userRole, "summary");

  return `${rolePrompt}

---
DOCUMENT TO ANALYZE:
---

${documentText}`;
}

/**
 * Generate multilingual summary prompt (for translation)
 * @param {string} summary - English summary
 * @param {array} targetLanguages - Languages to translate to (ml, hi, ta)
 * @returns {string} Translation prompt
 */
export function buildTranslationPrompt(roleSummary, targetLanguages = ["ml", "hi", "ta"]) {
  const langNames = {
    ml: "Malayalam",
    hi: "Hindi",
    ta: "Tamil",
  };

  const targets = targetLanguages.map((lang) => `"${lang}": ["${langNames[lang]} point 1", "${langNames[lang]} point 2"]`).join(",\n  ");

  return `Translate this role-specific document summary to multiple languages.

Original Summary (for ${""} role):
${roleSummary.join("\n")}

Return ONLY valid JSON:
{
  ${targets}
}

Rules:
- Preserve original meaning exactly
- Keep action items clear and actionable
- Translate bullet symbols and emojis as-is
- Maintain professional tone`;
}

export { ROLE_PROMPTS };
