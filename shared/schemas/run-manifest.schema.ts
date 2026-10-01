import { z } from 'zod';
import { validationReportSchema } from './validation-report.schema';
export const runManifestSchema = z.strictObject({
  runId: z.string().min(1), application: z.string().min(1), createdAt: z.iso.datetime(), model: z.string(),
  promptVersions: z.record(z.string(), z.string()), inputHashes: z.record(z.string(), z.string()), artifacts: z.record(z.string(), z.string()),
  counts: z.strictObject({ generatedTests: z.number().int().nonnegative(), approvedTests: z.number().int().nonnegative(), automationReady: z.number().int().nonnegative(), specs: z.number().int().nonnegative(), pageObjects: z.number().int().nonnegative() }),
  validation: validationReportSchema,
  usage: z.strictObject({ inputTokens: z.number().nonnegative(), outputTokens: z.number().nonnegative(), totalTokens: z.number().nonnegative() }).optional(), demoApproval: z.boolean().default(false)
});
export type RunManifest = z.infer<typeof runManifestSchema>;
