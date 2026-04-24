const DEPARTMENTS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const PRIORITY_LEVELS = ["LOW", "NORMAL", "HIGH"];

const DOCUMENT_CATEGORIES = [
  "policy",
  "procedure",
  "request",
  "report",
  "directive",
  "approval",
  "information",
  "complaint",
  "general",
];

// Helper function to extract potential deadlines from text
function extractDeadlines(text) {
  // Simple regex patterns for common date formats
  const datePatterns = [
    /\b\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}\b/g, // MM/DD/YYYY or DD/MM/YYYY
    /\b\d{4}[-\/]\d{1,2}[-\/]\d{1,2}\b/g, // YYYY/MM/DD
    /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/gi, // Month DD, YYYY
    /\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\b/gi, // DD Month YYYY
  ];

  const dates = [];
  datePatterns.forEach((pattern) => {
    const matches = text.match(pattern);
    if (matches) {
      dates.push(...matches);
    }
  });

  return dates.length > 0 ? dates.join(", ") : "Not applicable";
}

// Helper function to detect document language
function detectLanguage(text) {
  // Unicode ranges for different Indic scripts
  const malayalamPattern = /[\u0D00-\u0D7F]/;  // Malayalam
  const hindiPattern = /[\u0900-\u097F]/;      // Devanagari (Hindi)
  const tamilPattern = /[\u0B80-\u0BFF]/;      // Tamil
  const englishPattern = /[a-zA-Z]/;
  
  const hasEnglish = englishPattern.test(text);
  const hasMalayalam = malayalamPattern.test(text);
  const hasHindi = hindiPattern.test(text);
  const hasTamil = tamilPattern.test(text);
  
  // Count how many languages are present
  const languageCount = [hasEnglish, hasMalayalam, hasHindi, hasTamil].filter(Boolean).length;
  
  // If multiple languages, return "mixed"
  if (languageCount > 1) {
    return "mixed";
  }
  
  // Single language detection
  if (hasMalayalam) return "malayalam";
  if (hasHindi) return "hindi";
  if (hasTamil) return "tamil";
  if (hasEnglish) return "english";
  
  return "unknown";
}

const ALLOWED_FILE_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".txt",
  ".png",
  ".jpg",
  ".jpeg",
];

export {
  DEPARTMENTS,
  PRIORITY_LEVELS,
  DOCUMENT_CATEGORIES,
  extractDeadlines,
  detectLanguage,
  ALLOWED_FILE_EXTENSIONS,
};
