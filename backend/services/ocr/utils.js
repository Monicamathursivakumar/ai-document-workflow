/**
 * Check if extracted text is readable (not binary or corrupt)
 * @param {string} text
 * @returns {boolean}
 */
function isReadableText(text) {
  if (!text || text.length === 0) return false;

  // Detect binary content — too many non-printable characters
  const nonPrintable = text.match(/[\x00-\x08\x0E-\x1F\x7F-\x9F]/g); // narrower range
  const ratio = nonPrintable ? nonPrintable.length / text.length : 0;

  // If >25% of characters are non-printable → likely binary
  return ratio < 0.25;
}

/**
 * Clean and normalize extracted text from OCR or PDF parsing
 * Handles English + Malayalam + mixed scripts
 * @param {string} text
 * @returns {string} cleanedText
 */
function cleanExtractedText(text) {
  if (!text || text.length === 0) return "";

  return (
    text
      // Normalize line endings
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")

      // Replace tabs and multiple spaces with a single space
      .replace(/[ \t]+/g, " ")

      // Replace 3+ consecutive newlines with just 2
      .replace(/\n{3,}/g, "\n\n")

      // Remove common OCR artifacts (random underscores, misreads)
      .replace(/[_•·◦]/g, " ")

      // Remove zero-width and non-printable Unicode chars
      .replace(/[\u200B-\u200F\uFEFF]/g, "")

      // Keep multilingual characters: English + Malayalam + symbols
      .replace(/[^\p{L}\p{N}\p{P}\p{Z}\u0D00-\u0D7F\n]/gu, " ")

      // Normalize punctuation spacing
      .replace(/\s+([,.!?;:])/g, "$1")
      .replace(/([,.!?;:])(?=[^\s])/g, "$1 ")

      // Remove double spaces again
      .replace(/ {2,}/g, " ")

      // Trim leading/trailing whitespace and line breaks
      .trim()
  );
}

/**
 * List of supported file types for OCR service
 */
function getSupportedFileTypes() {
  return {
    text_files: [".txt"],
    image_files: [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".webp"],
    pdf_files: [".pdf"],
    document_files: [".docx"], // Limited support

    notes: {
      text_files: "Direct text extraction (UTF-8)",
      image_files: "OCR extraction required (via Tesseract/PaddleOCR)",
      pdf_files: "If scanned → OCR, else direct text extraction",
      document_files: "Limited support — convert to PDF for best results",
    },
  };
}

export { isReadableText, cleanExtractedText, getSupportedFileTypes };
