import crypto from "crypto";

export const splitIntoChunks = (text, maxLength = 1200, overlap = 160) => {
  const normalized = String(text || "").replace(/\r/g, "").trim();
  if (!normalized) return [];

  const chunks = [];
  let cursor = 0;

  while (cursor < normalized.length) {
    const piece = normalized.slice(cursor, cursor + maxLength).trim();
    if (piece) chunks.push(piece);
    if (cursor + maxLength >= normalized.length) break;
    cursor += Math.max(1, maxLength - overlap);
  }

  return chunks;
};

const digestToVector = (value) => {
  const digest = crypto.createHash("sha256").update(String(value || "")).digest();
  return Array.from(digest.values(), (byte) => Number((byte / 255).toFixed(6)));
};

export const buildDocumentEmbeddings = async (text, sourceName = "", fileHash = "") => {
  const chunks = splitIntoChunks(text);
  if (!chunks.length) return [];

  return Promise.all(
    chunks.map(async (chunk, index) => ({
      chunk_index: index,
      chunk_text: chunk,
      vector: digestToVector(`${fileHash}:${index}:${chunk}`),
      source_name: sourceName || null,
      source_hash: fileHash || null,
      chunk_length: chunk.length,
    }))
  );
};
