import fs from "fs";
import path from "path";

/**
 * Extracts essential metadata from uploaded file.
 * Safe, synchronous (fast) and consistent across file types.
 */
async function extract(file) {
  if (!file || !file.path) {
    throw new Error("Invalid file input for metadata extraction");
  }

  const stats = fs.statSync(file.path);

  const metadata = {
    file_name: file.originalname,
    file_extension: path.extname(file.originalname).toLowerCase(),
    mime_type: file.mimetype || "application/octet-stream",
    file_size: stats.size,
    created_time: stats.birthtime || new Date(),
    modified_time: stats.mtime || new Date(),
    processed_time: new Date(),
  };

  if (!metadata.file_extension) throw new Error("File extension missing");
  if (!metadata.mime_type) throw new Error("MIME type missing");

  return metadata;
}

export default { extract };
