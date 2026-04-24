import fs from "fs";
import { detectLanguage } from "../utils.js";
import { cleanExtractedText } from "./utils.js";

async function processTextFile(file) {
  try {
    console.log("📄 Reading plain text file...");

    const text = fs.readFileSync(file.path, "utf8");
    const cleanedText = cleanExtractedText(text);
    const detectedLanguage = detectLanguage(cleanedText);

    console.log(
      `✅ Text file read successfully - ${cleanedText.length} characters`
    );

    return {
      text: cleanedText,
      confidence: 1.0, // Perfect confidence for plain text
      language: detectedLanguage,
      word_count: cleanedText.split(/\s+/).filter((word) => word.length > 0)
        .length,
      character_count: cleanedText.length,
      method: "direct_read",
    };
  } catch (error) {
    throw new Error(`Failed to read text file: ${error.message}`);
  }
}

export default processTextFile;
