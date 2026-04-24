import fs from "fs";
import { promises as fsPromises } from "fs";
import PdfParse from "pdf-parse";
import pLimit from "p-limit";
import convertPdfToImages from "./utils/convertPdfToImages.js";
import hasImages from "./utils/detectImages.js";
import { extractText } from "./ocrEngine.js";
import { detectLanguage } from "../utils.js";
import { cleanExtractedText } from "./utils.js";
import os from "os";

/**
 * Concurrency Limit for Parallel OCR.
 * Calculated as (CPU Cores + 1) to maximize throughput without blocking the Event Loop.
 * This balances CPU-heavy OCR tasks with I/O operations (reading files).
 */
const CONCURRENCY_LIMIT = Math.min(5, os.cpus().length + 1);

/**
 * Orchestrates the PDF processing pipeline.
 *
 * Implements a "Hybrid Strategy":
 * 1. Checks if the PDF contains images (scanned content).
 * 2. If NO images: Attempts fast digital text extraction.
 * 3. If images found OR digital extraction fails: Fallbacks to high-accuracy OCR.
 *
 * @param {object} file - The file object received from the upload middleware (Multer).
 * @param {string} file.path - Absolute path to the uploaded file.
 * @param {string} file.originalname - Original name of the uploaded file.
 *
 * @returns {Promise<{
 * text: string,
 * confidence: number,
 * language: string,
 * word_count: number,
 * character_count: number,
 * method: string
 * }>} The extracted text data and processing statistics.
 *
 * @throws {Error} If file processing fails at a critical stage.
 */
export default async function processPDFFile(file) {
  const filepath = file.path;
  console.log(`📄 Processing PDF: ${file.originalname}`);

  let textContent = "";
  let methodUsed = null;
  let confidence = 1.0;

  try {
    // Read file buffer asynchronously to avoid blocking the event loop
    const fileBuffer = await fsPromises.readFile(filepath);

    // ----------------------------------------------------
    // STEP 1: Detect Images (Pure JS Check)
    // ----------------------------------------------------
    const containsImages = await hasImages(fileBuffer);
    console.log(
      `🔍 PDF Analysis: Contains Images? ${containsImages ? "YES" : "NO"}`
    );

    // ----------------------------------------------------
    // STEP 2: Logic Flow
    // ----------------------------------------------------

    // CASE A: Pure Text PDF
    // If no images are detected, we assume it's a digital PDF.
    if (!containsImages) {
      try {
        const pdfData = await PdfParse(fileBuffer);
        textContent = pdfData.text.trim();
        methodUsed = "digital_extraction";
        console.log("⚡ Digital text extracted.");
      } catch (e) {
        console.warn("⚠️ Digital extraction failed. Fallback to OCR.");
      }
    }

    // CASE B: Hybrid/Scanned PDF (Images detected OR digital text failed)
    if (containsImages || !textContent) {
      console.log("📸 Images detected. Switching to Parallel OCR...");

      // 1. Convert PDF to Image files (High-Res PNGs recommended for accuracy)
      const pages = await convertPdfToImages(filepath);
      console.log(`🚀 Starting OCR on ${pages.length} pages...`);

      // 2. Initialize Concurrency Manager
      const limit = pLimit(CONCURRENCY_LIMIT);

      // Track progress
      let completedPages = 0;
      const totalPages = pages.length;

      // 3. Map pages to specific OCR tasks
      const ocrPromises = pages.map((pagePath, index) => {
        // limit(...) ensures we only process X pages at a time to save RAM
        return limit(async () => {
          try {
            // Read image asynchronously
            const rawBuffer = await fsPromises.readFile(pagePath);

            // Extract text using Tesseract Scheduler
            const result = await extractText(rawBuffer);

            completedPages++;
            // Log progress every 5 pages or on last page
            if (completedPages % 5 === 0 || completedPages === totalPages) {
              console.log(`📄 OCR Progress: ${completedPages}/${totalPages} pages (${Math.round(completedPages/totalPages*100)}%)`);
            }

            return { text: result.text, confidence: result.confidence };
          } catch (err) {
            console.error(`❌ Error OCRing page ${index + 1}:`, err);
            completedPages++;
            return { text: "", confidence: 0 };
          } finally {
            // 🛑 CLEANUP: Guarantee temp file deletion.
            // This runs whether OCR succeeds OR fails to prevent disk filling up.
            try {
              if (fs.existsSync(pagePath)) fs.unlinkSync(pagePath);
            } catch (e) {
              /* ignore unlink errors */
            }
          }
        });
      });

      // 4. Wait for all batches to finish
      // Promise.all preserves page order (Page 1 result is always index 0)
      const results = await Promise.all(ocrPromises);

      // 5. Aggregate Results
      // Join with double newline to clearly separate pages
      textContent = results.map((r) => r.text).join("\n\n");

      // Calculate average confidence across all pages
      const totalConf = results.reduce((sum, r) => sum + r.confidence, 0);
      confidence = pages.length > 0 ? totalConf / pages.length : 0;

      methodUsed = containsImages ? "ocr_hybrid" : "ocr_fallback";
    }

    // ----------------------------------------------------
    // STEP 3: Final Cleanup & Stats
    // ----------------------------------------------------
    const cleaned = cleanExtractedText(textContent);

    console.log(`✅ Processing Complete via [${methodUsed}]`);
    console.log(`📊 Accuracy: ${confidence.toFixed(2)}%`);

    return {
      text: cleaned,
      confidence: parseFloat(confidence.toFixed(2)),
      language: detectLanguage(cleaned),
      word_count: cleaned.split(/\s+/).filter(Boolean).length,
      character_count: cleaned.length,
      method: methodUsed,
    };
  } catch (error) {
    console.error("❌ PDF processing failed:", error);
    throw new Error(`PDF processing failed: ${error.message}`);
  }
}
