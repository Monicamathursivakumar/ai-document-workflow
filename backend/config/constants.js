import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Upload folder setup
const UPLOAD_FOLDER = path.join(__dirname, "../uploads");
if (!fs.existsSync(UPLOAD_FOLDER)) {
  fs.mkdirSync(UPLOAD_FOLDER);
}

export const PORT = process.env.PORT || 3001;
export const LLM_API_KEY = process.env.LLM_API_KEY;
export const LLM_MODEL = process.env.LLM_MODEL || "llama3:8b";
export { UPLOAD_FOLDER };
