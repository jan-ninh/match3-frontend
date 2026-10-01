// Local production-preview check; no hosted service or real database is used.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(process.env.MATCH3_PLAYWRIGHT_PACKAGE || 'playwright');
const base = process.env.MATCH3_PREVIEW_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const context = await browser.newContext();
try {
  for (const path of ['/', '/game-map', '/game-map/play-game?level=1', '/game-map/leaderboard', '/game-map/profile']) {
    const response = await context.request.get(base + path);
    assert.equal(response.status(), 200);
    assert.match(await response.text(), /id="root"/);
  }
  console.log('PASS production-preview SPA direct routes return index HTML (Render rewrite remains untested).');
} finally {
  await context.close();
  await browser.close();
}
