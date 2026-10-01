import dotenv from 'dotenv';
import OpenAI from 'openai';
dotenv.config({ quiet: true });
export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5.5';
export interface ModelResponse {
  text: string;
  usage?: { inputTokens: number; outputTokens: number; totalTokens: number };
}
export type Model = (prompt: string) => Promise<ModelResponse>;
// Lazy construction keeps imports and all fixture tests independent of API credentials.
export const generateWithOpenAI: Model = async (prompt) => {
  if (!process.env.OPENAI_API_KEY)
    throw new Error('OPENAI_API_KEY is missing.');
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 120000,
    maxRetries: 2
  });
  const response = await client.responses.create({
    model: OPENAI_MODEL,
    input: prompt,
    max_output_tokens: 16000
  });
  if (response.status !== 'completed')
    throw new Error('Model response did not complete: ' + response.status);
  return {
    text: response.output_text,
    usage: response.usage
      ? {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          totalTokens: response.usage.total_tokens
        }
      : undefined
  };
};
