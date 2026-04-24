import { PDFDocument, PDFName } from "pdf-lib";

/**
 * Checks if a PDF buffer contains any embedded images.
 * Uses pure JavaScript (pdf-lib) - No Canvas/System dependencies.
 *
 * @param {Buffer} pdfBuffer - The raw buffer of the PDF file.
 * @returns {Promise<boolean>} - True if at least one image is found.
 */
export default async function hasImages(pdfBuffer) {
  try {
    // Load the PDF without rendering it (fast)
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];

      // Get resources associated with the page
      const { Resources } = page.node;
      if (!Resources) continue;

      // Look for XObjects (External Objects, which include Images)
      const xObjects = Resources.get(PDFName.of("XObject"));

      if (xObjects) {
        // Iterate through all XObjects to check if any are images
        const xObjectKeys = xObjects.keys();
        for (const key of xObjectKeys) {
          const xObject = xObjects.get(key);
          const subtype = xObject.get(PDFName.of("Subtype"));

          // If we find an Image subtype, stop and return true
          if (subtype === PDFName.of("Image")) {
            return true;
          }
        }
      }
    }

    return false;
  } catch (error) {
    console.error("Error checking for PDF images:", error);
    // If check fails, assume true to be safe (force OCR)
    return true;
  }
}
