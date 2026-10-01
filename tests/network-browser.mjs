import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(process.env.MATCH3_PLAYWRIGHT_PACKAGE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const base = process.env.MATCH3_PREVIEW_URL || 'http://127.0.0.1:4173';
const context = await browser.newContext();
const calls = [];
const errors = [];
try {
  await context.addInitScript(() => localStorage.setItem('user', JSON.stringify({ id: '000000000000000000000001', username: 'Saved account' })));
  await context.route('**/*', (route) =>
    new URL(route.request().url()).origin !== new URL(base).origin && !route.request().url().includes('/api/') ? route.abort() : route.continue(),
  );
  await context.route('**/ready', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"ready":true}' }));
  await context.route('**/api/**', async (route) => {
    calls.push(route.request().url());
    await new Promise((r) => setTimeout(r, 15000));
    try {
      await route.fulfill({ status: 503, body: '{}' });
    } catch {
      /* request already aborted */
    }
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base + '/game-map');
  assert.equal(calls.length, 0);
  await page.getByRole('button', { name: 'Account' }).click();
  let start = Date.now();
  await page.getByText('Account unavailable', { exact: true }).waitFor({ timeout: 12500 });
  assert.ok(Date.now() - start < 12500);
  await page.getByRole('button', { name: 'Play Demo', exact: true }).first().click();
  await page.getByRole('button', { name: 'Stage 1', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Account' }).click();
  await page.getByRole('link', { name: 'Profile', exact: true }).click();
  await page.getByText('Account unavailable', { exact: true }).waitFor({ timeout: 12500 });
  assert.equal(await page.getByText('Loading profile...', { exact: true }).count(), 0);
  await page.getByRole('link', { name: 'Leaderboard', exact: true }).click();
  await page.getByText('Leaderboard unavailable', { exact: true }).waitFor({ timeout: 12500 });
  await page.evaluate(() => {
    history.pushState({}, '', '/game-map/play-game?level=8');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await page.getByText('Account unavailable', { exact: true }).waitFor({ timeout: 12500 });
  assert.equal(await page.getByRole('button', { name: 'Reshuffle', exact: true }).count(), 0);
  assert.ok(calls.every((url) => !url.includes('/start/')));
  assert.deepEqual(errors, []);
  console.log('PASS: bounded account map/profile/leaderboard/route failure, explicit Demo fallback, no fabricated stage or mutation.');
} finally {
  await context.close();
  await browser.close();
}
