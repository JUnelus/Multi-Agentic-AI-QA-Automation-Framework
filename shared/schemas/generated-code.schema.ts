import { z } from 'zod';
const file = (pattern: RegExp) => z.strictObject({ fileName: z.string().regex(pattern), code: z.string().trim().min(1) });
export const generatedCodeSchema = z.strictObject({
  pageObjects: z.array(file(/^[A-Za-z][A-Za-z0-9_-]*\.ts$/)).min(1),
  specFiles: z.array(file(/^[A-Za-z][A-Za-z0-9_-]*\.spec\.ts$/)).min(1)
}).superRefine((output, ctx) => {
  for (const group of [output.pageObjects, output.specFiles]) {
    const names = group.map(f => f.fileName.toLowerCase());
    if (new Set(names).size !== names.length) ctx.addIssue({ code: 'custom', message: 'Duplicate filenames' });
  }
});
export type GeneratedCode = z.infer<typeof generatedCodeSchema>;
