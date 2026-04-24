import { generate } from "./llmAdapter.js";

function toCleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function toSummaryArray(value, fallbackArray) {
  if (Array.isArray(value)) {
    const cleaned = value
      .map((item) => toCleanString(item))
      .filter(Boolean)
      .slice(0, 5);
    return cleaned.length > 0 ? cleaned : fallbackArray;
  }

  if (typeof value === "string") {
    const split = value
      .split(/\n|\r|•|\-|\*/)
      .map((line) => toCleanString(line))
      .filter(Boolean)
      .slice(0, 5);
    return split.length > 0 ? split : fallbackArray;
  }

  return fallbackArray;
}

function getFallbackTranslations(doc) {
  const shortSummary = toCleanString(doc.short_summary_en);
  const detailedFallback = toSummaryArray(doc.detailed_summary_en, [shortSummary || "Summary not available."]);

  return {
    short_summary_ml: shortSummary,
    short_summary_hi: shortSummary,
    short_summary_ta: shortSummary,
    detailed_summary_ml: detailedFallback,
    detailed_summary_hi: detailedFallback,
    detailed_summary_ta: detailedFallback,
  };
}

function normalizeTranslations(doc, raw = {}) {
  const fallback = getFallbackTranslations(doc);

  return {
    short_summary_ml: toCleanString(raw.short_summary_ml) || fallback.short_summary_ml,
    short_summary_hi: toCleanString(raw.short_summary_hi) || fallback.short_summary_hi,
    short_summary_ta: toCleanString(raw.short_summary_ta) || fallback.short_summary_ta,
    detailed_summary_ml: toSummaryArray(raw.detailed_summary_ml, fallback.detailed_summary_ml),
    detailed_summary_hi: toSummaryArray(raw.detailed_summary_hi, fallback.detailed_summary_hi),
    detailed_summary_ta: toSummaryArray(raw.detailed_summary_ta, fallback.detailed_summary_ta),
  };
}

/**
 * Translates document summaries to multiple languages using AI
 * @param {object} doc - Document object with English summaries
 * @returns {Promise<object>} - Object with translated summaries
 */
export async function translateSummaries(doc) {
  try {
    const hasShort = doc.short_summary_ml && doc.short_summary_hi && doc.short_summary_ta;
    const hasDetailed =
      Array.isArray(doc.detailed_summary_ml) && doc.detailed_summary_ml.length > 0 &&
      Array.isArray(doc.detailed_summary_hi) && doc.detailed_summary_hi.length > 0 &&
      Array.isArray(doc.detailed_summary_ta) && doc.detailed_summary_ta.length > 0;

    // If all translations already exist, return them
    if (hasShort && hasDetailed) {
      return {
        short_summary_ml: doc.short_summary_ml,
        short_summary_hi: doc.short_summary_hi,
        short_summary_ta: doc.short_summary_ta,
        detailed_summary_ml: doc.detailed_summary_ml,
        detailed_summary_hi: doc.detailed_summary_hi,
        detailed_summary_ta: doc.detailed_summary_ta,
      };
    }

    const shortSummary = doc.short_summary_en || "";
    const detailedPoints = Array.isArray(doc.detailed_summary_en)
      ? doc.detailed_summary_en.join("\n") 
      : doc.detailed_summary_en || "";

    const prompt = `
Translate the following document summaries to Malayalam, Hindi, and Tamil.
Return ONLY a valid JSON object (no markdown, no explanation).

English Short Summary:
"${shortSummary}"

English Detailed Summary Points:
${detailedPoints}

Return JSON with this structure:
{
  "short_summary_ml": "Malayalam translation of short summary",
  "short_summary_hi": "Hindi translation of short summary",
  "short_summary_ta": "Tamil translation of short summary",
  "detailed_summary_ml": ["Malayalam point 1", "Malayalam point 2", ...],
  "detailed_summary_hi": ["Hindi point 1", "Hindi point 2", ...],
  "detailed_summary_ta": ["Tamil point 1", "Tamil point 2", ...]
}

Rules:
- Maintain the exact meaning and structure
- Keep bullet points as separate array items
- Return ONLY valid JSON
- For Malayalam, Hindi, Tamil use proper script and grammar
`;

    const { text: rawResponse } = await generate(prompt);
    
    // Parse JSON response
    let translations = {};
    try {
      // Extract JSON from response (in case there's extra text)
      const cleanedResponse = (rawResponse || "").replace(/```json|```/g, "").trim();
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        translations = JSON.parse(jsonMatch[0]);
      }
    } catch (parseErr) {
      console.error("Failed to parse translation response:", parseErr);
      // Return fallback (English as fallback)
      return getFallbackTranslations(doc);
    }

    return normalizeTranslations(doc, translations);
  } catch (error) {
    console.error("Translation service failed:", error);
    // Return English as fallback for all languages
    return getFallbackTranslations(doc);
  }
}
