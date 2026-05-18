import fs from 'fs';
import path from 'path';

export interface AppCredentials {
  [key: string]: {
    username: string;
    password: string;
  };
}

export interface AppConfig {
  appName: string;
  baseUrl: string;
  testCaseOutput: string;
  generatedSpecsPath: string;
  generatedPageObjectsPath: string;
  testFocusAreas: string[];
  credentials?: AppCredentials;
}

export function loadAppConfig(appName: string): AppConfig {
  const configPath = path.join(process.cwd(), 'apps', appName, 'config.json');

  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found for app: ${appName}`);
  }

  return JSON.parse(fs.readFileSync(configPath, 'utf-8')) as AppConfig;
}

