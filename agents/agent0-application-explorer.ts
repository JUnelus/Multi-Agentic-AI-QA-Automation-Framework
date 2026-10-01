import { loadAppConfig } from '../shared/utils/app-config';
import { explore } from '../shared/exploration/explorer';
export { explore };
if (require.main === module) {
  const app = process.env.TARGET_APP || 'saucedemo';
  const directory = process.argv[2] || 'generated/runs/explore-' + Date.now();
  explore(app, loadAppConfig(app), directory).then(() => console.log('Exploration: ' + directory)).catch(() => { console.error('Exploration failed. Check target availability and configured limits.'); process.exitCode = 1; });
}

