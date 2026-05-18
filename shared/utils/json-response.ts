export function parseJsonResponse<T>(rawText: string): T {
  const trimmed = rawText.trim();

  if (!trimmed) {
    throw new Error('The model returned an empty response.');
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fencedMatch?.[1] ?? trimmed;

  return JSON.parse(candidate) as T;
}

