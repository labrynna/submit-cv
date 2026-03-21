import OpenAI from "openai";

/**
 * Generates a 1536-dimensional embedding vector for the given text using
 * OpenAI's text-embedding-3-small model.
 *
 * The resulting vector is stored in pgvector and used by AI agents to find
 * semantically similar candidates for a given job description.
 */
export async function createEmbedding(text: string): Promise<number[]> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text.slice(0, 8000), // stay within token limits
  });
  return response.data[0].embedding;
}
