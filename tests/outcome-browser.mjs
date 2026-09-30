import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(process.env.MATCH3_PLAYWRIGHT_PACKAGE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const base = process.env.MATCH3_DEV_URL || 'http://127.0.0.1:5173';
try {
  for (const { outcome, expired } of [
    { outcome: 'WIN', expired: false },
    { outcome: 'LOSS', expired: false },
    { outcome: 'WIN', expired: true },
  ]) {
    let refreshes = 0;
    const owner = '000000000000000000000001';
    const profile = {
      id: owner,
      email: 'account@example.test',
      hearts: 3,
      username: 'Account',
      avatar: 'default.png',
      powers: { bomb: 120, laser: 120, extraShuffle: 120 },
      progress: {},
      playerLevel: 1,
      playerExp: 0,
      totalScore: 0,
      badges: [],
      gamesPlayed: 0,
      gamesWon: 0,
      gamesLost: 0,
      revision: 0,
      rulesVersion: 'account-gameplay-v1',
      campaignVersion: 'stage-catalog-2026-09-29-v1',
      runId: null,
      frontier: 1,
      activeAttempt: null,
      pendingRewards: [],
      legacyInterrupted: false,
      campaign: null,
      sandboxUnlocked: false,
      campaignNeedsReset: false,
    };
    const context = await browser.newContext();
    const writes = [];
    const errors = [];
    await context.addInitScript(() => localStorage.setItem('user', JSON.stringify({ id: '000000000000000000000001', username: 'Account' })));
    await context.route('**/*', (r) =>
      new URL(r.request().url()).origin !== new URL(base).origin && !r.request().url().includes('/api/') ? r.abort() : r.continue(),
    );
    await context.route('**/ready', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"ready":true}' }));
    await context.route('**/api/**', async (route) => {
      const url = route.request().url();
      if (!new URL(url).pathname.startsWith('/api/')) return route.continue();
      if (url.includes('/attempts/terminal')) {
        writes.push(url);
        if (expired) {
          await route.fulfill({ status: 401, body: '{}' });
          return;
        }
        await new Promise((r) => setTimeout(r, 11000));
        try {
          await route.fulfill({ status: 503, body: '{}' });
        } catch {}
        return;
      }
      if (url.includes('/auth/refresh') && ++refreshes > 1 && expired) {
        await route.fulfill({ status: 401, body: '{}' });
        return;
      }
      let data;
      if (url.includes('/auth/refresh')) data = { accessToken: 'mock-access-token', user: profile };
      else if (url.includes('/auth/me')) data = profile;
      else if (url.includes('/attempts/start')) {
        const body = route.request().postDataJSON();
        profile.runId = crypto.randomUUID();
        profile.revision = 1;
        profile.activeAttempt = {
          attemptId: crypto.randomUUID(),
          runId: profile.runId,
          stageNumber: 1,
          scenarioVersion: 'stage-catalog-2026-09-29-v1:clean-room',
          startedAt: new Date().toISOString(),
          startedRevision: 1,
          startOperationId: body.operationId,
          initialPowers: profile.powers,
        };
        data = {
          receipt: { operationId: body.operationId, command: 'START', attemptId: profile.activeAttempt.attemptId, status: 'committed', resultingRevision: 1 },
          snapshot: profile,
        };
      } else {
        throw Error('Unexpected API request ' + new URL(url).pathname);
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(base + '/game-map');
    await page.getByRole('button', { name: 'Account' }).click();
    await page.getByRole('button', { name: 'Stage 1', exact: true }).click();
    await page.getByRole('button', { name: 'Reshuffle', exact: true }).waitFor();
    await page.locator('[data-piece-id]').first().waitFor();
    await page.evaluate(() => document.activeElement?.blur());
    await page.keyboard.press('d');
    const start = Date.now();
    await page.getByRole('button', { name: outcome === 'WIN' ? 'Win (unlock next)' : 'Lose (reset + lvl1)', exact: true }).click();
    await page.getByText(outcome === 'WIN' ? 'You Won!' : 'Game Over', { exact: true }).waitFor({ timeout: 3000 });
    assert.ok(Date.now() - start < 3000);
    if (!expired) await page.getByText('Saving', { exact: true }).waitFor();
    const label = expired ? 'Not accepted' : 'Save unconfirmed';
    await page.getByText(label, { exact: true }).first().waitFor({ timeout: 10000 });
    if (expired) await page.getByText('Session expired. Sign in again or play Demo.', { exact: true }).waitFor();
    assert.equal(writes.length, 1);
    await page
      .getByRole('button', { name: /Return to map/i })
      .last()
      .click();
    await page.getByText(label, { exact: true }).first().waitFor();
    assert.equal(await page.getByRole('button', { name: 'Stage 1', exact: true }).count(), 0);
    await page.getByText(expired ? 'Session expired' : 'Account unavailable', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Play Demo', exact: true }).first().click();
    await page.getByRole('button', { name: 'Stage 1', exact: true }).waitFor();
    assert.deepEqual(errors, []);
    console.log(
      'PASS: ' +
        outcome +
        (expired
          ? ' overlay remains account-bound after session expiry; rejected save, map/Demo usable.'
          : ' overlay immediate, mutation sends once, timeout unconfirmed, map/Demo usable.'),
    );
    await context.close();
  }
} finally {
  await browser.close();
}
