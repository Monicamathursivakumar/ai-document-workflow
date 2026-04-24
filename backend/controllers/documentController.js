import documentProcessor from "../services/documentProcessor.js";
import Document from "../models/Document.js";
import Department from "../models/Department.js";
import { Op, fn, col, literal } from "sequelize";
import { ALLOWED_FILE_EXTENSIONS } from "../services/utils.js";
import metadataExtractor from "../services/metadataExtractor.js";
// FIX: Using Supabase uploader for document storage
import uploadToSupabase from "../services/supabaseUploader.js";
import calculateFileHash from "../utils/calculateFileHash.js";
import { buildDocumentEmbeddings } from "../services/documentEmbeddings.js";
import { translateSummaries } from "../services/llm/translationService.js";
import { analyzeDocument } from "../services/llm/documentAnalyzer.js";
import { generate } from "../services/llm/llmAdapter.js";
import fs from "fs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const getRequestUserContext = async (req) => {
  try {
    const token = req.headers?.authorization?.split(" ")?.[1];
    if (!token) return null;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    let departmentId = Number.parseInt(decoded?.department_id, 10);

    if (!Number.isInteger(departmentId) && Number.isInteger(decoded?.id)) {
      const user = await User.findByPk(decoded.id, { attributes: ["department_id", "role"] });
      if (user) {
        departmentId = Number.parseInt(user.department_id, 10);
      }
    }

    return {
      id: decoded?.id,
      role: decoded?.role,
      department_id: departmentId,
    };
  } catch {
    return null;
  }
};

const applyStaffDepartmentScope = (where, userContext) => {
  if (!userContext || userContext.role !== "STAFF") return;
  if (!Number.isInteger(userContext.department_id)) return;
  where.assigned_departments = {
    [Op.contains]: [userContext.department_id],
  };
};

const hasValues = (value) =>
  Array.isArray(value) ? value.some((item) => String(item || "").trim()) : Boolean(String(value || "").trim());

const needsTranslation = (doc) => {
  const hasShort = hasValues(doc.short_summary_ml) && hasValues(doc.short_summary_hi) && hasValues(doc.short_summary_ta);
  const hasDetailed =
    hasValues(doc.detailed_summary_ml) &&
    hasValues(doc.detailed_summary_hi) &&
    hasValues(doc.detailed_summary_ta);

  return !(hasShort && hasDetailed);
};

const FALLBACK_DEPARTMENT_IDS = [1, 9];

const DOCUMENT_STOPWORDS = new Set([
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

const hasMeaningfulValue = (value) => {
  if (Array.isArray(value)) {
    return value.some((item) => String(item || "").trim());
  }

  return Boolean(String(value || "").trim());
};

const isMissingSummary = (doc) => {
  const summary = String(doc.short_summary_en || "").trim();
  const detailed = Array.isArray(doc.detailed_summary_en) ? doc.detailed_summary_en.filter(Boolean) : [];

  return !summary || summary === "Summary not available." || detailed.length === 0;
};

const buildFallbackTags = (analysis = {}, sourceText = "", fileName = "") => {
  const values = [
    fileName,
    analysis.document_type,
    analysis.purpose,
    analysis.short_summary_en,
    Array.isArray(analysis.detailed_summary_en) ? analysis.detailed_summary_en.join(" ") : analysis.detailed_summary_en,
    sourceText,
  ]
    .filter(Boolean)
    .join(" ");

  const tokens = values.toLowerCase().match(/[a-z0-9&]+/g) || [];
  const tags = [];

  for (const token of tokens) {
    const normalized = token.replace(/&/g, "").trim();
    if (!normalized) continue;
    if (DOCUMENT_STOPWORDS.has(normalized)) continue;
    if (normalized.length < 3 && !["soc", "hr", "it", "ai", "qa", "ops"].includes(normalized)) continue;
    tags.push(normalized);
  }

  return [...new Set(tags)].slice(0, 10);
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

const normalizeTagList = (analysis = {}, sourceText = "", fileName = "") => {
  const fromModel = Array.isArray(analysis.key_entities) ? analysis.key_entities.filter(Boolean) : [];

  if (fromModel.length > 0) {
    return [...new Set(fromModel)].slice(0, 10);
  }

  return buildFallbackTags(analysis, sourceText, fileName);
};

const needsAutoRepair = (doc) => {
  return (
    doc.status === "COMPLETED" &&
    (isMissingSummary(doc) || !hasMeaningfulValue(doc.assigned_departments) || !hasMeaningfulValue(doc.tags))
  );
};

const applyAnalysisUpdate = async (doc, analysis, sourceText = "") => {
  const tags = normalizeTagList(analysis, sourceText, doc.file_name);
  const assignedDepartments = normalizeDepartmentIds(analysis);

  await doc.update({
    status: "COMPLETED",
    priority: analysis.priority || doc.priority || "NORMAL",
    short_summary_en: analysis.short_summary_en || doc.short_summary_en || "",
    short_summary_ml: analysis.short_summary_ml || doc.short_summary_ml || "",
    short_summary_hi: analysis.short_summary_hi || doc.short_summary_hi || "",
    short_summary_ta: analysis.short_summary_ta || doc.short_summary_ta || "",
    detailed_summary_en: Array.isArray(analysis.detailed_summary_en)
      ? analysis.detailed_summary_en.filter(Boolean)
      : Array.isArray(doc.detailed_summary_en)
      ? doc.detailed_summary_en
      : [],
    detailed_summary_ml: Array.isArray(analysis.detailed_summary_ml)
      ? analysis.detailed_summary_ml.filter(Boolean)
      : Array.isArray(doc.detailed_summary_ml)
      ? doc.detailed_summary_ml
      : [],
    detailed_summary_hi: Array.isArray(analysis.detailed_summary_hi)
      ? analysis.detailed_summary_hi.filter(Boolean)
      : Array.isArray(doc.detailed_summary_hi)
      ? doc.detailed_summary_hi
      : [],
    detailed_summary_ta: Array.isArray(analysis.detailed_summary_ta)
      ? analysis.detailed_summary_ta.filter(Boolean)
      : Array.isArray(doc.detailed_summary_ta)
      ? doc.detailed_summary_ta
      : [],
    tags,
    assigned_departments: assignedDepartments,
    action_items: analysis.action_items || doc.action_items || [],
    llm_metadata: analysis.usage_metadata || doc.llm_metadata || {},
  });

  return tags;
};

const getDepartmentNames = async (departmentIds = []) => {
  const normalizedIds = Array.isArray(departmentIds)
    ? departmentIds.map((value) => Number.parseInt(value, 10)).filter((value) => Number.isInteger(value))
    : [];

  if (!normalizedIds.length) {
    return [];
  }

  const departments = await Department.findAll({
    where: { id: normalizedIds },
    attributes: ["id", "name"],
  });

  return departments.map((dept) => dept.name);
};

const ensureEmbeddings = async (doc) => {
  if (Array.isArray(doc.embeddings) && doc.embeddings.length > 0) {
    return doc.embeddings;
  }

  const embeddings = await buildDocumentEmbeddings(
    doc.raw_text || "",
    doc.file_name || "",
    doc.file_hash || ""
  );

  if (embeddings.length > 0) {
    try {
      await doc.update({ embeddings });
    } catch (error) {
      console.warn(`⚠️ Failed to persist embeddings for document ${doc.id}:`, error?.message || error);
    }
  }

  return embeddings;
};

const serializeDocumentPayload = async (doc, { message, deduplicated = false } = {}) => {
  const document = doc?.toJSON ? doc.toJSON() : doc;
  const embeddings = await ensureEmbeddings(doc);
  const assignedDepartmentNames = await getDepartmentNames(document.assigned_departments || []);

  return {
    success: true,
    message: message || "Document processed successfully.",
    deduplicated,
    document: {
      id: document.id,
      file_hash: document.file_hash,
      file_name: document.file_name,
      status: document.status,
      summary: {
        short_en: document.short_summary_en || "",
        detailed_en: Array.isArray(document.detailed_summary_en) ? document.detailed_summary_en : [],
        short_ml: document.short_summary_ml || "",
        short_hi: document.short_summary_hi || "",
        short_ta: document.short_summary_ta || "",
        detailed_ml: Array.isArray(document.detailed_summary_ml) ? document.detailed_summary_ml : [],
        detailed_hi: Array.isArray(document.detailed_summary_hi) ? document.detailed_summary_hi : [],
        detailed_ta: Array.isArray(document.detailed_summary_ta) ? document.detailed_summary_ta : [],
      },
      extracted_text: document.raw_text || "",
      embeddings,
      metadata: {
        file_type: document.file_type || null,
        file_size: document.file_size || null,
        uploaded_by: document.uploaded_by || null,
        language_detected: document.language_detected || null,
        ocr_confidence: document.ocr_confidence ?? null,
        priority: document.priority || null,
        document_type: document.document_type || null,
        document_class: document.document_class || null,
        compliance_critical: Boolean(document.compliance_critical),
        urgency_level: document.urgency_level || null,
        tags: Array.isArray(document.tags) ? document.tags : [],
        assigned_departments: assignedDepartmentNames,
        llm_metadata: document.llm_metadata || {},
        action_items: Array.isArray(document.action_items) ? document.action_items : [],
        routing_decision: document.routing_decision || null,
        routed_to_roles: Array.isArray(document.routed_to_roles) ? document.routed_to_roles : [],
        role_summaries: document.role_summaries || {},
      },
      timestamps: {
        created_at: document.createdAt || null,
        updated_at: document.updatedAt || null,
        completed_at: document.completed_at || null,
        routed_at: document.routed_at || null,
      },
    },
  };
};

const toArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const formatDepartmentList = (value) => {
  const list = toArray(value).map((item) => String(item || "").trim()).filter(Boolean);
  return list.length ? list.join(", ") : "Not assigned";
};

const sanitizePdfText = (text) =>
  String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .trim();

const buildWrappedLines = (text, font, fontSize, maxWidth) => {
  const rawLines = String(text || "").split("\n");
  const wrapped = [];

  for (const rawLine of rawLines) {
    const line = rawLine.replace(/\t/g, "  ").trimEnd();
    if (!line.trim()) {
      wrapped.push("");
      continue;
    }

    const words = line.split(/\s+/);
    let current = "";

    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      const width = font.widthOfTextAtSize(candidate, fontSize);

      if (width <= maxWidth) {
        current = candidate;
      } else {
        if (current) wrapped.push(current);
        current = word;
      }
    }

    if (current) wrapped.push(current);
  }

  return wrapped;
};

/**
 * GET /api/v1/documents/:id/report-pdf
 * Generate and download a Gemini-authored report as PDF
 */
export const downloadDocumentReportPdf = async (req, res) => {
  try {
    const { id } = req.params;
    const userContext = await getRequestUserContext(req);

    const doc = await Document.findByPk(id);

    if (!doc) {
      return res.status(404).json({ success: false, error: "Document not found" });
    }

    if (userContext?.role === "STAFF" && Number.isInteger(userContext.department_id)) {
      const assignedDepartments = Array.isArray(doc.assigned_departments)
        ? doc.assigned_departments.map((deptId) => Number.parseInt(deptId, 10))
        : [];

      if (!assignedDepartments.includes(userContext.department_id)) {
        return res.status(403).json({ success: false, error: "You do not have access to this document" });
      }
    }

    const sourceSummary = sanitizePdfText(doc.short_summary_en || "Summary not available.");
    const detailedSummary = toArray(doc.detailed_summary_en)
      .map((item) => `- ${sanitizePdfText(item)}`)
      .join("\n");

    const prompt = [
      "Create a professional enterprise document report for KMRL.",
      "Return plain text only. No markdown code fences.",
      "Use these exact section headers on separate lines:",
      "Executive Summary",
      "Document Snapshot",
      "Operational Insights",
      "Risk and Compliance Notes",
      "Recommended Actions",
      "Keep it concise, factual, and business-friendly.",
      "Document data:",
      `Document ID: ${doc.id}`,
      `File Name: ${doc.file_name || "Unknown"}`,
      `Status: ${doc.status || "Unknown"}`,
      `Priority: ${doc.priority || "NORMAL"}`,
      `Document Type: ${doc.document_type || "Not specified"}`,
      `Document Class: ${doc.document_class || "Not specified"}`,
      `Language: ${doc.language_detected || "Unknown"}`,
      `OCR Confidence: ${doc.ocr_confidence ?? 0}%`,
      `Urgency: ${doc.urgency_level || "INFORMATIONAL"}`,
      `Compliance Critical: ${doc.compliance_critical ? "Yes" : "No"}`,
      `Tags: ${toArray(doc.tags).join(", ") || "None"}`,
      `Assigned Departments: ${formatDepartmentList(doc.assigned_departments)}`,
      `Short Summary: ${sourceSummary}`,
      "Detailed Summary Points:",
      detailedSummary || "- Not available",
      `Extracted Text Sample: ${sanitizePdfText(String(doc.raw_text || "").slice(0, 1800))}`,
    ].join("\n");

    const aiResult = await generate(prompt);
    const aiReportText = sanitizePdfText(aiResult?.text);

    if (!aiReportText) {
      throw new Error("Gemini returned an empty report.");
    }

    const pdfDoc = await PDFDocument.create();
    const normalFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pageWidth = 595.28; // A4 width in points
    const pageHeight = 841.89; // A4 height in points
    const marginX = 42;
    const topMargin = 56;
    const bottomMargin = 48;
    const lineHeight = 16;
    const headingSize = 12;
    const bodySize = 10;
    const contentWidth = pageWidth - marginX * 2;

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    const pages = [page];
    let cursorY = pageHeight - topMargin;

    const addNewPage = () => {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      pages.push(page);
      cursorY = pageHeight - topMargin;
    };

    const drawHeader = () => {
      page.drawText("KMRL Document Report", {
        x: marginX,
        y: pageHeight - 34,
        size: 13,
        font: boldFont,
        color: rgb(0.09, 0.18, 0.33),
      });

      page.drawText(`Generated: ${new Date().toLocaleString()}`, {
        x: marginX,
        y: pageHeight - 50,
        size: 9,
        font: normalFont,
        color: rgb(0.35, 0.35, 0.35),
      });
    };

    drawHeader();

    const writeWrappedText = (text, { isHeading = false } = {}) => {
      const font = isHeading ? boldFont : normalFont;
      const size = isHeading ? headingSize : bodySize;
      const lines = buildWrappedLines(text, font, size, contentWidth);

      for (const line of lines) {
        if (cursorY < bottomMargin) {
          addNewPage();
          drawHeader();
        }

        if (!line) {
          cursorY -= lineHeight * 0.6;
          continue;
        }

        page.drawText(line, {
          x: marginX,
          y: cursorY,
          size,
          font,
          color: rgb(0.12, 0.12, 0.12),
        });

        cursorY -= lineHeight;
      }
    };

    writeWrappedText(`Document ID: ${doc.id}`, { isHeading: false });
    writeWrappedText(`File Name: ${doc.file_name || "Unknown"}`, { isHeading: false });
    writeWrappedText(`Status: ${doc.status || "Unknown"} | Priority: ${doc.priority || "NORMAL"}`, {
      isHeading: false,
    });
    writeWrappedText("");

    const reportLines = aiReportText.split("\n");
    const sectionHeaders = new Set([
      "Executive Summary",
      "Document Snapshot",
      "Operational Insights",
      "Risk and Compliance Notes",
      "Recommended Actions",
    ]);

    for (const line of reportLines) {
      const trimmed = line.trim();
      if (!trimmed) {
        writeWrappedText("");
        continue;
      }

      const isHeading = sectionHeaders.has(trimmed);
      writeWrappedText(trimmed, { isHeading });
      if (isHeading) {
        writeWrappedText("");
      }
    }

    pages.forEach((pdfPage, index) => {
      pdfPage.drawText(`Page ${index + 1} of ${pages.length}`, {
        x: pageWidth - marginX - 82,
        y: 24,
        size: 9,
        font: normalFont,
        color: rgb(0.45, 0.45, 0.45),
      });
    });

    const pdfBytes = await pdfDoc.save();
    const filename = `KMRL_Report_${doc.id}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=\"${filename}\"`);
    return res.status(200).send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error("❌ PDF report generation failed:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate report PDF",
      details: error.message,
    });
  }
};

/**
 * POST /api/documents/process
 * Upload and process a document (OCR + summarization + classification)
 */
export const processDocument = async (req, res) => {
  try {
    console.log("🔍 processDocument called");
    console.log("req.file:", req.file ? `${req.file.originalname} (${req.file.size} bytes)` : "No file");
    console.log("req.body:", req.body);
    
    if (!req.file) {
      console.log("❌ No file uploaded");
      return res.status(400).json({
        success: false,
        error: "No file uploaded",
      });
    }

    // ===== File type validation =====
    const fileExt = req.file.originalname
      .toLowerCase()
      .substring(req.file.originalname.lastIndexOf("."));

    if (!ALLOWED_FILE_EXTENSIONS.includes(fileExt)) {
      return res.status(400).json({
        success: false,
        error: "Invalid file type. Allowed types: pdf, word, txt, images",
      });
    }

    const employeeId = req.body.employeeId
      ? parseInt(req.body.employeeId)
      : null;

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        error: "Missing employeeId in form data",
      });
    }

    console.log(`📄 Processing uploaded document: ${req.file.originalname}`);

    // Calculate Hash
    const fileHash = await calculateFileHash(req.file.path);

    const existingDocument = await Document.findOne({
      where: { file_hash: fileHash },
      order: [["updatedAt", "DESC"]],
    });

    if (existingDocument) {
      console.log(`♻️ Duplicate hash detected for ${req.file.originalname}. Returning stored result.`);

      try {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      } catch (e) {
        console.warn("⚠️ Failed to clean up duplicate temp file:", e?.message || e);
      }

      return res.status(200).json(
        await serializeDocumentPayload(existingDocument, {
          message: "This document was already processed.",
          deduplicated: true,
        })
      );
    }

    // =========================================================
    // SCENARIO C: NEW UPLOAD
    // =========================================================

    //  STEP 0 — Upload file to Supabase
    // FIX: Using Supabase Storage for document uploading.
    // Ensures documents are stored and retrievable via Supabase CDN.
    console.log("📤 Uploading file to local storage...");
    console.log("DEBUG: uploadToSupabase function:", typeof uploadToSupabase);
    let supabaseResult;
    try {
      supabaseResult = await uploadToSupabase(req.file);
      console.log("✔ File uploaded successfully:", supabaseResult.url);
    } catch (uploadErr) {
      console.error("❌ Upload error:", uploadErr.message);
      throw uploadErr;
    }

    // FIX: Attach file URL to request object so it can be saved in the database.
    req.file.url = supabaseResult.url;
    console.log("✔ File URL attached:", req.file.url);

    // 1. Extract Metadata
    console.log("📊 [Step 1] Extracting metadata...");
    const metadata = await metadataExtractor.extract(req.file);

    // 2. Create DB Record (Status: UPLOADED)
    const newDoc = await Document.create({
      storage_url: req.file.url,
      uploaded_by: employeeId,
      file_hash: fileHash,
      status: "UPLOADED",
      ...metadata,
    });

    console.log(
      `✅ Document ID ${newDoc.id} created. Triggering background processor.`
    );

    // 3. Trigger Background Processing (Fire & Forget)
    // We pass the ID so the processor knows which record to update.
    documentProcessor(newDoc.id, req.file, fileHash).catch((err) => {
      console.error(`Background worker failed for ID ${newDoc.id}`, err);
    });

    // 4. Return Immediate Response
    return res.status(202).json({
      success: true,
      document_id: newDoc.id,
      file_hash: fileHash,
      message: "File uploaded. Processing started in background.",
      status: "UPLOADED",
    });
  } catch (error) {
    console.error("❌ Document upload failed:", error.message);
    console.error("Stack trace:", error.stack);
    res.status(500).json({
      success: false,
      error: error.message || "Document processing failed",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

/**
 * GET /api/documents
 * Paginated list of documents with filters
 */
export const getDocuments = async (req, res) => {
  try {
    const userContext = await getRequestUserContext(req);
    const {
      page = 1,
      limit = 10,
      department,
      priority,
      status,
      search,
    } = req.query;

    const where = {};

    if (department) {
      where.assigned_departments = { [Op.contains]: [department] }; // ARRAY contains
    }

    applyStaffDepartmentScope(where, userContext);

    if (priority) {
      where.priority = priority.toUpperCase();
    }

    if (status) {
      where.status = status.toUpperCase();
    }

    if (search) {
      where[Op.or] = [
        { file_name: { [Op.iLike]: `%${search}%` } },
        { short_summary_en: { [Op.iLike]: `%${search}%` } },
        { detailed_summary_en: { [Op.overlap]: [search] } }, //=>using iLike would have caused crash as it is an array
        { tags: { [Op.overlap]: [search] } },
      ];
    }

    const offset = (page - 1) * limit;

    let { rows, count } = await Document.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset,
      attributes: { exclude: ["raw_text"] },
    });

    // Auto-translate missing summaries for completed documents
    rows = await Promise.all(rows.map(async (doc) => {
      if (doc.status === "COMPLETED" && doc.short_summary_en && needsTranslation(doc)) {
        try {
          const translations = await translateSummaries(doc);
          
          // Update document with translations
          await doc.update({
            short_summary_ml: translations.short_summary_ml || doc.short_summary_ml,
            short_summary_hi: translations.short_summary_hi || doc.short_summary_hi,
            short_summary_ta: translations.short_summary_ta || doc.short_summary_ta,
            detailed_summary_ml: translations.detailed_summary_ml || doc.detailed_summary_ml,
            detailed_summary_hi: translations.detailed_summary_hi || doc.detailed_summary_hi,
            detailed_summary_ta: translations.detailed_summary_ta || doc.detailed_summary_ta,
          });
        } catch (translationErr) {
          console.error(`⚠️ Translation failed for doc ${doc.id}:`, translationErr);
          // Continue - fallback to English
        }
      }
      return doc;
    }));

    res.json({
      success: true,
      documents: rows,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(count / limit),
        total_documents: count,
        has_next: page * limit < count,
        has_prev: page > 1,
      },
    });
  } catch (error) {
    console.error("Get documents failed:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch documents",
    });
  }
};

/**
 * GET /api/documents/:id
 */
export const getDocumentById = async (req, res) => {
  try {
    const userContext = await getRequestUserContext(req);
    let doc = await Document.findByPk(req.params.id);

    if (!doc) {
      return res
        .status(404)
        .json({ success: false, error: "Document not found" });
    }

    if (userContext?.role === "STAFF" && Number.isInteger(userContext.department_id)) {
      const assignedDepartments = Array.isArray(doc.assigned_departments)
        ? doc.assigned_departments.map((deptId) => Number.parseInt(deptId, 10))
        : [];

      if (!assignedDepartments.includes(userContext.department_id)) {
        return res.status(403).json({
          success: false,
          error: "You do not have access to this document",
        });
      }
    }

    if (needsAutoRepair(doc) && doc.raw_text && String(doc.raw_text).trim()) {
      console.log(`🛠️ Document ${doc.id} is missing summary/tags/departments. Repairing now...`);

      try {
        const analysis = await analyzeDocument(doc.raw_text);
        await applyAnalysisUpdate(doc, analysis, doc.raw_text);
        console.log(`✅ Document ${doc.id} analysis repaired.`);
      } catch (repairErr) {
        console.error(`⚠️ Repair failed for document ${doc.id}:`, repairErr);
      }
    }

    // Check if document is missing translations
    if (doc.status === "COMPLETED" && doc.short_summary_en && needsTranslation(doc)) {
      console.log(`📝 Document ${doc.id} is missing translations. Translating now...`);

      try {
        const translations = await translateSummaries(doc);

        // Update document with all language translations
        await doc.update({
          short_summary_ml: translations.short_summary_ml || doc.short_summary_ml,
          short_summary_hi: translations.short_summary_hi || doc.short_summary_hi,
          short_summary_ta: translations.short_summary_ta || doc.short_summary_ta,
          detailed_summary_ml: translations.detailed_summary_ml || doc.detailed_summary_ml,
          detailed_summary_hi: translations.detailed_summary_hi || doc.detailed_summary_hi,
          detailed_summary_ta: translations.detailed_summary_ta || doc.detailed_summary_ta,
        });

        console.log(`✅ Translations saved for document ${doc.id}`);
      } catch (translationErr) {
        console.error(`⚠️ Translation failed for document ${doc.id}:`, translationErr);
        // Continue anyway - user will see English fallback
      }
    }

    // 1. Get IDs from document
    const departmentIds = doc.assigned_departments || [];

    // 2. Fetch Department Names
    const departments = await Department.findAll({
      where: { id: departmentIds },
      attributes: ["name"], // We only need the name
    });

    // 3. Convert doc to JSON and replace IDs with Names array
    const documentData = doc.toJSON();

    // Maps to: ["Metro Operations", "Safety & Security"]
    documentData.assigned_departments = departments.map((d) => d.name);

    res.json({ success: true, document: documentData });
  } catch (error) {
    console.error("Get document by ID failed:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch document",
    });
  }
};

/**
 * DELETE /api/documents/:id
 */
export const deleteDocumentById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[DELETE] Attempting to delete document with ID: ${id}`);

    if (!id || isNaN(id)) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid document ID" 
      });
    }

    const deleted = await Document.destroy({ 
      where: { id: parseInt(id) } 
    });

    console.log(`[DELETE] Delete result: ${deleted} row(s) deleted`);

    if (!deleted) {
      return res.status(404).json({ 
        success: false, 
        error: "Document not found" 
      });
    }

    console.log(`[DELETE] Document ${id} deleted successfully`);
    res.json({ 
      success: true, 
      message: "Document deleted successfully" 
    });
  } catch (error) {
    console.error("Delete document failed:", error.message);
    console.error("Full error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete document: " + error.message,
    });
  }
};

/**
 * GET /api/documents/search?q=
 * Full-text AI search + filters
 */
export const searchDocuments = async (req, res) => {
  try {
    const userContext = await getRequestUserContext(req);
    const {
      q,
      department,
      priority,
      language,
      file_type,
      dateFrom,
      dateTo,
      limit = 100,
    } = req.query;

    const where = {};

    const searchTerm = (q || "").trim();
    if (searchTerm) {
      const arr = [searchTerm];
      where[Op.or] = [
        { file_name: { [Op.iLike]: `%${searchTerm}%` } },
        { short_summary_en: { [Op.iLike]: `%${searchTerm}%` } },
        { short_summary_ml: { [Op.iLike]: `%${searchTerm}%` } },
        { short_summary_hi: { [Op.iLike]: `%${searchTerm}%` } },
        { short_summary_ta: { [Op.iLike]: `%${searchTerm}%` } },
        { raw_text: { [Op.iLike]: `%${searchTerm}%` } },
        { detailed_summary_en: { [Op.overlap]: arr } },
        { detailed_summary_ml: { [Op.overlap]: arr } },
        { detailed_summary_hi: { [Op.overlap]: arr } },
        { detailed_summary_ta: { [Op.overlap]: arr } },
        { tags: { [Op.overlap]: arr } },
      ];
    }

    if (department) {
      where.assigned_departments = { [Op.contains]: [department] };
    }

    applyStaffDepartmentScope(where, userContext);

    if (priority) {
      where.priority = priority.toUpperCase();
    }

    if (language) {
      where.language_detected = language;
    }

    if (file_type) {
      where.file_type = file_type.includes("/")
        ? file_type
        : { [Op.iLike]: `%${file_type}%` };
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt[Op.gte] = new Date(dateFrom);
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setDate(endDate.getDate() + 1);
        where.createdAt[Op.lt] = endDate;
      }
    }

    const results = await Document.findAll({
      where,
      limit: parseInt(limit),
      order: [["updatedAt", "DESC"]],
      attributes: { exclude: ["raw_text"] },
    });

    return res.json({
      success: true,
      query: searchTerm || "all documents",
      results: results.length,
      documents: results,
    });
  } catch (error) {
    console.error("Search failed:", error);
    return res.status(500).json({
      success: false,
      error: "Search failed: " + error.message,
    });
  }
};

/**
 * GET /api/documents/analytics
 */
export const getAnalytics = async (req, res) => {
  try {
    const userContext = await getRequestUserContext(req);
    const analyticsWhere = {};
    applyStaffDepartmentScope(analyticsWhere, userContext);

    const docs = await Document.findAll({
      where: analyticsWhere,
      attributes: ["status", "priority", "assigned_departments"],
    });

    const statusMap = new Map();
    const priorityMap = new Map();
    const departmentMap = new Map();

    for (const doc of docs) {
      const status = doc.status || "UNKNOWN";
      const priority = doc.priority || "NORMAL";

      statusMap.set(status, (statusMap.get(status) || 0) + 1);
      priorityMap.set(priority, (priorityMap.get(priority) || 0) + 1);

      const departments = Array.isArray(doc.assigned_departments) ? doc.assigned_departments : [];
      departments.forEach((department) => {
        const name = String(department || "").trim();
        if (!name) return;
        departmentMap.set(name, (departmentMap.get(name) || 0) + 1);
      });
    }

    res.json({
      success: true,
      analytics: {
        total_documents: docs.length,
        status_distribution: Array.from(statusMap.entries()).map(([status, count]) => ({ status, count })),
        priority_distribution: Array.from(priorityMap.entries()).map(([priority, count]) => ({ priority, count })),
        department_distribution: Array.from(departmentMap.entries()).map(([department, count]) => ({ department, count })),
      },
    });
  } catch (error) {
    console.error("Analytics failed:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch analytics",
    });
  }
};

/**
 * POST /api/documents/:id/reprocess
 * Re-run LLM analysis on an existing document
 */
export const reprocessDocument = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🔄 Reprocessing document ID: ${id}`);
    
    // Find the document
    const doc = await Document.findByPk(id);
    
    if (!doc) {
      return res.status(404).json({
        success: false,
        error: "Document not found",
      });
    }
    
    // Check if document has raw_text
    if (!doc.raw_text || doc.raw_text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Document has no extracted text to analyze",
      });
    }
    
    console.log("🤖 Re-running AI analysis...");
    
    // Re-run LLM analysis and normalize tags/departments so the details page is never blank.
    const analysis = await analyzeDocument(doc.raw_text);
    await applyAnalysisUpdate(doc, analysis, doc.raw_text);

    // Ensure translations are present after a repair/reprocess pass.
    try {
      if (needsTranslation(doc)) {
        const translations = await translateSummaries(doc);
        await doc.update({
          short_summary_ml: translations.short_summary_ml || doc.short_summary_ml,
          short_summary_hi: translations.short_summary_hi || doc.short_summary_hi,
          short_summary_ta: translations.short_summary_ta || doc.short_summary_ta,
          detailed_summary_ml: translations.detailed_summary_ml || doc.detailed_summary_ml,
          detailed_summary_hi: translations.detailed_summary_hi || doc.detailed_summary_hi,
          detailed_summary_ta: translations.detailed_summary_ta || doc.detailed_summary_ta,
        });
      }
    } catch (translationErr) {
      console.error(`⚠️ Translation refresh failed for document ${id}:`, translationErr);
    }
    
    console.log(`✅ Document ${id} reprocessed successfully`);
    
    // Return updated document
    const updated = await Document.findByPk(id, {
      attributes: { exclude: ["raw_text"] },
    });
    
    return res.json({
      success: true,
      message: "Document reprocessed successfully",
      document: updated,
    });
  } catch (error) {
    console.error("Reprocess failed:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to reprocess document",
      details: error.message,
    });
  }
};
