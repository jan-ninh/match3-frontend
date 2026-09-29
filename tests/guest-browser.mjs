// Run against a built local preview. Requires Playwright and an installed Edge.
// MATCH3_PLAYWRIGHT_PACKAGE may point to an existing bundled Playwright package.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { GUEST_STORAGE_KEY, GUEST_STARTING_POWERS, GUEST_CAMPAIGN_VERSION } from '../src/services/guest/guestStore.ts';
const { chromium } = createRequire(import.meta.url)(process.env.MATCH3_PLAYWRIGHT_PACKAGE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const base = process.env.MATCH3_PREVIEW_URL || 'http://127.0.0.1:4173';
let contexts = 0;
try {
  async function setup(options = {}) {
    const context = await browser.newContext();
    const calls = [];
    const errors = [];
    await context.route('**/*', (route) =>
      new URL(route.request().url()).origin !== new URL(base).origin && !route.request().url().includes('/api/') ? route.abort() : route.continue(),
    );
    await context.route('**/api/**', (route) => {
      calls.push(route.request().url());
      return route.abort();
    });
    await context.addInitScript(
      ({ key, saved, blocked }) => {
        if (!sessionStorage.getItem('fixture-seeded')) {
          localStorage.setItem('user', JSON.stringify({ id: '000000000000000000000001', username: 'Stale account' }));
          localStorage.setItem('match3-progress', JSON.stringify({ completedLevels: [1, 2, 3], unlockedLevels: [4] }));
          if (saved) localStorage.setItem(key, saved);
          sessionStorage.setItem('fixture-seeded', '1');
        }
        if (blocked)
          Object.defineProperty(window, 'localStorage', {
            get() {
              throw new DOMException('Blocked', 'SecurityError');
            },
          });
      },
      { key: GUEST_STORAGE_KEY, saved: options.saved, blocked: options.blocked },
    );
    const page = await context.newPage();
    page.on('pageerror', (err) => errors.push(err.message));
    contexts++;
    return { context, page, calls, errors };
  }
  const read = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), GUEST_STORAGE_KEY);
  console.log('Browser: fresh/stale guest and real inventory consumption');
  const a = await setup();
  await a.page.goto(base + '/');
  await a.page.getByRole('button', { name: 'PLAY', exact: true }).click();
  await a.page.getByRole('button', { name: 'Stage 1', exact: true }).waitFor();
  assert.equal(await a.page.getByRole('button', { name: 'Stage 1', exact: true }).isEnabled(), true);
  assert.equal(await a.page.getByRole('button', { name: 'Stage 2', exact: true }).isEnabled(), false);
  await a.page.goto(base + '/game-map/play-game?level=12');
  await a.page.waitForURL('**/play-game?level=1');
  await a.page.getByRole('button', { name: 'Reshuffle', exact: true }).waitFor();
  await a.page.waitForFunction((key) => JSON.parse(localStorage.getItem(key)).activeAttempt?.status === 'playing', GUEST_STORAGE_KEY);
  assert.deepEqual((await read(a.page)).powers, GUEST_STARTING_POWERS);
  await a.page.getByRole('button', { name: 'Reshuffle', exact: true }).click();
  await a.page.waitForFunction((key) => JSON.parse(localStorage.getItem(key)).powers.extraShuffle === 1, GUEST_STORAGE_KEY);
  const spent = await read(a.page);
  await a.page.reload();
  await a.page.getByRole('button', { name: 'Reshuffle', exact: true }).waitFor();
  assert.equal((await read(a.page)).powers.extraShuffle, 1);
  assert.notEqual((await read(a.page)).activeAttempt.attemptId, spent.activeAttempt.attemptId);
  await a.page.goto(base + '/game-map');
  await a.page.getByRole('button', { name: 'New Run / Reset' }).waitFor();
  a.page.once('dialog', (dialog) => dialog.accept());
  await a.page.getByRole('button', { name: 'New Run / Reset' }).click();
  assert.notEqual((await read(a.page)).runId, spent.runId);
  assert.deepEqual((await read(a.page)).powers, GUEST_STARTING_POWERS);
  assert.deepEqual(a.calls, []);
  assert.deepEqual(a.errors, []);
  await a.context.close();

  const complete = {
    schemaVersion: 1,
    campaignVersion: GUEST_CAMPAIGN_VERSION,
    runId: crypto.randomUUID(),
    completedStages: Array.from({ length: 11 }, (_, i) => i + 1),
    lastPlayedStage: 11,
    powers: { ...GUEST_STARTING_POWERS },
    activeAttempt: null,
  };
  console.log('Browser: completed campaign sandbox');
  const b = await setup({ saved: JSON.stringify(complete) });
  await b.page.goto(base + '/game-map');
  await b.page.getByText('Campaign complete! Optional sandbox 12 is unlocked.').waitFor();
  assert.equal(await b.page.getByRole('button', { name: 'Sandbox 12' }).isEnabled(), true);
  await b.page.getByRole('button', { name: 'Sandbox 12' }).click();
  await b.page.getByRole('button', { name: 'Reshuffle', exact: true }).waitFor();
  assert.equal((await read(b.page)).activeAttempt.stageId, 12);
  assert.deepEqual((await read(b.page)).completedStages, complete.completedStages);
  assert.deepEqual(b.calls, []);
  assert.deepEqual(b.errors, []);
  await b.context.close();

  console.log('Browser: corrupt save');
  const c = await setup({ saved: '{broken' });
  await c.page.goto(base + '/game-map');
  await c.page.getByText('The guest save could not be restored. A fresh run was started.').waitFor();
  assert.equal(await c.page.getByRole('button', { name: 'Stage 1', exact: true }).isEnabled(), true);
  assert.deepEqual(c.calls, []);
  assert.deepEqual(c.errors, []);
  await c.context.close();

  console.log('Browser: blocked storage');
  const d = await setup({ blocked: true });
  await d.page.goto(base + '/game-map');
  await d.page.getByText('Demo · this visit only').waitFor();
  await d.page.getByRole('button', { name: 'Stage 1', exact: true }).click();
  await d.page.getByRole('button', { name: 'Reshuffle', exact: true }).waitFor();
  await d.page.getByRole('button', { name: 'Reshuffle', exact: true }).click();
  await d.page.waitForFunction(() => document.querySelector('[data-footer-btn="extraShuffle"]').textContent.trim() === '1');
  assert.deepEqual(d.calls, []);
  assert.deepEqual(d.errors, []);
  await d.context.close();
  console.log(
    `PASS: ${contexts} backend-blocked browser contexts; stale account isolation, route guards, engine-confirmed inventory use, reload/reset, optional sandbox, corrupt save, blocked storage; zero API calls and page errors.`,
  );
} finally {
  await browser.close();
}
