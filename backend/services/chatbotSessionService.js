import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import pdfParse from "pdf-parse";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas } from "@napi-rs/canvas";
import Tesseract from "tesseract.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const getOllamaBaseUrl = () => process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const getOllamaChatModel = () => process.env.OLLAMA_CHAT_MODEL || process.env.LLM_MODEL || "llama3:8b";
const getOllamaEmbedModel = () => process.env.OLLAMA_EMBED_MODEL || "nomic-embed-text";
const getLlmProvider = () => (process.env.LLM_PROVIDER || "ollama").toLowerCase();
const getChatbotLlmApiKey = () => process.env.CHATBOT_LLM_API_KEY || process.env.LLM_API_KEY;
const getChatbotLlmModel = () => process.env.CHATBOT_LLM_MODEL || process.env.LLM_MODEL || "gemini-2.5-flash";
const getOcrLanguages = () => process.env.OCR_LANGUAGES || "eng";
const getTopK = () => {
  const parsed = Number.parseInt(process.env.CHATBOT_TOP_K || "4", 10);
  return Number.isNaN(parsed) ? 4 : Math.min(Math.max(parsed, 1), 8);
};
const getMaxContextChars = () => {
  const parsed = Number.parseInt(process.env.CHATBOT_MAX_CONTEXT_CHARS || "3200", 10);
  return Number.isNaN(parsed) ? 3200 : Math.min(Math.max(parsed, 800), 8000);
};
const getMaxOutputTokens = () => {
  const parsed = Number.parseInt(process.env.CHATBOT_MAX_OUTPUT_TOKENS || "420", 10);
  return Number.isNaN(parsed) ? 420 : Math.min(Math.max(parsed, 96), 1024);
};
const getChatTemperature = () => {
  const parsed = Number.parseFloat(process.env.CHATBOT_TEMPERATURE || "0.2");
  return Number.isNaN(parsed) ? 0.2 : Math.min(Math.max(parsed, 0), 1);
};

const getFullDocMaxChars = () => {
  const parsed = Number.parseInt(process.env.CHATBOT_FULLDOC_MAX_CHARS || "12000", 10);
  return Number.isNaN(parsed) ? 12000 : Math.min(Math.max(parsed, 2000), 30000);
};

const getRagTriggerSimilarity = () => {
  const parsed = Number.parseFloat(process.env.CHATBOT_RAG_TRIGGER_SCORE || "0.22");
  return Number.isNaN(parsed) ? 0.22 : Math.min(Math.max(parsed, -1), 1);
};

const shouldUseOllamaEmbeddings = () => {
  return (process.env.CHATBOT_USE_OLLAMA_EMBEDDINGS || "false").toLowerCase() === "true";
};

const STATE_FILE_PATH = path.join(process.cwd(), ".chatbot-state.json");

const state = {
  documents: [],
  vectorIndex: [],
  initialized: false,
};

let chatbotGenAiClient = null;
let chatbotGenAiModel = null;
let chatbotModelName = null;

const getChatbotGeminiModel = () => {
  const apiKey = getChatbotLlmApiKey();
  const modelName = getChatbotLlmModel();

  if (!apiKey) {
    throw new Error("CHATBOT_LLM_API_KEY (or LLM_API_KEY fallback) is required for chatbot Gemini mode.");
  }

  if (!chatbotGenAiClient || chatbotModelName !== modelName) {
    chatbotGenAiClient = new GoogleGenerativeAI(apiKey);
    chatbotGenAiModel = chatbotGenAiClient.getGenerativeModel({ model: modelName });
    chatbotModelName = modelName;
  }

  return chatbotGenAiModel;
};

const splitIntoChunks = (text, maxLength = 1400, overlap = 180) => {
  if (!text) return [];

  const normalized = text.replace(/\r/g, "");
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

const cosineSimilarity = (a, b) => {
  if (!Array.isArray(a) || !Array.isArray(b) || !a.length || !b.length || a.length !== b.length) {
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
};

const summarizeDoc = (text) => {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "No readable text found in this file.";
  return cleaned.length > 220 ? `${cleaned.slice(0, 220)}...` : cleaned;
};

const DOC_QA_SYSTEM_RULES = `You are a document Q&A assistant.

Your task is to answer user queries using ONLY the provided document context.

Strict Output Rule:
- Return ONLY a single paragraph explanation.
- DO NOT include headings, numbering, or labels such as:
  (1) Direct answer
  (2) Detailed explanation
  (3) Evidence
  (4) Gaps
  Sources

Answering behavior:
- If the user asks what actions are required, explain clearly in sentence form.
- If the user asks for summary or meaning, provide a clean paragraph explanation.
- If the user asks a direct factual question such as a deadline, date, name, action, or amount, answer only that fact in one short sentence.
- Keep the answer concise, natural, and easy to understand.

Restrictions:
- DO NOT invent information
- DO NOT add external knowledge
- DO NOT repeat the question
- DO NOT format as a list

If the document does not contain the answer:
- Respond exactly with: "The document does not contain this information"`;

const toSingleParagraphAnswer = (rawAnswer) => {
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

  const withoutStructuredLabels = selectedBlock
    .replace(/\(\d+\)\s*(Direct answer|Detailed explanation|Evidence|Gaps|Sources)\s*:\s*/gi, " ")
    .replace(/\b(Direct answer|Detailed explanation|Evidence from the documents|Evidence|Gaps\/uncertainties|Sources)\s*:\s*/gi, " ")
    .replace(/^\s*source\s*\d+.*$/gim, " ")
    .replace(/^\s*evidence.*$/gim, " ")
    .replace(/^\s*gaps.*$/gim, " ")
    .replace(/^\s*[-*]\s*/gm, "")
    .replace(/\r?\n+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!withoutStructuredLabels) {
    return "The document does not contain this information";
  }

  return withoutStructuredLabels;
};

const INTENT_PATTERNS = {
  greeting: [
    /^\s*(hi|hello|hey|good\s+(morning|afternoon|evening)|namaste|hola)\b/i,
    /\b(how are you|what can you do|who are you|thank you|thanks)\b/i,
  ],
  document: [
    /\b(document|doc|file|pdf|upload|uploaded|report|analysis|content|page|pages|section|sections|clause|clauses|this\s+document|this\s+doc|that\s+doc|this\s+file|the\s+document|the\s+doc|the\s+file|attached|attachment)\b/i,
    /\b(main\s+points|key\s+insights|high[-\s]?level|what\s+does\s+this\s+mean|what\s+is\s+this\s+doc\s+about|tell\s+me\s+about\s+this|about\s+this\s+doc)\b/i,
    /\b(summarize|summary|overview|explain|explanation)\b.*\b(this|that|it|document|file|report|pdf|attached|above)\b/i,
    /\b(this|that|it)\b.*\b(summarize|summary|overview|explain|explanation)\b/i,
  ],
  unclear: [
    /^\s*(help|details|more|understand|explain|summary|summaries)\s*$/i,
    /^\s*(this|that|it|there|here)\s*$/i,
  ],
};

const detectIntentCategory = (question) => {
  const normalized = String(question || "").trim();
  if (!normalized) return "unclear";

  const wordCount = normalized.split(/\s+/).filter(Boolean).length;

  if (INTENT_PATTERNS.greeting.some((pattern) => pattern.test(normalized))) {
    return "general";
  }

  if (INTENT_PATTERNS.document.some((pattern) => pattern.test(normalized))) {
    return "document";
  }

  if (INTENT_PATTERNS.unclear.some((pattern) => pattern.test(normalized))) {
    return "unclear";
  }

  if (wordCount <= 2) {
    return "unclear";
  }

  return "general";
};

const isGreetingQuestion = (question) => {
  const normalized = String(question || "").trim();
  return INTENT_PATTERNS.greeting.some((pattern) => pattern.test(normalized));
};

const isMeaningRequest = (question) => {
  const normalized = String(question || "").trim();
  return /\b(meaning|means|mean|definition|define|what\s+does\s+this\s+mean|what\s+does\s+it\s+mean|explain\s+this\s+doc|explain\s+this\s+document|explain\s+this\s+word|what\s+is\s+the\s+meaning\s+of|summari[sz]e\s+this\s+doc|summari[sz]e\s+this\s+document)\b/i.test(normalized);
};

const isDocumentAwareQuestion = (question) => {
  const normalized = String(question || "").trim();
  return (
    INTENT_PATTERNS.document.some((pattern) => pattern.test(normalized)) ||
    isMeaningRequest(normalized) ||
    isSocOrPolicySpecificQuestion(normalized)
  );
};

const isSocOrPolicySpecificQuestion = (question) => {
  const normalized = String(question || "").trim();
  return /\b(soc|security\s+operations\s+center|standard\s+operating\s+procedure|policy\s+document|this\s+document|this\s+doc|in\s+this\s+doc|in\s+this\s+document)\b/i.test(normalized);
};

const generateChatWithProvider = async ({ systemInstruction, userContent }) => {
  if (getLlmProvider() === "ollama") {
    const result = await postToOllama("/api/chat", {
      model: getOllamaChatModel(),
      stream: false,
      options: {
        num_predict: getMaxOutputTokens(),
        temperature: getChatTemperature(),
      },
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userContent },
      ],
    });

    const answer = result?.message?.content?.trim();
    if (!answer) throw new Error("Model returned an empty answer.");
    return answer;
  }

  const prompt = `${systemInstruction}\n\n${userContent}`;
  const model = getChatbotGeminiModel();
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const answer = String(response?.text?.() || "").trim();

  if (!answer) {
    throw new Error("Model returned an empty answer.");
  }

  return answer;
};

const postToOllama = async (pathSuffix, payload) => {
  const response = await fetch(`${getOllamaBaseUrl()}${pathSuffix}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Ollama request failed (${response.status}): ${detail || response.statusText}`);
  }

  return response.json();
};

const createEmbeddings = async (inputs) => {
  const vectors = [];

  for (const input of inputs) {
    const result = await postToOllama("/api/embeddings", {
      model: getOllamaEmbedModel(),
      prompt: input,
    });

    const vector = result?.embedding;
    if (!Array.isArray(vector) || !vector.length) {
      throw new Error("Embedding response did not include a valid vector.");
    }

    vectors.push(vector);
  }

  return vectors;
};

const rebuildVectorIndex = async () => {
  const entries = [];

  for (const doc of state.documents) {
    if (!Array.isArray(doc.chunks) || !doc.chunks.length) continue;

    const vectors = await createEmbeddings(doc.chunks);

    vectors.forEach((vector, chunkIndex) => {
      entries.push({
        docId: doc.id,
        docName: doc.name,
        chunkIndex,
        text: doc.chunks[chunkIndex],
        embedding: vector,
      });
    });
  }

  state.vectorIndex = entries;
};

const retrieveTopChunks = async (question, topK = getTopK()) => {
  if (!state.vectorIndex.length) {
    return [];
  }

  const [queryVector] = await createEmbeddings([question]);

  return state.vectorIndex
    .map((item) => ({
      ...item,
      score: cosineSimilarity(queryVector, item.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
};

const buildContext = (rankedChunks) => {
  const maxContextChars = getMaxContextChars();
  let contextLength = 0;

  return {
    promptContext: rankedChunks
      .filter((item) => {
        const snippet = `Source (${item.docName}):\n${item.text}`;
        if (contextLength + snippet.length > maxContextChars) {
          return false;
        }
        contextLength += snippet.length;
        return true;
      })
      .map(
        (item, index) =>
          `Source ${index + 1} (${item.docName}, score=${item.score.toFixed(4)}):\n${item.text}`,
      )
      .join("\n\n---\n\n"),
    sources: [...new Set(rankedChunks.map((item) => item.docName))],
  };
};

const generateAnswer = async (question, promptContext) => {
  const systemInstruction = DOC_QA_SYSTEM_RULES;

  const rawAnswer = await generateChatWithProvider({
    systemInstruction,
    userContent: `Question:\n${question}\n\nDocument Context:\n${promptContext}`,
  });

  return toSingleParagraphAnswer(rawAnswer);
};

const generateGeneralAnswer = async (question) => {
  const systemInstruction =
    "You are a helpful AI assistant for general conversation and general knowledge. Reply naturally and clearly without using document retrieval. If the user is greeting you, respond warmly and briefly. If the user asks for help or an explanation, provide a helpful direct answer with a little detail. Do not mention internal modes or retrieval.";

  const rawAnswer = await generateChatWithProvider({
    systemInstruction,
    userContent: question,
  });

  return toSingleParagraphAnswer(rawAnswer);
};

const buildFullDocumentContext = (documents) => {
  const maxChars = getFullDocMaxChars();
  let consumed = 0;
  const includedDocs = [];

  const fullContext = documents
    .map((doc, index) => {
      const header = `Document ${index + 1}: ${doc.name}\n`;
      const body = String(doc.text || "").trim();
      const block = `${header}${body}`;

      if (!body) return null;
      if (consumed >= maxChars) return null;

      const remaining = maxChars - consumed;
      const clipped = block.length > remaining ? `${block.slice(0, remaining)}\n...[truncated]` : block;
      consumed += clipped.length;
      includedDocs.push(doc.name);
      return clipped;
    })
    .filter(Boolean)
    .join("\n\n---\n\n");

  return { fullContext, includedDocs };
};

const generateFullDocumentAnswer = async (question, fullDocumentContext) => {
  const systemInstruction =
    `${DOC_QA_SYSTEM_RULES}

Special handling for meaning/explanation questions:
- Interpret the word or phrase in the context of the document, not as a general dictionary definition.
- If the term appears in the document, explain its local meaning using nearby context.
- If the document does not define it, respond exactly with: "The document does not contain this information".`;

  const rawAnswer = await generateChatWithProvider({
    systemInstruction,
    userContent: `User Request:\n${question}\n\nFull Document Context:\n${fullDocumentContext}`,
  });

  return toSingleParagraphAnswer(rawAnswer);
};

const extractPdfTextWithPdfJs = async (buffer) => {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;

  let fullText = "";

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    const pageText = content.items
      .map((item) => (item && typeof item.str === "string" ? item.str : ""))
      .join(" ")
      .trim();

    if (pageText) {
      fullText += `${pageText}\n\n`;
    }
  }

  return fullText.trim();
};

const extractPdfTextWithOcr = async (buffer) => {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;

  let fullText = "";

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const context = canvas.getContext("2d");

    await page.render({ canvasContext: context, viewport }).promise;

    const pngBuffer = await canvas.encode("png");
    const result = await Tesseract.recognize(pngBuffer, getOcrLanguages());
    const pageText = result?.data?.text?.trim() || "";

    if (pageText) {
      fullText += `${pageText}\n\n`;
    }

    page.cleanup();
  }

  return fullText.trim();
};

const formatFileParseError = (fileName, error) => {
  const message = error instanceof Error ? error.message : String(error || "Unknown error");
  const malformedPdfPattern = /bad\s*xref|xref|invalid\s*pdf|format\s*error|malformed/i;

  if (malformedPdfPattern.test(message)) {
    return `Unable to read ${fileName}. The PDF appears malformed or uses an unsupported structure. Try re-saving/printing it to a new PDF and upload again.`;
  }

  return `Unable to read ${fileName}: ${message}`;
};

const extractText = async (file) => {
  const isPdf =
    file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf");

  if (isPdf) {
    try {
      const parsed = await pdfParse(file.buffer);
      const parsedText = parsed.text || "";

      if (parsedText.trim().length >= 120) {
        return parsedText;
      }

      const fromPdfJs = await extractPdfTextWithPdfJs(file.buffer);
      if (fromPdfJs.trim().length >= 120) {
        return fromPdfJs;
      }

      const ocrText = await extractPdfTextWithOcr(file.buffer);
      if (ocrText.trim()) return ocrText;

      return parsedText || fromPdfJs || ocrText;
    } catch (primaryError) {
      try {
        const fallbackText = await extractPdfTextWithPdfJs(file.buffer);
        if (fallbackText.trim().length >= 120) return fallbackText;

        const ocrText = await extractPdfTextWithOcr(file.buffer);
        if (ocrText.trim()) return ocrText;
      } catch {
        // Keep primary error.
      }

      throw new Error(formatFileParseError(file.originalname, primaryError));
    }
  }

  return file.buffer.toString("utf8");
};

const loadStateFromDisk = async () => {
  try {
    const raw = await fs.readFile(STATE_FILE_PATH, "utf8");
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed?.documents)) {
      state.documents = parsed.documents;
      console.log(`Loaded ${state.documents.length} chatbot document(s) from persisted state.`);
    }

    if (Array.isArray(parsed?.vectorIndex)) {
      state.vectorIndex = parsed.vectorIndex;
      console.log(`Loaded ${state.vectorIndex.length} chatbot vector chunk(s) from persisted state.`);
    }
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return;
    }

    console.error("Failed to load chatbot persisted state:", error);
  }
};

const persistStateToDisk = async () => {
  try {
    await fs.writeFile(
      STATE_FILE_PATH,
      JSON.stringify({ documents: state.documents, vectorIndex: state.vectorIndex }, null, 2),
      "utf8",
    );
  } catch (error) {
    console.error("Failed to persist chatbot state:", error);
  }
};

export const initChatbotSessionState = async () => {
  if (state.initialized) return;

  await loadStateFromDisk();

  if (state.documents.length && !state.vectorIndex.length && shouldUseOllamaEmbeddings()) {
    console.log("Persisted chatbot docs found without vectors. Rebuilding index...");
    try {
      await rebuildVectorIndex();
      await persistStateToDisk();
    } catch (error) {
      console.warn(
        "Could not rebuild chatbot vectors at startup. Run 'ollama pull nomic-embed-text' and re-upload documents.",
      );
      console.warn(error instanceof Error ? error.message : String(error));
    }
  }

  state.initialized = true;
};

export const getChatbotHealth = () => ({
  ok: true,
  documentsLoaded: state.documents.length,
  chunksIndexed: state.vectorIndex.length,
  embeddingsEnabled: shouldUseOllamaEmbeddings(),
  llmProvider: getLlmProvider(),
  chatbotLlmModel: getLlmProvider() === "ollama" ? null : getChatbotLlmModel(),
  chatbotHasDedicatedApiKey: Boolean(process.env.CHATBOT_LLM_API_KEY),
  ollamaBaseUrl: getOllamaBaseUrl(),
  chatModel: getOllamaChatModel(),
  embeddingModel: getOllamaEmbedModel(),
});

export const getChatbotDocuments = () => {
  return state.documents.map((doc) => ({
    id: doc.id,
    name: doc.name,
    size: doc.size,
    charCount: doc.text.length,
    summary: doc.summary,
  }));
};

export const uploadChatbotDocuments = async (files) => {
  if (!Array.isArray(files) || !files.length) {
    return {
      error: "No files uploaded.",
      statusCode: 400,
    };
  }

  const parsedDocs = [];
  const failedFiles = [];

  for (const file of files) {
    try {
      const text = (await extractText(file)).trim();
      const chunks = splitIntoChunks(text);

      parsedDocs.push({
        id: randomUUID(),
        name: file.originalname,
        type: file.mimetype,
        size: file.size,
        text,
        chunks,
        summary: summarizeDoc(text),
      });
    } catch (error) {
      failedFiles.push({
        name: file.originalname,
        error: error instanceof Error ? error.message : "Failed to parse file",
      });
    }
  }

  if (!parsedDocs.length) {
    return {
      error: "None of the uploaded files could be processed.",
      failedFiles,
      statusCode: 400,
    };
  }

  state.documents = parsedDocs;
  if (shouldUseOllamaEmbeddings()) {
    await rebuildVectorIndex();
  } else {
    state.vectorIndex = [];
  }
  await persistStateToDisk();

  return {
    documents: getChatbotDocuments(),
    failedFiles,
    statusCode: 200,
  };
};

export const askChatbotQuestion = async (question) => {
  const startedAt = Date.now();
  const cleanedQuestion = String(question || "").trim();

  if (!cleanedQuestion) {
    return {
      error: "Question is required.",
      statusCode: 400,
    };
  }

  const mode = detectIntentCategory(cleanedQuestion);
  const documentAwareRequest = isDocumentAwareQuestion(cleanedQuestion);

  if (!state.documents.length && documentAwareRequest) {
    return {
      error: "I can answer document questions once you upload documents. Please upload a file first or ask a general question.",
      statusCode: 400,
      mode: "document",
    };
  }

  if (state.documents.length && !isGreetingQuestion(cleanedQuestion)) {
    if (documentAwareRequest) {
      const { fullContext, includedDocs } = buildFullDocumentContext(state.documents);

      if (!fullContext) {
        return {
          error: "Documents are uploaded, but readable text content is missing.",
          statusCode: 400,
          mode: "document",
        };
      }

      const answer = await generateFullDocumentAnswer(cleanedQuestion, fullContext);

      console.log(
        `🤖 Chatbot response generated in ${Date.now() - startedAt}ms (mode=full-document, docs=${includedDocs.length}).`,
      );

      return {
        answer,
        sources: includedDocs,
        mode: "document-full",
        statusCode: 200,
      };
    }

    // In Gemini-only mode, keep questions document-aware by default when docs exist.
    if (!shouldUseOllamaEmbeddings()) {
      const { fullContext, includedDocs } = buildFullDocumentContext(state.documents);

      if (!fullContext) {
        return {
          error: "Documents are uploaded, but readable text content is missing.",
          statusCode: 400,
          mode: "document",
        };
      }

      const answer = await generateFullDocumentAnswer(cleanedQuestion, fullContext);

      console.log(
        `🤖 Chatbot response generated in ${Date.now() - startedAt}ms (mode=document-full-default, docs=${includedDocs.length}).`,
      );

      return {
        answer,
        sources: includedDocs,
        mode: "document-full",
        statusCode: 200,
      };
    }

    const topChunks = await retrieveTopChunks(cleanedQuestion);
    const strongestScore = topChunks.length ? topChunks[0].score : -1;

    if (topChunks.length && strongestScore >= getRagTriggerSimilarity()) {
      const { promptContext, sources } = buildContext(topChunks);
      const answer = await generateAnswer(cleanedQuestion, promptContext);

      console.log(
        `🤖 Chatbot response generated in ${Date.now() - startedAt}ms (mode=rag, topK=${getTopK()}, contextChars=${promptContext.length}, score=${strongestScore.toFixed(4)}).`,
      );

      return {
        answer,
        sources,
        mode: "rag",
        statusCode: 200,
      };
    }

    if (mode === "document") {
      return {
        error: "I could not find enough relevant document context for that question. Try adding specific terms from your document.",
        statusCode: 400,
        mode: "document",
      };
    }
  }

  const answer = await generateGeneralAnswer(cleanedQuestion);

  console.log(
    `🤖 Chatbot response generated in ${Date.now() - startedAt}ms (mode=general).`,
  );

  return {
    answer,
    sources: [],
    mode: mode === "unclear" ? "general-fallback" : "general",
    statusCode: 200,
  };
};

export const resetChatbotSession = async () => {
  state.documents = [];
  state.vectorIndex = [];
  await persistStateToDisk();
  return { ok: true };
};
