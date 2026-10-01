export function allowedNavigation(url: string, baseUrl: string, extraOrigins: string[] = []): boolean {
  try { const target = new URL(url); return ['http:', 'https:'].includes(target.protocol) && [new URL(baseUrl).origin, ...extraOrigins.map(x => new URL(x).origin)].includes(target.origin); }
  catch { return false; }
}

