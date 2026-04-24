import fs from "fs";
import { detectLanguage } from "../utils.js";
import { cleanExtractedText } from "./utils.js";
import { extractText } from "./ocrEngine.js";

/**
 * Process image files using OCR (delegated to ocrEngine)
 * @param {Object} file - File object (with path, originalname, etc.)
 * @returns {Promise<Object>} Extracted text info
 */
async function processImageFile(file) {
  try {
    console.log(`🖼️ Processing image with OCR engine...`);

    // 🔹 Read image file as buffer for OCR engine
    const imageBuffer = fs.readFileSync(file.path);
    
    // 🔹 Use centralized OCR adapter with buffer
    const { text: rawText, confidence, method } = await extractText(imageBuffer);

    // 🔹 Clean and analyze extracted text
    const cleanedText = cleanExtractedText(rawText);
    const detectedLanguage = detectLanguage(cleanedText);

    console.log(
      `OCR completed via ${method} - Confidence: ${Math.round(
        confidence * 100
      )}%`
    );

    return {
      text: cleanedText,
      confidence: parseFloat(confidence.toFixed(2)),
      language: detectedLanguage,
      word_count: cleanedText.split(/\s+/).filter(Boolean).length,
      character_count: cleanedText.length,
      method,
    };
  } catch (error) {
    console.error("OCR image processing failed:", error);
    throw new Error(`OCR processing failed: ${error.message}`);
  }
}

export default processImageFile;
