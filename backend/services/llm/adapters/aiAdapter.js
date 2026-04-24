import { GoogleGenerativeAI } from "@google/generative-ai";

let model = null;
let activeModelName = null;
let genAIClient = null;

const DEFAULT_MODEL = "gemini-2.5-flash";
const SUPPORTED_FALLBACK_MODELS = [DEFAULT_MODEL];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isTransientError = (error) => {
  const message = String(error?.message || "").toLowerCase();
  const status = Number(error?.status || 0);
  const isQuotaError = status === 429 || message.includes("quota exceeded");
  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    message.includes("high demand") ||
    message.includes("service unavailable") ||
    message.includes("timeout") ||
    isQuotaError
  );
};

const createModel = (modelName) => {
  if (!genAIClient) throw new Error("AI client not initialized");
  return genAIClient.getGenerativeModel({ model: modelName });
};

const normalizeModelName = (modelName) => {
  const value = String(modelName || "").trim();

  if (!value || value === "gemini-1.5-flash") {
    return DEFAULT_MODEL;
  }

  return value;
};

const generateWithRetries = async (targetModel, prompt, maxAttempts = 3) => {
  let attempt = 0;
  let lastError = null;

  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      const target = createModel(targetModel);
      const result = await target.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      if (!text) throw new Error("Empty response from AI model");

      const usage = response.usageMetadata || {};
      return {
        text: text.trim(),
        usage,
        modelName: targetModel,
      };
    } catch (error) {
      lastError = error;
      const message = String(error?.message || "").toLowerCase();
      if (message.includes("quota exceeded") || !isTransientError(error) || attempt >= maxAttempts) {
        break;
      }
      await sleep(500 * attempt);
    }
  }

  throw lastError;
};

/**
 * Initialize AI model
 * @param {string} apiKey
 * @param {string} modelName
 */
export function init(apiKey, modelName = "gemini-2.5-flash") {
  if (!apiKey) throw new Error("LLM_API_KEY is required");

  genAIClient = new GoogleGenerativeAI(apiKey);
  activeModelName = normalizeModelName(modelName);
  model = genAIClient.getGenerativeModel({ model: activeModelName });

  console.log(`🤖 AI Model initialized: ${activeModelName}`);
}

/**
 * Unified generate method
 * @param {string} prompt
 * @returns {Promise<{text: string, usage: object}>}
 */
export async function generate(prompt) {
  if (!model) throw new Error("AI model not initialized.");

  try {
    const fallbackModels = [
      activeModelName,
      ...SUPPORTED_FALLBACK_MODELS,
    ].filter((name, index, arr) => Boolean(name) && arr.indexOf(name) === index);

    let finalResult = null;
    let lastError = null;

    for (const candidateModel of fallbackModels) {
      try {
        finalResult = await generateWithRetries(candidateModel, prompt, 3);
        break;
      } catch (error) {
        lastError = error;
      }
    }

    if (!finalResult) {
      throw lastError || new Error("All Gemini model attempts failed");
    }

    const usage = finalResult.usage || {};

    const finalUsageData = {
      model_used: finalResult.modelName || activeModelName,
      input_tokens: usage.promptTokenCount,
      output_tokens: usage.candidatesTokenCount,
      total_tokens: usage.totalTokenCount,
    };

    return {
      text: finalResult.text,
      usage: finalUsageData,
    };
  } catch (error) {
    console.error("❌ AI generate() error:", error);
    throw new Error(`AI Error: ${error.message}`);
  }
}
