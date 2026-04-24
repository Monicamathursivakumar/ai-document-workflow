import fs from "fs";
import path from "path";
// Use legacy build for Node.js environment compatibility
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas } from "@napi-rs/canvas";

// Configure the PDF.js worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = import.meta.resolve(
  "pdfjs-dist/legacy/build/pdf.worker.mjs"
);

/**
 * Implements the PDF.js CanvasFactory interface.
 * Intercepts canvas creation calls to use @napi-rs/canvas (server-side)
 * instead of the standard HTML DOM Canvas.
 */
class NodeCanvasFactory {
  create(width, height) {
    if (width <= 0 || height <= 0) {
      throw new Error("Invalid canvas size");
    }
    const canvas = createCanvas(width, height);
    const context = canvas.getContext("2d");
    return {
      canvas: canvas,
      context: context,
    };
  }

  reset(canvasAndContext, width, height) {
    if (!canvasAndContext.canvas) {
      throw new Error("Canvas is not specified");
    }
    if (width <= 0 || height <= 0) {
      throw new Error("Invalid canvas size");
    }
    const canvas = canvasAndContext.canvas;
    canvas.width = width;
    canvas.height = height;
  }

  destroy(canvasAndContext) {
    if (!canvasAndContext.canvas) {
      throw new Error("Canvas is not specified");
    }
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}

/**
 * Converts a PDF file into a series of PNG images.
 * Uses PDF.js with a Node.js-compatible canvas implementation.
 *
 * @param {string} pdfPath - Absolute path to the source PDF file.
 * @returns {Promise<string[]>} - Array of file paths to the generated PNG images.
 */
export default async function convertPdfToImages(pdfPath) {
  const outputDir = path.dirname(pdfPath);
  const baseName = path.basename(pdfPath, path.extname(pdfPath));

  console.log(`🔄 Converting PDF to images (PDF.js Legacy + Napi-RS)...`);

  try {
    const buffer = fs.readFileSync(pdfPath);
    const data = new Uint8Array(buffer);

    // Load Document using the custom NodeCanvasFactory
    const loadingTask = pdfjsLib.getDocument({
      data,
      canvasFactory: new NodeCanvasFactory(),
    });

    const pdfDocument = await loadingTask.promise;
    const generatedFiles = [];

    for (let i = 1; i <= pdfDocument.numPages; i++) {
      const page = await pdfDocument.getPage(i);

      // Scale 2.0 provides approx 150 DPI, suitable for OCR accuracy
      const viewport = page.getViewport({ scale: 2.0 });

      const canvasFactory = new NodeCanvasFactory();
      const { canvas, context } = canvasFactory.create(
        viewport.width,
        viewport.height
      );

      await page.render({
        canvasContext: context,
        viewport: viewport,
        canvasFactory: canvasFactory,
      }).promise;

      const fileName = `page-${baseName}-${i}.png`;
      const filePath = path.join(outputDir, fileName);
      const pngBuffer = await canvas.encode("png");

      fs.writeFileSync(filePath, pngBuffer);
      generatedFiles.push(filePath);

      page.cleanup();
    }

    console.log(`🖼 Converted ${generatedFiles.length} pages.`);
    return generatedFiles;
  } catch (err) {
    console.error("❌ PDF Conversion Failed:", err);
    throw new Error(`PDF conversion failed: ${err.message}`);
  }
}
