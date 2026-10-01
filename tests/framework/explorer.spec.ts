import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { explore } from '../../shared/exploration/explorer';
import { allowedNavigation } from '../../shared/exploration/route-observer';
import { loadAppConfig } from '../../shared/utils/app-config';
test('same-origin rejects external, non-http and malformed URLs', () => {
  assert.equal(
    allowedNavigation('https://example.org/a', 'https://example.org/'),
    true
  );
  for (const url of ['https://evil.org', 'javascript:alert(1)', 'broken'])
    assert.equal(allowedNavigation(url, 'https://example.org'), false);
});
test('bounded explorer captures actual DOM evidence and screenshots', async () => {
  const server = http.createServer((_req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end(
      '<title>Fixture</title><h1>Welcome</h1><form><label for="user">User</label><input id="user" data-test="username"><button>Login</button><a href="/next">Next</a></form>'
    );
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-explore-'));
  try {
    const url =
      'http://127.0.0.1:' +
      (server.address() as import('node:net').AddressInfo).port;
    const config = loadAppConfig('saucedemo');
    config.baseUrl = url;
    config.exploration = {
      maxPages: 1,
      maxInteractions: 0,
      maxDurationMs: 10000,
      routes: ['/next'],
      allowedOrigins: []
    };
    const result = await explore('fixture', config, directory);
    assert.equal(result.pages.length, 1);
    assert.equal(result.limits.stoppedBy, 'max-pages');
    assert.equal(
      result.pages[0].elements.find(
        (e) => e.selector === '[data-test="username"]'
      )?.accessibleName,
      'User'
    );
    assert.ok(fs.existsSync(path.join(directory, result.pages[0].screenshot)));
    config.exploration.maxPages = 3;
    const bounded = await explore('fixture', config, directory);
    assert.equal(bounded.pages.length, 1);
    assert.equal(bounded.limits.stoppedBy, 'max-interactions');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('explorer blocks cross-origin redirects before visiting the destination', async () => {
  let destinationVisits = 0;
  const destination = http.createServer((_req, res) => {
    destinationVisits++;
    res.end('external');
  });
  await new Promise<void>((resolve) =>
    destination.listen(0, '127.0.0.1', resolve)
  );
  const destinationUrl =
    'http://127.0.0.1:' +
    (destination.address() as import('node:net').AddressInfo).port;
  const source = http.createServer((_req, res) => {
    res.writeHead(302, { Location: destinationUrl });
    res.end();
  });
  await new Promise<void>((resolve) => source.listen(0, '127.0.0.1', resolve));
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-origin-'));
  try {
    const config = loadAppConfig('saucedemo');
    config.baseUrl =
      'http://127.0.0.1:' +
      (source.address() as import('node:net').AddressInfo).port;
    await assert.rejects(() => explore('fixture', config, directory));
    assert.equal(destinationVisits, 0);
  } finally {
    await Promise.all([
      new Promise<void>((resolve) => source.close(() => resolve())),
      new Promise<void>((resolve) => destination.close(() => resolve()))
    ]);
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
