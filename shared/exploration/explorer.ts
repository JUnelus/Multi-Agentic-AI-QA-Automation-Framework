import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { AppConfig } from '../schemas/app-config.schema';
import { explorationSchema, Exploration } from '../schemas/explorer.schema';
import { observeElements } from './element-observer';
import { allowedNavigation } from './route-observer';
export async function explore(app: string, config: AppConfig, runDirectory: string): Promise<Exploration> {
  const start = Date.now();
  const limits = config.exploration;
  const browser = await chromium.launch({ timeout: limits.maxDurationMs });
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const pages: Exploration['pages'] = [];
  let interactions = 0;
  let stoppedBy: Exploration['limits']['stoppedBy'] = 'complete';
  const deadlineState = { expired: false };
  const deadline = setTimeout(() => { deadlineState.expired = true; stoppedBy = 'max-duration'; void context.close().catch(() => {}); }, Math.max(1, limits.maxDurationMs - (Date.now() - start)));
  try {
    await context.route('**/*', route => {
      const request = route.request();
      return request.isNavigationRequest() && !allowedNavigation(request.url(), config.baseUrl, limits.allowedOrigins) ? route.abort('blockedbyclient') : route.continue();
    });
    const page = await context.newPage();
    context.on('page', popup => { if (popup !== page) void popup.close(); });
    const routes = [...new Set([config.baseUrl, ...limits.routes.map(route => new URL(route, config.baseUrl).href)])];
    fs.mkdirSync(path.join(runDirectory, 'screenshots'), { recursive: true });
    for (const route of routes) {
      if (pages.length >= limits.maxPages) { stoppedBy = 'max-pages'; break; }
      if (pages.length && interactions >= limits.maxInteractions) { stoppedBy = 'max-interactions'; break; }
      if (!allowedNavigation(route, config.baseUrl, limits.allowedOrigins)) throw new Error('Exploration route outside allowed origins');
      if (pages.length) interactions++;
      await page.goto(route, { waitUntil: 'domcontentloaded', timeout: Math.max(1, limits.maxDurationMs - (Date.now() - start)) });
      if (!allowedNavigation(page.url(), config.baseUrl, limits.allowedOrigins)) throw new Error('Redirect outside allowed origins');
      const id = 'PAGE-' + String(pages.length + 1).padStart(3, '0');
      const elements = await observeElements(page, id);
      const screenshot = 'screenshots/' + id + '.png';
      await page.screenshot({ path: path.join(runDirectory, screenshot), fullPage: false });
      pages.push({ id, url: page.url(), title: await page.title(), headings: elements.filter(e => e.visible && e.role === 'heading').map(e => e.accessibleName), elements, screenshot });
    }
  } catch (error) {
    if (!deadlineState.expired || !pages.length) throw error;
  } finally { clearTimeout(deadline); await browser.close(); }
  const result = explorationSchema.parse({ schemaVersion: '1.0', app, url: config.baseUrl, pages, limits: { pagesVisited: pages.length, interactions, durationMs: Date.now() - start, stoppedBy } });
  fs.writeFileSync(path.join(runDirectory, 'exploration.json'), JSON.stringify(result, null, 2));
  return result;
}
