export const caseIdPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/;
export function extractCaseId(title: string): string | undefined {
  return /^\[([A-Za-z0-9][A-Za-z0-9_-]{0,99})\]\s+\S.*$/.exec(title)?.[1];
}
