import fs from "fs";
import path from "path";
import { detectLanguage } from "../utils.js";
import { cleanExtractedText, isReadableText } from "./utils.js";

import processTextFile from "./textProcessor.js";
import processPDFFile from "./pdfProcessor.js";
import processImageFile from "./imageProcessor.js";
import processWordFile from "./wordProcessor.js";

/**
 * Master entrypoint for OCR text extraction.
 * Routes file to correct processor based on extension.
 *
 * @param {Object} file - File object (req.file from multer)
 * @returns {Promise<Object>} Processed text result
 */
async function process(file) {
  console.log(`🔍 Starting text extraction for: ${file.originalname}`);

  try {
    const fileExtension = path.extname(file.originalname).toLowerCase();

    switch (fileExtension) {
      // 📝 Plain text file
      case ".txt":
        return await processTextFile(file);

      // 📄 PDF (digital or scanned)
      case ".pdf":
        return await processPDFFile(file);

      // 🖼️ Images
      case ".jpg":
      case ".jpeg":
      case ".png":
      case ".gif":
      case ".bmp":
      case ".tiff":
      case ".webp":
        return await processImageFile(file);

      // 🧾 Word document (optional)
      case ".docx":
        return await processWordFile(file);

      // ❓ Anything else — try to read as plain text
      default:
        return await processUnknownFile(file);
    }
  } catch (error) {
    console.error("❌ Text extraction failed:", error);

    return {
      text: "",
      confidence: 0,
      language: "unknown",
      word_count: 0,
      character_count: 0,
      error: `Text extraction failed: ${error.message}`,
    };
  }
}

/**
 * Fallback processor for unknown or unrecognized file types.
 * Attempts plain-text read first, then cleans/normalizes.
 */
async function processUnknownFile(file) {
  try {
    console.log("❓ Attempting to read unknown file type as text...");

    const text = fs.readFileSync(file.path, "utf8");

    // Check if text looks readable
    if (isReadableText(text)) {
      const cleanedText = cleanExtractedText(text);
      const detectedLanguage = detectLanguage(cleanedText);

      console.log("✅ Successfully read unknown file as text");

      return {
        text: cleanedText,
        confidence: 0.9, // Good confidence (non-OCR)
        language: detectedLanguage,
        word_count: cleanedText.split(/\s+/).filter(Boolean).length,
        character_count: cleanedText.length,
        method: "text_fallback",
      };
    } else {
      throw new Error("File does not contain readable text");
    }
  } catch (error) {
    console.error("❌ Unknown file type processing failed:", error);
    return {
      text: "",
      confidence: 0,
      language: "unknown",
      word_count: 0,
      character_count: 0,
      error: `Unknown file type processing failed: ${error.message}`,
      method: "fallback_failed",
    };
  }
}

export default process;
