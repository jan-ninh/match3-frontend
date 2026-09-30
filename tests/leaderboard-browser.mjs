import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(process.env.MATCH3_PLAYWRIGHT_PACKAGE || 'playwright');
const base = process.env.MATCH3_PREVIEW_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const context = await browser.newContext();
const version = 'regular-campaign-points-v1';
const owner = '000000000000000000000001';
const row = (username, rank = 1, accountId = owner) => ({
  accountId,
  username,
  avatar: 'default.png',
  score: 8800,
  rank,
  finalizedAt: new Date(0).toISOString(),
  scoreVersion: version,
});
const user = {
  id: owner,
  email: 'mock@example.test',
  username: 'OwnAccount',
  avatar: 'default.png',
  hearts: 3,
  powers: { bomb: 120, laser: 120, extraShuffle: 120 },
  totalScore: 999999,
  progress: {},
  gamesPlayed: 0,
  gamesWon: 0,
  gamesLost: 0,
  badges: [],
  playerLevel: 1,
  playerExp: 0,
  revision: 0,
  runId: null,
  frontier: 1,
  activeAttempt: null,
  pendingRewards: [],
  legacyInterrupted: false,
  campaign: null,
  sandboxUnlocked: false,
  campaignNeedsReset: false,
  rulesVersion: 'account-gameplay-v1',
  campaignVersion: 'stage-catalog-2026-09-29-v1',
};
let kind = 'empty',
  release,
  topCalls = 0;
const calls = [],
  errors = [];
try {
  await context.route('**/*', (route) =>
    new URL(route.request().url()).origin === new URL(base).origin || route.request().url().includes('/api/') ? route.continue() : route.abort(),
  );
  await context.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (!path.startsWith('/api/')) return route.fallback();
    calls.push(path);
    const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === '/api/auth/refresh') return json({ accessToken: 'controlled-test-only', user });
    if (path === '/api/auth/me') return json(user);
    if (path === '/api/leaderboard/me') return json({ rank: 42, best: row('OwnAccount', 42), scoreVersion: version });
    if (path !== '/api/leaderboard/top') throw Error('Unexpected API path: ' + path);
    topCalls++;
    const atRequest = kind;
    if (atRequest === 'late') {
      await new Promise((resolve) => (release = resolve));
      try {
        return await json({ entries: [row('Obsolete')], scoreVersion: version });
      } catch {
        return;
      }
    }
    if (atRequest === 'fail') return route.abort();
    await new Promise((resolve) => setTimeout(resolve, 350));
    return json({ entries: atRequest === 'empty' ? [] : [row('LatestPublic', 1, '000000000000000000000002')], scoreVersion: version });
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(base + '/game-map/leaderboard');
  await page.getByText('Loading leaderboard...', { exact: true }).waitFor();
  await page.getByText('No completed campaigns yet.', { exact: true }).waitFor();
  kind = 'fail';
  await page.reload();
  await page.getByText('Leaderboard unavailable', { exact: true }).waitFor({ timeout: 12000 });
  assert.equal(await page.getByText('Loading leaderboard...', { exact: true }).count(), 0);
  kind = 'late';
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  const end = Date.now() + 2000;
  while (!release && Date.now() < end) await new Promise((resolve) => setTimeout(resolve, 10));
  assert.ok(release);
  kind = 'ready';
  await page.getByRole('button', { name: 'Account', exact: true }).click();
  await page.getByRole('link', { name: 'Leaderboard', exact: true }).click();
  try {
    await page.getByText('Your best completed campaign · rank 42', { exact: true }).waitFor({ timeout: 8000 });
  } catch (e) {
    console.log((await page.locator('body').innerText()).slice(0, 2000), calls);
    throw e;
  }
  await page.getByText('LatestPublic', { exact: true }).waitFor();
  release();
  await page.waitForTimeout(500);
  assert.equal(await page.getByText('Obsolete', { exact: true }).count(), 0);
  assert.equal(await page.getByText('999999', { exact: true }).count(), 0);
  await page.getByRole('button', { name: 'Play Demo', exact: true }).click();
  await page.getByRole('link', { name: 'Leaderboard', exact: true }).click();
  await page.getByText('LatestPublic', { exact: true }).waitFor();
  assert.equal(await page.getByText('Your best completed campaign · rank 42', { exact: true }).count(), 0);
  assert.ok(topCalls >= 4);
  assert.ok(calls.every((path) => ['/api/leaderboard/top', '/api/leaderboard/me', '/api/auth/refresh', '/api/auth/me'].includes(path)));
  assert.deepEqual(errors, []);
  console.log(
    'PASS: canonical leaderboard Loading/empty/unavailable/Retry, verified own rank outside top ten, late old-generation response ignored, Demo/account presentation isolation and no fake gameplay-score fallback.',
  );
} finally {
  release?.();
  await context.close();
  await browser.close();
}
