import { z } from 'zod';
export const failureCategorySchema = z.enum(['GENERATOR_ERROR', 'IMPORT_ERROR', 'PAGE_OBJECT_CONTRACT_ERROR', 'SELECTOR_ERROR', 'ASSERTION_ERROR', 'TEST_DATA_ERROR', 'ENVIRONMENT_ERROR', 'POSSIBLE_PRODUCT_DEFECT', 'UNKNOWN']);
export const gateSchema = z.strictObject({ status: z.enum(['passed', 'failed', 'not-run']), diagnostics: z.string(), durationMs: z.number().nonnegative() });
export const validationReportSchema = z.strictObject({
  runId: z.string().min(1), schema: gateSchema, typecheck: gateSchema, discovery: gateSchema, execution: gateSchema,
  initialTypecheck: gateSchema, repairAttempts: z.number().int().min(0).max(3),
  category: failureCategorySchema.optional(), defectCandidates: z.array(z.string()), finalResult: z.enum(['passed', 'failed', 'pending']), artifactHash: z.string().optional()
});
export type FailureCategory = z.infer<typeof failureCategorySchema>;
export type Gate = z.infer<typeof gateSchema>;
export type ValidationReport = z.infer<typeof validationReportSchema>;
