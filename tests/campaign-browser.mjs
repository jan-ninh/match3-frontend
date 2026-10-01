import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { GUEST_STORAGE_KEY } from '../src/services/guest/guestStore.ts';
import { ACCOUNT_JOURNAL_KEY } from '../src/services/account/gameplayStore.ts';
const { chromium } = createRequire(import.meta.url)(process.env.MATCH3_PLAYWRIGHT_PACKAGE || 'playwright');
const base = process.env.MATCH3_DEV_URL || 'http://127.0.0.1:5173';
const backend = spawn(process.execPath, ['--conditions', 'development', 'tests/local-auth-server.mjs'], {
  cwd: process.cwd(),
  windowsHide: true,
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, MATCH3_TEST_NEAR_FINAL: '1' },
});
let output = '',
  diagnostics = '',
  browser;
backend.stdout.on('data', (b) => (output += b));
backend.stderr.on('data', (b) => (diagnostics += b));
const poll = async (fn, ms = 10000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await fn()) return;
    await new Promise((r) => setTimeout(r, 25));
  }
  throw Error('Browser state timeout');
};
const until = async (fn, ms = 30000) => {
  const end = Date.now() + ms;
  while (!fn() && Date.now() < end) await new Promise((r) => setTimeout(r, 25));
  assert.ok(fn(), 'Test process timeout: ' + output.slice(-200) + ' ' + diagnostics.slice(-1200));
};
try {
  await until(() => output.includes('TEST_BACKEND_READY') || backend.exitCode !== null);
  assert.ok(output.includes('TEST_BACKEND_READY'), diagnostics.slice(-1200));
  browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const context = await browser.newContext();
  await context.route('**/*', (route) => {
    const u = new URL(route.request().url());
    return [new URL(base).origin, 'http://127.0.0.1:3011'].includes(u.origin) ? route.continue() : route.abort();
  });
  const page = await context.newPage();
  const errors = [],
    calls = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => {
    if (new URL(r.url()).pathname.startsWith('/api/')) calls.push({ path: new URL(r.url()).pathname, body: r.postData() });
  });
  const snapshot = () =>
    page.evaluate(async () => {
      const { accountSession } = await import('/src/api/http.ts');
      return accountSession.getSnapshot().profile;
    });
  const guest = () => page.evaluate((key) => localStorage.getItem(key), GUEST_STORAGE_KEY);
  const terminalIDs = () => new Set(calls.filter((c) => c.path.endsWith('/terminal')).map((c) => JSON.parse(c.body).operationId));
  const journal = () => page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{"entries":[]}'), ACCOUNT_JOURNAL_KEY);
  const login = async (email) => {
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await page.getByPlaceholder('Email', { exact: true }).fill(email);
    await page.getByPlaceholder('Password', { exact: true }).fill('Test123!');
    const ack = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/auth/login' && r.status() === 200);
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await ack;
  };
  const start = async (stage) => {
    await page.getByRole('button', { name: 'Stage ' + stage, exact: true }).click();
    await page.locator('[data-piece-id]').first().waitFor();
  };
  const win = async () => {
    await page.evaluate(() => document.activeElement?.blur());
    await page.keyboard.press('d');
    const time = Date.now();
    await page.getByRole('button', { name: 'Win (unlock next)', exact: true }).click();
    await page.getByText('You Won!', { exact: true }).waitFor({ timeout: 3000 });
    assert.ok(Date.now() - time < 3000);
  };
  const map = async () => {
    await page
      .getByRole('button', { name: /Return to map/i })
      .last()
      .click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
  };
  await page.goto(base + '/game-map');
  await page.getByRole('button', { name: 'Stage 1', exact: true }).waitFor();
  const guestInitial = await guest();
  assert.equal(calls.length, 0);
  await login('browser@example.test');
  assert.equal((await snapshot()).frontier, 11);
  let loseAck = true;
  await page.route('**/api/game/attempts/terminal', async (route) => {
    if (!loseAck) return route.continue();
    const response = await route.fetch();
    if (response.status() !== 200) return route.fulfill({ response });
    loseAck = false;
    await new Promise((r) => setTimeout(r, 11000));
    try {
      await route.fulfill({ response });
    } catch {}
  });
  await start(11);
  const runId = (await snapshot()).runId;
  await win();
  await page.getByText('Save unconfirmed', { exact: true }).first().waitFor({ timeout: 10000 });
  const uncertain = await page.evaluate(async () => {
    const { accountGameplay } = await import('/src/api/accountGameplay.ts');
    const { accountSession } = await import('/src/api/http.ts');
    const a = accountSession.getSnapshot();
    return { campaign: accountGameplay.getSnapshot().data?.campaign, mode: a.mode, session: a.session, error: a.error?.kind };
  });
  assert.equal(uncertain.campaign?.status, 'ACTIVE', JSON.stringify(uncertain));
  const pending = (await journal()).entries[0].pending;
  await map();
  await page.reload();
  await page.getByRole('button', { name: 'Sandbox 12', exact: true }).waitFor();
  assert.equal(await guest(), guestInitial);
  await poll(async () => (await snapshot())?.campaign?.status === 'COMPLETED');
  await poll(async () => (await journal()).entries.length === 0);
  const completed = await snapshot(),
    result = completed.campaign.result;
  assert.equal(result.runId, runId);
  assert.equal(result.score, 8800);
  assert.equal((await journal()).entries.length, 0);
  await page
    .getByText(/Campaign complete.*finalized score 8800/)
    .first()
    .waitFor();
  const replay = await page.evaluate(async (body) => {
    const { accountSession } = await import('/src/api/http.ts');
    return accountSession.request('/api/game/attempts/terminal', { method: 'POST', body: JSON.stringify(body), retryRead: false });
  }, pending.body);
  assert.deepEqual(replay.receipt.resultSnapshot.campaign.result, result);
  const board = async () => {
    await page.getByRole('link', { name: 'Leaderboard', exact: true }).click();
    await page.getByText('Your best completed campaign · rank 2', { exact: true }).waitFor();
    assert.ok(await page.getByText('BrowserOther', { exact: true }).count());
    return page.evaluate(async () => (await fetch('http://127.0.0.1:3011/api/leaderboard/top')).json());
  };
  const firstBoard = await board();
  assert.equal(firstBoard.entries.length, 2);
  assert.equal(firstBoard.entries[1].accountId, completed.id);
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByRole('button', { name: 'Sandbox 12', exact: true }).click();
  await page.locator('[data-piece-id]').first().waitFor();
  await page.getByText(/Optional sandbox.*finalized campaign score stays unchanged/).waitFor();
  await win();
  await page.getByText('Saved to account', { exact: true }).first().waitFor();
  await poll(async () => !(await snapshot())?.activeAttempt);
  assert.deepEqual((await snapshot()).campaign.result, result);
  assert.equal((await snapshot()).totalScore, 9600);
  await map();
  assert.deepEqual(await board(), firstBoard);
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'New account campaign', exact: true }).click();
  await poll(async () => (await snapshot())?.frontier === 1);
  assert.notEqual((await snapshot()).runId, runId);
  assert.deepEqual(await board(), firstBoard);
  await page.getByRole('button', { name: 'Logout', exact: true }).click();
  await login('other@example.test');
  await page.getByRole('link', { name: 'Leaderboard', exact: true }).click();
  await page.getByText('Your best completed campaign · rank 1', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Logout', exact: true }).click();
  await page.getByRole('button', { name: 'Stage 1', exact: true }).waitFor();
  assert.equal(await guest(), guestInitial);
  await page.route('**/api/**', (route) => route.abort());
  await page.getByRole('button', { name: 'Account', exact: true }).click();
  await page.getByText('Account unavailable', { exact: true }).waitFor({ timeout: 12000 });
  await page.getByRole('button', { name: 'Play Demo', exact: true }).first().click();
  const before = calls.length;
  await start(1);
  await page.getByRole('button', { name: 'Reshuffle', exact: true }).waitFor();
  assert.equal(calls.length, before);
  assert.equal(
    calls.some((c) => c.path.includes('/campaign/start') || c.path.includes('/campaign/end') || c.path.includes('/campaign/abort')),
    false,
  );
  assert.deepEqual(errors, []);
  console.log(
    'PASS: isolated near-final fixtures via accepted commands; immediate stage-11 WIN, lost acknowledgement, reload/receipt finalization, immutable replay, own ranks 1/2, sandbox score isolation, explicit new campaign preserves best, Guest save isolation, backend unavailable Demo play, no telemetry writes.',
  );
  await context.close();
} finally {
  await browser?.close();
  backend.stdin.write('stop\n');
  await until(() => backend.exitCode !== null, 10000).catch(() => backend.kill());
}
