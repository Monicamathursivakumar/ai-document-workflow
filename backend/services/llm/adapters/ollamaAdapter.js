let activeModelName = "llama3:8b";
let baseUrl = "http://127.0.0.1:11434";

/**
 * Initialize local Ollama model config.
 * @param {string} modelName
 * @param {string} ollamaBaseUrl
 */
export function init(modelName = "llama3:8b", ollamaBaseUrl = "http://127.0.0.1:11434") {
  activeModelName = modelName;
  baseUrl = ollamaBaseUrl;
  console.log(`🤖 Ollama model initialized: ${activeModelName} @ ${baseUrl}`);
}

/**
 * Unified generate method for local Ollama chat API.
 * @param {string} prompt
 * @returns {Promise<{text: string, usage: object}>}
 */
export async function generate(prompt) {
  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: activeModelName,
        stream: false,
        format: "json",
        options: {
          temperature: 0.1,
        },
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Ollama request failed (${response.status}): ${detail || response.statusText}`);
    }

    const data = await response.json();
    const text = data?.message?.content?.trim();

    if (!text) throw new Error("Empty response from Ollama model");

    return {
      text,
      usage: {
        model_used: activeModelName,
      },
    };
  } catch (error) {
    console.error("❌ Ollama generate() error:", error);
    throw new Error(`Ollama Error: ${error.message}`);
  }
}
