/**
 * Cleans and safely parses raw LLM output into JSON.
 * Handles common formatting issues like markdown code fences.
 */
export function parseLLMResponse(response) {
  try {
    if (!response || typeof response !== "string") {
      throw new Error("Empty or invalid response string");
    }

    const cleaned = response
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .replace(/[\u0000-\u001F]/g, "") // remove control chars
      .trim();

    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}");
    const candidate =
      jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart
        ? cleaned.slice(jsonStart, jsonEnd + 1)
        : cleaned;

    return JSON.parse(candidate);
  } catch (error) {
    console.error("⚠️ Failed to parse LLM JSON response:", error);
    throw new Error("Invalid JSON format in LLM output");
  }
}
