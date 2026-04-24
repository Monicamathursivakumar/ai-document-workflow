import ocrService from "./ocr/index.js";
import { analyzeDocument } from "./llm/documentAnalyzer.js";
import { translateSummaries } from "./llm/translationService.js";
import Document from "../models/Document.js";
import fs from "fs";
import { buildDocumentEmbeddings } from "./documentEmbeddings.js";

const FALLBACK_DEPARTMENT_IDS = [1, 9];
const FALLBACK_STOPWORDS = new Set([
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
  "not",
  "available",
  "details",
  "general",
  "update",
  "file",
  "page",
  "section",
  "review",
  "completed",
  "manual",
  "recommended",
  "fallback",
  "unable",
  "llm",
  "error",
  "due",
  "approximately",
  "word",
  "words",
  "count",
  "keyword",
  "keywords",
  "applied",
]);

const buildFallbackTags = (...values) => {
  const tokens = [];

  for (const value of values) {
    const text = Array.isArray(value) ? value.join(" ") : String(value || "");
    const matches = text.toLowerCase().match(/[a-z0-9&]+/g) || [];

    for (const token of matches) {
      const normalized = token.replace(/&/g, "").trim();
      if (!normalized) continue;
      if (FALLBACK_STOPWORDS.has(normalized)) continue;
      if (normalized.length < 3 && !["soc", "hr", "it", "ai", "qa", "ops"].includes(normalized)) continue;
      tokens.push(normalized);
    }
  }

  return [...new Set(tokens)].slice(0, 10);
};

const normalizeDepartmentIds = (analysis = {}) => {
  const candidates = Array.isArray(analysis.assigned_departments)
    ? analysis.assigned_departments
    : Array.isArray(analysis.departments)
    ? analysis.departments
    : [];

  const ids = candidates
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isInteger(value));

  return ids.length > 0 ? ids : FALLBACK_DEPARTMENT_IDS;
};

const normalizeTags = (analysis = {}, rawText = "", fileName = "") => {
  const fromModel = Array.isArray(analysis.key_entities) ? analysis.key_entities.filter(Boolean) : [];
  if (fromModel.length > 0) return [...new Set(fromModel)].slice(0, 10);
  return buildFallbackTags(
    fileName,
    analysis.document_type,
    analysis.purpose,
    analysis.short_summary_en,
    analysis.detailed_summary_en,
    rawText,
  );
};

/**
 * Background Pipeline.
 * Updates the database after every step.
 */
async function processDocument(docId, file, fileHash = "") {
  console.log(`⚙️ Pipeline Started for Doc ID: ${docId}`);

  try {
    // -----------------------------
    // Step 2: OCR Processing
    // -----------------------------
    await Document.update(
      { status: "PROCESSING_OCR" },
      { where: { id: docId } }
    );
    console.log("🔍 [Step 2] Running OCR service...");

    const ocrResult = await ocrService(file);
    const extractedText = ocrResult.text || "";
    const emailContextText = String(file?.emailContextText || "").trim();
    const analysisInputText = emailContextText
      ? `${extractedText}\n\n--- Email Context ---\n${emailContextText}`.trim()
      : extractedText;
    const ocrConfidence = ocrResult.confidence || 0;
    const extractionMethod = ocrResult.method || "ocr";
    const fileExtension = (file.originalname || "").toLowerCase().slice((file.originalname || "").lastIndexOf("."));
    const mimeType = (file.mimetype || "").toLowerCase();
    const extractedWordCount = analysisInputText.trim()
      ? analysisInputText.trim().split(/\s+/).filter(Boolean).length
      : 0;

    // Validation: Check if text was extracted
    if (!analysisInputText.trim()) {
      await Document.update(
        {
          status: "UNREADABLE",
          error_message: "OCR finished but no text found. The document may be blank, corrupted, or in an unsupported format.",
          error_stage: "ocr",
          ocr_confidence: ocrConfidence,
        },
        { where: { id: docId } }
      );
      return; // Stop pipeline
    }

    // Validation: Check OCR confidence threshold.
    // Direct text extraction is trusted even when confidence is low because
    // it does not depend on image recognition quality.
    const MIN_CONFIDENCE_THRESHOLD = 30; // 30% minimum confidence
    const isDirectExtraction = ["direct_read", "text_fallback"].includes(extractionMethod);
    const isTextBasedUpload =
      fileExtension === ".txt" ||
      fileExtension === ".docx" ||
      fileExtension === ".doc" ||
      mimeType.startsWith("text/") ||
      mimeType.includes("wordprocessingml.document");
    const hasUsableText = extractedWordCount >= 20 || analysisInputText.trim().length >= 120;

    if (!isTextBasedUpload && !isDirectExtraction && ocrConfidence < MIN_CONFIDENCE_THRESHOLD && !hasUsableText) {
      await Document.update(
        {
          status: "UNREADABLE",
          error_message: `OCR confidence too low (${Math.round(ocrConfidence)}%). The document image quality is poor, text is unreadable, or the language doesn't match the configured OCR settings. Please upload a clearer version.`,
          error_stage: "ocr",
          raw_text: analysisInputText,
          language_detected: ocrResult.language || "unknown",
          ocr_confidence: ocrConfidence,
        },
        { where: { id: docId } }
      );
      return; // Stop pipeline
    }

    if (!isTextBasedUpload && !isDirectExtraction && ocrConfidence < MIN_CONFIDENCE_THRESHOLD && hasUsableText) {
      console.warn(
        `⚠️ Low OCR confidence (${Math.round(ocrConfidence)}%), but text length is usable. Continuing with review flag.`
      );
    }

    // SAVE OCR RESULTS TO DB
    await Document.update(
      {
        raw_text: analysisInputText,
        language_detected: ocrResult.language || "unknown",
        ocr_confidence: ocrResult.confidence || 0,
        status: "SUMMARIZING", // Mark Step 2 complete, moving to LLM
      },
      { where: { id: docId } }
    );

    console.log("✅ OCR text saved to DB.");

    // -----------------------------
    // Step 3: LLM Analysis
    // -----------------------------
    console.log("🤖 [Step 3] Running AI analysis...");
    
    let analysis;
    const embeddingsPromise = buildDocumentEmbeddings(analysisInputText, file.originalname || "", fileHash);
    try {
      analysis = await analyzeDocument(analysisInputText);
      
      // Validate AI response
      if (!analysis || typeof analysis !== 'object') {
        throw new Error("AI returned invalid response format");
      }
      
    } catch (aiError) {
      console.error("❌ AI analysis failed:", aiError);
      
      // Save partial results with error
      await Document.update(
        {
          status: "FAILED",
          error_message: `AI analysis failed: ${aiError.message}. The document text may be too short, corrupted, or in an unexpected format.`,
          error_stage: "ai_analysis",
          raw_text: analysisInputText,
          language_detected: ocrResult.language || "unknown",
          ocr_confidence: ocrConfidence,
        },
        { where: { id: docId } }
      );
      return; // Stop pipeline
    }

    let translations = {
      short_summary_ml: analysis.short_summary_ml || "",
      short_summary_hi: analysis.short_summary_hi || "",
      short_summary_ta: analysis.short_summary_ta || "",
      detailed_summary_ml: analysis.detailed_summary_ml || [],
      detailed_summary_hi: analysis.detailed_summary_hi || [],
      detailed_summary_ta: analysis.detailed_summary_ta || [],
    };

    try {
      translations = await translateSummaries({
        short_summary_en: analysis.short_summary_en || "",
        detailed_summary_en: Array.isArray(analysis.detailed_summary_en)
          ? analysis.detailed_summary_en
          : [analysis.detailed_summary_en || ""],
        ...translations,
      });
    } catch (translationError) {
      console.error(`⚠️ Translation step failed for Doc ID ${docId}:`, translationError);
      // Continue with English summaries as fallback.
    }

    let embeddings = [];
    try {
      embeddings = await embeddingsPromise;
    } catch (embeddingError) {
      console.error(`⚠️ Embedding generation failed for Doc ID ${docId}:`, embeddingError);
    }

    // SAVE FINAL RESULTS TO DB
    await Document.update(
      {
        status: "COMPLETED",
        completed_at: Date.now(),

        // AI Fields
        priority: analysis.priority || "NORMAL",
        
        // Multilingual Summaries
        short_summary_en: analysis.short_summary_en || "",
        short_summary_ml: translations.short_summary_ml || analysis.short_summary_ml || analysis.short_summary_en || "",
        short_summary_hi: translations.short_summary_hi || analysis.short_summary_hi || analysis.short_summary_en || "",
        short_summary_ta: translations.short_summary_ta || analysis.short_summary_ta || analysis.short_summary_en || "",

        detailed_summary_en: Array.isArray(analysis.detailed_summary_en)
          ? analysis.detailed_summary_en
          : [analysis.detailed_summary_en || ""],
        detailed_summary_ml: Array.isArray(translations.detailed_summary_ml)
          ? translations.detailed_summary_ml
          : Array.isArray(analysis.detailed_summary_ml)
          ? analysis.detailed_summary_ml
          : [analysis.detailed_summary_ml || analysis.short_summary_en || ""],
        detailed_summary_hi: Array.isArray(translations.detailed_summary_hi)
          ? translations.detailed_summary_hi
          : Array.isArray(analysis.detailed_summary_hi)
          ? analysis.detailed_summary_hi
          : [analysis.detailed_summary_hi || analysis.short_summary_en || ""],
        detailed_summary_ta: Array.isArray(translations.detailed_summary_ta)
          ? translations.detailed_summary_ta
          : Array.isArray(analysis.detailed_summary_ta)
          ? analysis.detailed_summary_ta
          : [analysis.detailed_summary_ta || analysis.short_summary_en || ""],

        action_items: analysis.action_items || [],
        tags: normalizeTags(analysis, analysisInputText, file.originalname),
        assigned_departments: normalizeDepartmentIds(analysis),
        routed_at: analysis.routed_at || null,
        embeddings,

        // Save token usage if available
        llm_metadata: analysis.usage_metadata || {},
      },
      { where: { id: docId } }
    );

    console.log(`🎉 Pipeline successfully completed for Doc ID: ${docId}`);
  } catch (error) {
    console.error(`❌ Pipeline failed for Doc ID: ${docId}`, error);

    // Update DB with Failure
    await Document.update(
      {
        status: "FAILED",
        error_message: error.message,
        error_stage: "background_processing",
      },
      { where: { id: docId } }
    );
  } finally {
    // Cleanup local file
    try {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    } catch (e) {
      /* ignore */
    }
  }
}

export default processDocument;
