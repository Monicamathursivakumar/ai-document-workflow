import {
  askChatbotQuestion,
  getChatbotDocuments,
  getChatbotHealth,
  resetChatbotSession,
  uploadChatbotDocuments,
} from "../services/chatbotSessionService.js";

const normalizeAssistantReply = (text) => {
  if (typeof text !== "string") return "";

  const raw = text.replace(/\r/g, "").trim();
  if (!raw) return "";

  // Deterministically extract section (1) when the model returns 1/2/3/4 templates.
  let cleaned = raw;
  const sectionStart = raw.search(/\(?1\)?\s*(?:[\.:\)\-]\s*)?direct\s*answer\s*:/i);
  if (sectionStart !== -1) {
    const startSlice = raw.slice(sectionStart);
    const colonIndex = startSlice.indexOf(":");
    if (colonIndex !== -1) {
      const afterLabel = startSlice.slice(colonIndex + 1);
      const nextSectionIndex = afterLabel.search(/\n\s*\(?[2-9]\)?\s*(?:[\.:\)\-]\s*)?(?:detailed explanation|evidence from the documents|gaps\/uncertainties)?\s*:?/i);
      cleaned = nextSectionIndex === -1 ? afterLabel : afterLabel.slice(0, nextSectionIndex);
    }
  }

  cleaned = cleaned
    .replace(/(?:^|\n)\s*\(?[2-9]\)?\s*[\.:\)\-]?\s*(detailed explanation|evidence from the documents|gaps\/uncertainties)\s*:[\s\S]*$/i, "")
    .replace(/(?:^|\n)\s*sources?\s*:[\s\S]*$/i, "")
    .replace(/(?:^|\n)\s*\(?1\)?\s*[\.:\)\-]?\s*direct\s*answer\s*:\s*/gi, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || raw;
};

export const health = async (_, res) => {
  return res.json(getChatbotHealth());
};

export const listDocuments = async (_, res) => {
  return res.json({ documents: getChatbotDocuments() });
};

export const upload = async (req, res) => {
  const result = await uploadChatbotDocuments(req.files || []);

  if (result.statusCode !== 200) {
    return res.status(result.statusCode).json({
      error: result.error,
      failedFiles: result.failedFiles || [],
    });
  }

  return res.json({
    documents: result.documents,
    failedFiles: result.failedFiles,
  });
};

export const chat = async (req, res) => {
  const result = await askChatbotQuestion(req.body?.question);

  if (result.statusCode !== 200) {
    return res.status(result.statusCode).json({
      error: result.error,
      mode: result.mode || "unclear",
    });
  }

  const normalizedAnswer = normalizeAssistantReply(result.answer);

  return res.json({
    answer: normalizedAnswer,
    sources: result.sources,
    mode: result.mode || "rag",
  });
};

export const reset = async (_, res) => {
  const result = await resetChatbotSession();
  return res.json(result);
};
