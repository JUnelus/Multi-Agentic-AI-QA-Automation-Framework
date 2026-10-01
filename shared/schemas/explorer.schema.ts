import { z } from 'zod';
export const explorationSchema = z.strictObject({
  schemaVersion: z.literal('1.0'), app: z.string().min(1), url: z.url(),
  pages: z.array(z.strictObject({
    id: z.string().min(1), url: z.url(), title: z.string(), headings: z.array(z.string()), screenshot: z.string().min(1),
    elements: z.array(z.strictObject({ evidenceId: z.string().min(1), tag: z.string(), role: z.string(), accessibleName: z.string(), selector: z.string().optional(), visible: z.boolean() }))
  })).min(1),
  limits: z.strictObject({ pagesVisited: z.number().int().nonnegative(), interactions: z.number().int().nonnegative(), durationMs: z.number().nonnegative(), stoppedBy: z.enum(['complete', 'max-pages', 'max-interactions', 'max-duration']) })
});
export type Exploration = z.infer<typeof explorationSchema>;
