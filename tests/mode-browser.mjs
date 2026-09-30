import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { GUEST_STORAGE_KEY, GUEST_CAMPAIGN_VERSION } from '../src/services/guest/guestStore.ts';
const { chromium } = createRequire(import.meta.url)(process.env.MATCH3_PLAYWRIGHT_PACKAGE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const base = process.env.MATCH3_PREVIEW_URL || 'http://127.0.0.1:4173';
const save = {
  schemaVersion: 1,
  campaignVersion: GUEST_CAMPAIGN_VERSION,
  runId: crypto.randomUUID(),
  completedStages: [1],
  lastPlayedStage: 1,
  powers: { bomb: 1, laser: 1, extraShuffle: 1 },
  activeAttempt: null,
};
const contexts = [];
try {
  async function setup(saved = false, late = false) {
    const context = await browser.newContext();
    contexts.push(context);
    const calls = [],
      errors = [];
    let release;
    if (saved)
      await context.addInitScript(
        ({ key, save }) => {
          if (!sessionStorage.getItem('seed')) {
            localStorage.setItem('user', JSON.stringify({ id: '000000000000000000000001', username: 'Saved account' }));
            localStorage.setItem(key, JSON.stringify(save));
            sessionStorage.setItem('seed', '1');
          }
        },
        { key: GUEST_STORAGE_KEY, save },
      );
    await context.route('**/*', (r) =>
      new URL(r.request().url()).origin !== new URL(base).origin && !r.request().url().includes('/api/') ? r.abort() : r.continue(),
    );
    await context.route('**/api/**', async (r) => {
      calls.push(r.request().url());
      if (late) {
        await new Promise((resolve) => (release = resolve));
        try {
          await r.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              accessToken: 'mock-access-token',
              user: {
                revision: 0,
                rulesVersion: 'account-gameplay-v1',
                campaignVersion: 'stage-catalog-2026-09-29-v1',
                runId: null,
                frontier: 1,
                activeAttempt: null,
                pendingRewards: [],
                legacyInterrupted: false,
                id: '000000000000000000000001',
                email: 'account@example.test',
                hearts: 3,
                username: 'Account',
                avatar: 'default.png',
                powers: { bomb: 99, laser: 99, extraShuffle: 99 },
                progress: { stage1: { completed: true } },
                playerLevel: 9,
                playerExp: 2000,
                badges: [],
                gamesPlayed: 1,
                gamesWon: 1,
                gamesLost: 0,
                totalScore: 900,
              },
            }),
          });
        } catch {}
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 14000));
      try {
        await r.fulfill({ status: 503, body: '{}' });
      } catch {}
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    return { page, calls, errors, release: () => release?.() };
  }
  console.log('Mode browser: fresh visitor, blocked backend');
  const fresh = await setup();
  await fresh.page.goto(base + '/game-map');
  await fresh.page.getByRole('button', { name: 'Stage 1', exact: true }).click();
  await fresh.page.getByRole('button', { name: 'Reshuffle', exact: true }).waitFor();
  assert.deepEqual(fresh.calls, []);
  console.log('Mode browser: saved hint, explicit bounded resume and independent Demo save');
  const stale = await setup(true);
  await stale.page.goto(base + '/game-map');
  assert.deepEqual(stale.calls, []);
  assert.equal(await stale.page.getByRole('button', { name: 'Stage 2', exact: true }).isEnabled(), true);
  await stale.page.getByRole('button', { name: 'Account' }).click();
  await stale.page.getByText('Checking account', { exact: true }).waitFor();
  const start = Date.now();
  await stale.page.getByText('Account unavailable', { exact: true }).waitFor({ timeout: 12500 });
  assert.ok(Date.now() - start < 12500);
  assert.equal(await stale.page.getByRole('button', { name: 'Retry account', exact: true }).isVisible(), true);
  assert.equal(await stale.page.getByRole('button', { name: 'Stage 1', exact: true }).count(), 0);
  await stale.page.getByRole('button', { name: 'Play Demo', exact: true }).first().click();
  await stale.page.getByRole('button', { name: 'Stage 2', exact: true }).waitFor();
  assert.deepEqual(await stale.page.evaluate((key) => JSON.parse(localStorage.getItem(key)), GUEST_STORAGE_KEY), save);
  console.log('Mode browser: late account response and online event cannot overwrite Demo');
  const late = await setup(true, true);
  await late.page.goto(base + '/game-map');
  await late.page.getByRole('button', { name: 'Account' }).click();
  await late.page.getByText('Checking account', { exact: true }).waitFor();
  await late.page.waitForFunction(() => document.body.textContent.includes('Checking account'));
  // Wait for the actual account read to reach the test server before leaving its owner.
  const reachDeadline = Date.now() + 2000;
  while (!late.calls.length && Date.now() < reachDeadline) await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(late.calls.length, 1);
  await late.page.getByRole('button', { name: 'Play Demo', exact: true }).first().click();
  late.release();
  await late.page.getByRole('button', { name: 'Stage 2', exact: true }).waitFor();
  await late.page.evaluate(() => window.dispatchEvent(new Event('online')));
  await late.page.getByRole('button', { name: 'Stage 2', exact: true }).click();
  await late.page.getByRole('button', { name: 'Reshuffle', exact: true }).waitFor();
  await late.page.getByRole('button', { name: 'Reshuffle', exact: true }).click();
  await late.page.waitForFunction((key) => JSON.parse(localStorage.getItem(key)).powers.extraShuffle === 0, GUEST_STORAGE_KEY);
  const restored = await late.page.evaluate((key) => JSON.parse(localStorage.getItem(key)), GUEST_STORAGE_KEY);
  assert.equal(restored.runId, save.runId);
  assert.deepEqual(restored.completedStages, [1]);
  assert.equal(restored.powers.bomb, 1);
  assert.equal(late.calls.length, 1);
  for (const item of [fresh, stale, late]) assert.deepEqual(item.errors, []);
  console.log(
    'PASS: immediate fresh/stale Demo; explicit resume; bounded unavailable/Retry/Demo; guest save retained; late response and reconnect isolated; actual guest inventory use.',
  );
} finally {
  for (const c of contexts) await c.close();
  await browser.close();
}
