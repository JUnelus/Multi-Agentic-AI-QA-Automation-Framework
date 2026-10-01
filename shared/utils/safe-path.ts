import fs from 'node:fs';
import path from 'node:path';
import {
  generatedCodeSchema,
  GeneratedCode
} from '../schemas/generated-code.schema';
export function safeDestination(
  root: string,
  filename: string,
  kind: 'page' | 'spec'
): string {
  const pattern =
    kind === 'spec'
      ? /^[A-Za-z][A-Za-z0-9_-]*\.spec\.ts$/
      : /^[A-Za-z][A-Za-z0-9_-]*\.ts$/;
  if (
    !pattern.test(filename) ||
    /^(con|prn|aux|nul|com[0-9]|lpt[0-9])\./i.test(filename)
  )
    throw new Error('Unsafe TypeScript filename: ' + filename);
  const base = path.resolve(root);
  const destination = path.resolve(base, filename);
  if (path.dirname(destination) !== base)
    throw new Error('Output escapes intended directory');
  assertNoSymlinks(base);
  if (fs.existsSync(destination) && fs.lstatSync(destination).isSymbolicLink())
    throw new Error('Symlink output rejected');
  return destination;
}
export function assertNoSymlinks(target: string): void {
  let current = path.resolve(target);
  while (true) {
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink())
      throw new Error('Symlink path rejected: ' + current);
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
}
// Each batch gets a fresh directory. Existing artifacts cannot be overwritten.
export function stageCode(output: GeneratedCode, directory: string): void {
  const code = generatedCodeSchema.parse(output);
  assertNoSymlinks(directory);
  if (fs.existsSync(directory))
    throw new Error('Staging directory already exists');
  for (const file of code.pageObjects)
    safeDestination(
      path.join(directory, 'page-objects'),
      file.fileName,
      'page'
    );
  for (const file of code.specFiles)
    safeDestination(path.join(directory, 'specs'), file.fileName, 'spec');
  fs.mkdirSync(path.join(directory, 'page-objects'), { recursive: true });
  fs.mkdirSync(path.join(directory, 'specs'));
  for (const [kind, files] of [
    ['page', code.pageObjects],
    ['spec', code.specFiles]
  ] as const) {
    for (const file of files)
      fs.writeFileSync(
        safeDestination(
          path.join(directory, kind === 'page' ? 'page-objects' : 'specs'),
          file.fileName,
          kind
        ),
        file.code,
        { flag: 'wx' }
      );
  }
}
