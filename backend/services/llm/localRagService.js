const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const OLLAMA_CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL || process.env.LLM_MODEL || "llama3:8b";
const OLLAMA_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || "nomic-embed-text";

function toSingleParagraphAnswer(rawAnswer) {
  const text = String(rawAnswer || "").trim();
  if (!text) return "";

  if (text === "The document does not contain this information") {
    return text;
  }

  const sectioned = text
    .replace(/\*\*/g, "")
    .replace(/\r\n/g, "\n");

  const directMatch = sectioned.match(
    /(?:\(\s*1\s*\)\s*Direct\s*answer\s*:|Direct\s*answer\s*:)([\s\S]*?)(?=(?:\(\s*2\s*\)\s*Detailed\s*explanation\s*:|Detailed\s*explanation\s*:|$))/i,
  );

  const detailedMatch = sectioned.match(
    /(?:\(\s*2\s*\)\s*Detailed\s*explanation\s*:|Detailed\s*explanation\s*:)([\s\S]*?)(?=(?:\(\s*3\s*\)\s*Evidence|Evidence\s*from\s*the\s*documents\s*:|\(\s*4\s*\)\s*Gaps|Gaps\s*\/\s*uncertainties\s*:|Sources\s*:|$))/i,
  );

  const selectedBlock = directMatch?.[1] || detailedMatch?.[1] || sectioned;

  const normalized = selectedBlock
    .replace(/\(\d+\)\s*(Direct answer|Detailed explanation|Evidence|Gaps|Sources)\s*:\s*/gi, " ")
    .replace(/\b(Direct answer|Detailed explanation|Evidence from the documents|Evidence|Gaps\/uncertainties|Sources)\s*:\s*/gi, " ")
    .replace(/^\s*source\s*\d+.*$/gim, " ")
    .replace(/^\s*evidence.*$/gim, " ")
    .replace(/^\s*gaps.*$/gim, " ")
    .replace(/^\s*[-*]\s*/gm, "")
    .replace(/\r?\n+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  return normalized || "The document does not contain this information";
}

function splitIntoChunks(text, maxLength = 1400, overlap = 180) {
  if (!text) return [];
  const normalized = String(text).replace(/\r/g, "").trim();
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
}

function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || !a.length || a.length !== b.length) {
    return -1;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i += 1) {
    const x = Number(a[i]);
    const y = Number(b[i]);
    dot += x * y;
    normA += x * x;
    normB += y * y;
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (!denom) return -1;
  return dot / denom;
}

async function postToOllama(pathSuffix, payload) {
  const response = await fetch(`${OLLAMA_BASE_URL}${pathSuffix}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Ollama request failed (${response.status}): ${detail || response.statusText}`);
  }

  return response.json();
}

async function embedTexts(texts) {
  const vectors = [];

  for (const text of texts) {
    const result = await postToOllama("/api/embeddings", {
      model: OLLAMA_EMBED_MODEL,
      prompt: text,
    });

    if (!Array.isArray(result?.embedding) || !result.embedding.length) {
      throw new Error("Embedding response did not include a valid vector");
    }

    vectors.push(result.embedding);
  }

  return vectors;
}

function buildContext(chunks) {
  return chunks
    .map((item, index) => `Source ${index + 1} (${item.file_name}, score=${item.score.toFixed(4)}):\n${item.text}`)
    .join("\n\n---\n\n");
}

export async function askQuestionWithRag(question, docs, topK = 8) {
  const chunkRows = [];

  for (const doc of docs) {
    const chunks = splitIntoChunks(doc.raw_text || "");
    if (!chunks.length) continue;

    const vectors = await embedTexts(chunks);

    vectors.forEach((embedding, idx) => {
      chunkRows.push({
        document_id: doc.id,
        file_name: doc.file_name,
        text: chunks[idx],
        embedding,
      });
    });
  }

  if (!chunkRows.length) {
    throw new Error("No readable text chunks were available for retrieval.");
  }

  const [queryEmbedding] = await embedTexts([question]);

  const topChunks = chunkRows
    .map((item) => ({
      ...item,
      score: cosineSimilarity(queryEmbedding, item.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  const context = buildContext(topChunks);
  const systemInstruction =
    "You are an enterprise document assistant. Answer only from the provided context chunks. If the user asks a direct factual question such as a deadline, date, name, action, or amount, answer only that fact in one short sentence. If context does not contain the answer, explicitly say information is not available in the documents.";

  const chat = await postToOllama("/api/chat", {
    model: OLLAMA_CHAT_MODEL,
    stream: false,
    messages: [
      { role: "system", content: systemInstruction },
      { role: "user", content: `Question:\n${question}\n\nDocument Context:\n${context}` },
    ],
  });

  const answer = chat?.message?.content?.trim();
  if (!answer) {
    throw new Error("Local model returned an empty answer.");
  }

  return {
    answer: toSingleParagraphAnswer(answer),
    sources: [...new Set(topChunks.map((x) => x.file_name))],
    topChunks: topChunks.map((x) => ({
      document_id: x.document_id,
      file_name: x.file_name,
      score: x.score,
    })),
  };
}
