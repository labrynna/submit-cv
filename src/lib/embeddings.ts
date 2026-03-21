import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Generates a 768-dimensional embedding vector for the given text using
 * Google Gemini's text-embedding-004 model (generous free tier).
 *
 * The resulting vector is stored in pgvector and used by AI agents to find
 * semantically similar candidates for a given job description.
 */
export async function createEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to your environment variables."
    );
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
  // Slice to ~10 000 characters as a conservative approximation of the token limit
  const result = await model.embedContent(text.slice(0, 10000));
  return result.embedding.values;
}
