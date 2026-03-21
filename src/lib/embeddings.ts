import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Generates a 768-dimensional embedding vector for the given text.
 *
 * Primary provider:  Google Gemini text-embedding-004 (free tier, 768-dim).
 * Fallback provider: OpenRouter openai/text-embedding-3-small (768-dim via
 *                    the `dimensions` parameter).
 *
 * Returns null when neither API key is configured (CV is stored without an
 * embedding and AI-search is disabled for that entry).
 */
export async function createEmbedding(text: string): Promise<number[] | null> {
  const input = text.slice(0, 10000);

  // ── 1. Gemini (primary) ────────────────────────────────────────────────
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
      const result = await model.embedContent(input);
      return result.embedding.values;
    } catch (err) {
      console.warn("Gemini embedding failed, trying OpenRouter fallback:", err);
    }
  }

  // ── 2. OpenRouter (fallback) ───────────────────────────────────────────
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (openRouterKey) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://directhr.com",
          "X-Title": "DirectHR CV Submission",
        },
        body: JSON.stringify({
          model: "openai/text-embedding-3-small",
          input,
          dimensions: 768,
        }),
      });
      if (!res.ok) {
        throw new Error(`OpenRouter embedding API error: ${res.status}`);
      }
      const json = (await res.json()) as {
        data: Array<{ embedding: number[] }>;
      };
      return json.data[0].embedding;
    } catch (err) {
      console.warn("OpenRouter embedding failed:", err);
    }
  }

  // No embedding providers available — CV stored without semantic search.
  if (!geminiKey && !openRouterKey) {
    console.info(
      "No embedding API key configured (GEMINI_API_KEY or OPENROUTER_API_KEY). " +
        "CV stored without embedding; AI search disabled for this entry."
    );
  }
  return null;
}
