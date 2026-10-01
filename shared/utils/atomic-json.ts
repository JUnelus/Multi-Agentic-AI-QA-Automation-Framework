import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { assertNoSymlinks } from './safe-path';
// Same-directory rename replaces a regular destination on both Node/Windows and
// Linux. Never unlink current first: on failure readers retain the old document.
export function writeAtomicJson(
  destination: string,
  value: unknown,
  replace = fs.renameSync
): void {
  assertNoSymlinks(destination);
  const temporary = path.join(
    path.dirname(destination),
    '.' + path.basename(destination) + '.' + randomUUID() + '.tmp'
  );
  let descriptor: number | undefined;
  try {
    descriptor = fs.openSync(temporary, 'wx', 0o600);
    fs.writeFileSync(descriptor, JSON.stringify(value, null, 2) + '\n');
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    replace(temporary, destination);
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}
