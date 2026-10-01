import fs from 'node:fs';
import path from 'node:path';
import { appConfigSchema, appIdSchema } from '../schemas/app-config.schema';
export type { AppConfig } from '../schemas/app-config.schema';
export function loadAppConfig(appName: string) {
  appIdSchema.parse(appName);
  return appConfigSchema.parse(JSON.parse(fs.readFileSync(path.join(process.cwd(), 'apps', appName, 'config.json'), 'utf8')));
}
