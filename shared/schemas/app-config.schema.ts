import { z } from 'zod';
export const appIdSchema = z.string().regex(/^[a-z][a-z0-9-]*$/);
export const appConfigSchema = z.strictObject({
  appName: z.string().trim().min(1),
  baseUrl: z.url().refine(value => ['http:', 'https:'].includes(new URL(value).protocol)),
  testCaseOutput: z.string().min(1), generatedSpecsPath: z.string().min(1), generatedPageObjectsPath: z.string().min(1),
  testFocusAreas: z.array(z.string().trim().min(1)).min(1),
  credentials: z.record(z.string(), z.strictObject({ username: z.string().min(1), password: z.string().min(1) })).optional(),
  exploration: z.strictObject({
    maxPages: z.number().int().min(1).max(20).default(3), maxInteractions: z.number().int().min(0).max(20).default(3),
    maxDurationMs: z.number().int().min(100).max(120000).default(30000),
    routes: z.array(z.string().min(1)).max(20).default([]), allowedOrigins: z.array(z.url()).default([])
  }).default({ maxPages: 3, maxInteractions: 3, maxDurationMs: 30000, routes: [], allowedOrigins: [] })
});
export type AppConfig = z.infer<typeof appConfigSchema>;
