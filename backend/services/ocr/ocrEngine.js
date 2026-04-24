import Tesseract from "tesseract.js";
import os from "os";

/**
 * @module OCREngine
 * @description Manages a pool of Tesseract workers to perform OCR tasks efficiently.
 * Utilizing a scheduler prevents the overhead of re-initializing workers for every page.
 */

// 1. Create the Scheduler to manage the worker queue
const scheduler = Tesseract.createScheduler();

// Track initialization state
let isSchedulerReady = false;

// Determine worker count: Use 4 or the number of CPU cores, whichever is smaller.
// This prevents freezing the server CPU on smaller instances.
const WORKER_COUNT = Math.min(4, os.cpus().length);

/**
 * Initializes the Tesseract Worker Pool.
 * Creates workers once and keeps them in memory for reuse.
 * Supports multilingual OCR: English, Malayalam, Hindi, Tamil
 * @returns {Promise<void>}
 */
async function initWorkerPool() {
  if (isSchedulerReady) return;

  console.log(`⚙️ Initializing OCR Worker Pool (${WORKER_COUNT} Workers)...`);

  try {
    // Configure workers for multilingual support (eng+mal+hin+tam)
    // Using '+' delimiter for combined language models
    const languageConfig = 'eng+mal+hin+tam';
    
    for (let i = 0; i < WORKER_COUNT; i++) {
      const worker = await Tesseract.createWorker(languageConfig);
      scheduler.addWorker(worker);
    }

    isSchedulerReady = true;
    console.log("✅ OCR Worker Pool Ready (English, Malayalam, Hindi, Tamil supported).");
  } catch (error) {
    console.error("❌ Failed to initialize OCR Worker Pool:", error);
  }
}

// Initialize immediately on server startup
initWorkerPool();

/**
 * Extracts text from an image buffer using the worker pool.
 *
 * @param {Buffer} imageBuffer - The raw image buffer (PNG/JPG).
 * @returns {Promise<{text: string, confidence: number, method: string}>} extracted text and stats.
 */
export async function extractText(imageBuffer) {
  // Defensive check: Ensure pool is ready
  if (!isSchedulerReady) await initWorkerPool();

  try {
    // .addJob() automatically routes the task to the next available free worker
    const {
      data: { text, confidence },
    } = await scheduler.addJob("recognize", imageBuffer);

    return {
      text: text ? text.trim() : "",
      confidence: confidence,
      method: "ocr",
    };
  } catch (error) {
    console.error("❌ OCR Job Error:", error);
    return { text: "", confidence: 0, method: "ocr_failed" };
  }
}

/**
 * Terminates the worker pool.
 * Useful for graceful shutdowns (e.g., when stopping the server).
 */
export async function terminatePool() {
  console.log("🛑 Terminating OCR Worker Pool...");
  await scheduler.terminate();
}
