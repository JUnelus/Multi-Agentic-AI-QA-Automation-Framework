import { z } from 'zod';
export function parseJsonResponse<T>(rawText: string, schema: z.ZodType<T>): T {
  const trimmed = rawText.trim();

  if (!trimmed) {
    throw new Error('The model returned an empty response.');
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fencedMatch?.[1] ?? trimmed;

  return schema.parse(JSON.parse(candidate));
}

