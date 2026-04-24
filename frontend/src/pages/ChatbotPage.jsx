import React, { useMemo, useRef, useState } from "react";
import {
  Bot,
  FileText,
  LoaderCircle,
  Send,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { useTranslation } from "../context/TranslationContext";

const starterQuestionKeys = [
  "chatbotStarterQuestion1",
  "chatbotStarterQuestion2",
  "chatbotStarterQuestion3",
];

const readJsonSafe = async (response) => {
  const raw = await response.text();
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let index = 0;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }

  return `${value.toFixed(1)} ${units[index]}`;
};

const getChatbotApiBase = () => {
  const serverBase = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";
  const raw = import.meta.env.VITE_CHATBOT_API_URL || `${serverBase}/api/v1/chatbot`;
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
};

const normalizeAssistantContent = (text) => {
  if (typeof text !== "string") return "";

  const raw = text.replace(/\r/g, "").trim();
  if (!raw) return "";

  const directMatch = raw.match(
    /(?:^|\n)\s*\(?1\)?\s*[\.:\)\-]?\s*direct\s*answer\s*:\s*([\s\S]*?)(?=\n\s*\(?[2-9]\)?\s*[\.:\)\-]|\n\s*sources?\s*:|$)/i
  );

  const cleaned = (directMatch?.[1] || raw)
    .replace(/(?:^|\n)\s*\(?[2-9]\)?\s*[\.:\)\-]?\s*(detailed explanation|evidence from the documents|gaps\/uncertainties)\s*:[\s\S]*$/i, "")
    .replace(/(?:^|\n)\s*sources?\s*:[\s\S]*$/i, "")
    .replace(/(?:^|\n)\s*\(?1\)?\s*[\.:\)\-]?\s*direct\s*answer\s*:\s*/gi, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || raw;
};

const ChatbotPage = () => {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [uploading, setUploading] = useState(false);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const hasDocuments = documents.length > 0;

  const totalChars = useMemo(
    () => documents.reduce((sum, doc) => sum + (doc.charCount || 0), 0),
    [documents]
  );

  const handleUpload = async (files) => {
    if (!files || files.length === 0) return;

    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append("files", file));

    setUploading(true);
    setError("");

    try {
      const response = await fetch(`${getChatbotApiBase()}/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await readJsonSafe(response);

      if (!response.ok) {
        throw new Error(
          data?.error || `${t("chatbotUploadHttpFailed")} (HTTP ${response.status})`
        );
      }

      if (!data || !Array.isArray(data.documents)) {
        throw new Error(t("chatbotUnexpectedUploadResponse"));
      }

      setDocuments(data.documents);

      if (messages.length === 0) {
        setMessages([
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: t("chatbotDocumentsReadyMessage"),
            sources: [],
          },
        ]);
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : t("chatbotUploadFailed"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const askQuestion = async (questionText) => {
    const question = (questionText || "").trim();
    if (!question) return;

    if (!hasDocuments) {
      setError(t("chatbotUploadFirst"));
      return;
    }

    const userMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: question,
      sources: [],
    };

    setMessages((prev) => [...prev, userMessage]);
    setPrompt("");
    setAsking(true);
    setError("");

    try {
      const response = await fetch(`${getChatbotApiBase()}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question }),
      });

      const data = await readJsonSafe(response);

      if (!response.ok) {
        throw new Error(data?.error || `${t("chatbotAnswerHttpFailed")} (HTTP ${response.status})`);
      }

      if (!data || typeof data.answer !== "string") {
        throw new Error(t("chatbotUnexpectedChatResponse"));
      }

      const assistantMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: normalizeAssistantContent(data.answer),
        sources: Array.isArray(data.sources) ? data.sources : [],
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (askError) {
      setError(askError instanceof Error ? askError.message : t("chatbotAskFailed"));
    } finally {
      setAsking(false);
    }
  };

  const clearSession = async () => {
    setMessages([]);
    setDocuments([]);
    setPrompt("");
    setError("");

    try {
      await fetch(`${getChatbotApiBase()}/reset`, { method: "POST" });
    } catch {
      setError(t("chatbotResetFailed"));
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-linear-to-r from-[#1F7F86] to-[#2FA4A9] p-6 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-white/20 p-2">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t("chatbotTitle")}</h1>
            <p className="text-white/90">{t("chatbotSubtitle")}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <aside className="xl:col-span-4 2xl:col-span-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#2FA4A9]/40 bg-[#2FA4A9]/5 px-4 py-6 text-center hover:bg-[#2FA4A9]/10 transition-colors">
            <Upload className="mb-2 h-5 w-5 text-[#1F7F86]" />
            <span className="text-sm font-semibold text-gray-800">{t("chatbotUploadDocuments")}</span>
            <span className="mt-1 text-xs text-gray-500">{t("chatbotSupportedTypes")}</span>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              onChange={(event) => void handleUpload(event.target.files)}
            />
          </label>

          <div className="mt-4 rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
            <div className="flex justify-between">
              <span>{t("chatbotFiles")}</span>
              <span className="font-semibold">{documents.length}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span>{t("chatbotTotalContext")}</span>
              <span className="font-semibold">{totalChars.toLocaleString()} {t("chatbotChars")}</span>
            </div>
          </div>

          <div className="mt-4 space-y-2 max-h-72 overflow-auto pr-1">
            {documents.map((doc) => (
              <div key={doc.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <div className="flex items-start gap-2">
                  <FileText className="mt-0.5 h-4 w-4 text-[#1F7F86]" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{doc.name}</p>
                    <p className="text-xs text-gray-500">{formatBytes(doc.size || 0)}</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-700 line-clamp-3">{doc.summary}</p>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void clearSession()}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 hover:bg-red-100 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            {t("chatbotReset")}
          </button>
        </aside>

        <main className="xl:col-span-8 2xl:col-span-9 flex min-h-[70vh] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <header className="border-b border-gray-200 bg-gray-50 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Bot className="h-4 w-4 text-[#1F7F86]" />
              <span>{t("chatbotContextGroundedAssistant")}</span>
            </div>
          </header>

          <section className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <h2 className="text-sm font-semibold text-gray-900">{t("chatbotSuggestedQuestions")}</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {starterQuestionKeys.map((questionKey) => {
                    const question = t(questionKey);
                    return (
                    <button
                      key={questionKey}
                      type="button"
                      onClick={() => void askQuestion(question)}
                      className="rounded-lg border border-[#2FA4A9]/30 bg-[#2FA4A9]/10 px-3 py-2 text-left text-xs text-[#145e64] hover:bg-[#2FA4A9]/20 transition-colors"
                    >
                      {question}
                    </button>
                    );
                  })}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <article
                key={message.id}
                className={`max-w-4xl rounded-xl border p-4 ${
                  message.role === "user"
                    ? "ml-auto border-[#2FA4A9]/40 bg-[#2FA4A9]/10"
                    : "border-gray-200 bg-white"
                }`}
              >
                <p className="mb-2 text-xs uppercase tracking-wide text-gray-500">
                  {message.role === "user" ? t("chatbotYou") : t("chatbotAssistant")}
                </p>
                <p className="whitespace-pre-wrap text-sm text-gray-900">{message.content}</p>

                {/* Sources intentionally hidden to keep replies focused on one direct answer. */}
              </article>
            ))}

            {(uploading || asking) && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                {uploading ? t("chatbotProcessingDocuments") : t("chatbotThinking")}
              </div>
            )}

            {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          </section>

          <footer className="border-t border-gray-200 p-4">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void askQuestion(prompt);
              }}
              className="flex items-end gap-3"
            >
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={3}
                placeholder={t("chatbotPromptPlaceholder")}
                className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-900 outline-none ring-[#2FA4A9]/40 placeholder:text-gray-500 focus:ring"
              />
              <button
                type="submit"
                disabled={asking || uploading || !prompt.trim()}
                className="inline-flex h-[46px] items-center gap-2 rounded-xl bg-[#1F7F86] px-4 text-sm font-medium text-white transition hover:bg-[#17656b] disabled:cursor-not-allowed disabled:bg-[#1F7F86]/50"
              >
                <Send className="h-4 w-4" />
                {t("chatbotAsk")}
              </button>
            </form>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default ChatbotPage;
