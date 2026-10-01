import { caseIdPattern } from '../validation/test-identity';
import { z } from 'zod';
const text = z.string().trim().min(1);
export const selectorEvidenceSchema = z.strictObject({
  evidenceId: text,
  selector: text
});
export const testCaseSchema = z.strictObject({
  schemaVersion: z.literal('1.0'),
  application: z
    .string()
    .regex(/^[a-z][a-z0-9-]*$/)
    .optional(),
  explorationHash: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
  testCaseId: z.string().regex(caseIdPattern),
  feature: text,
  scenario: text,
  testType: z.enum(['positive', 'negative', 'edge', 'accessibility']),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  preconditions: z.array(text),
  steps: z
    .array(
      z.strictObject({
        stepNumber: z.number().int().positive(),
        action: text,
        expected: text.optional()
      })
    )
    .min(1)
    .refine(
      (steps) => steps.every((s, i) => s.stepNumber === i + 1),
      'Steps must be numbered sequentially starting at 1'
    ),
  expectedResult: text,
  automationFeasible: z.boolean(),
  selectorEvidence: z.array(selectorEvidenceSchema).optional(),
  evidenceIds: z.array(text).optional(),
  requirementSource: text.optional(),
  expectedBehaviorSource: z
    .enum(['observed', 'requirement', 'inferred', 'approved-baseline'])
    .optional(),
  confidence: z.number().min(0).max(1).optional(),
  reviewStatus: z.enum(['draft', 'approved', 'rejected']),
  pageObject: text.optional()
});
export const testCasesSchema = z
  .array(testCaseSchema)
  .min(1)
  .refine(
    (cases) => new Set(cases.map((c) => c.testCaseId)).size === cases.length,
    'Duplicate testCaseId'
  );
export type TestCase = z.infer<typeof testCaseSchema>;
