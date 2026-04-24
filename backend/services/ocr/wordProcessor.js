import mammoth from "mammoth";
import fs from "fs";
import { detectLanguage } from "../utils.js";
import { cleanExtractedText } from "./utils.js";

/**
 * Process .docx Word files
 * Extracts text using Mammoth (not OCR, direct text parsing)
 * @param {Object} file - uploaded file (req.file)
 * @returns {Promise<Object>} structured result similar to OCR outputs
 */
async function processWordFile(file) {
  console.log("📝 Processing Word document...");

  try {
    // Ensure file exists
    if (!fs.existsSync(file.path)) {
      throw new Error("File not found on disk");
    }

    // Read buffer and extract text
    const buffer = fs.readFileSync(file.path);
    const { value: rawText } = await mammoth.extractRawText({ buffer });

    if (!rawText || rawText.trim().length === 0) {
      throw new Error("No readable text found in Word document");
    }

    // Clean and postprocess extracted text
    const cleanedText = cleanExtractedText(rawText);
    const detectedLanguage = detectLanguage(cleanedText);

    console.log(
      `Word document processed successfully - ${cleanedText.length} characters`
    );

    return {
      text: cleanedText,
      confidence: 1.0, // direct text extraction (no OCR uncertainty)
      language: detectedLanguage,
      word_count: cleanedText.split(/\s+/).filter(Boolean).length,
      character_count: cleanedText.length,
      method: "mammoth",
    };
  } catch (error) {
    console.error("❌ Word document processing failed:", error);
    throw new Error(`Word document processing failed: ${error.message}`);
  }
}

export default processWordFile;
