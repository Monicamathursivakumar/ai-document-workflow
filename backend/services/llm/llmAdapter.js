import * as aiProvider from "./adapters/aiAdapter.js";

// Change provider via ENV
const PROVIDER = process.env.LLM_PROVIDER || "gemini";

let activeProvider = null;

/**
 * Initialize active LLM provider
 */
export function initLLM() {
  const apiKey = process.env.LLM_API_KEY;
  const modelName = process.env.LLM_MODEL || "gemini-2.5-flash";

  switch (PROVIDER) {
    case "ai":
    case "gemini": // backward compatibility
      aiProvider.init(apiKey, modelName);
      activeProvider = aiProvider;
      break;

    default:
      throw new Error(`Unsupported LLM provider: ${PROVIDER}`);
  }

  console.log(`🎛️ Active LLM Provider: ${PROVIDER}`);
}

/**
 * Unified generate method
 * @returns {Promise<{text: string, usage: object}>}
 */
export async function generate(prompt) {
  if (!activeProvider) {
    throw new Error("LLM not initialized. Call initLLM() first.");
  }

  return await activeProvider.generate(prompt);
}
