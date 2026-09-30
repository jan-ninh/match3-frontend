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
  await start(1);
  const first = await snapshot();
  assert.equal(first.activeAttempt.stageNumber, 1);
  assert.equal(first.powers.extraShuffle, 120);
  await page.getByRole('button', { name: 'Reshuffle', exact: true }).click();
  await poll(() =>
    page.evaluate(async () => {
      const { accountGameplay } = await import('/src/api/accountGameplay.ts');
      return accountGameplay.getSnapshot().powers.extraShuffle === 119;
    }),
  );
  await win();
  await page.getByText('Saved to account', { exact: true }).waitFor();
  let state = await snapshot();
  assert.equal(state.totalScore, 800);
  assert.equal(state.playerLevel, 5);
  assert.equal(state.playerExp, 500);
  assert.equal(state.powers.extraShuffle, 119);
  assert.equal(state.frontier, 2);
  assert.equal(state.pendingRewards.length, 1);
  await map();
  // Fixed server-earned reward is its own receipt-backed command.
  await page.getByRole('button', { name: 'Choose earned reward', exact: true }).click();
  await page.getByRole('button', { name: 'choose gridlaser', exact: true }).click();
  await poll(async () => {
    const s = await snapshot();
    return s?.pendingRewards.length === 0 && s?.revision === 3;
  });
  state = await snapshot();
  assert.equal(state.powers.bomb, 122);
  // Backend commits normally, but the browser never receives the acknowledgement before its deadline.
  let loseAck = false;
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
  await start(2);
  loseAck = true;
  await win();
  await page.getByText('Save unconfirmed', { exact: true }).first().waitFor({ timeout: 10000 });
  const pending = (await journal()).entries[0].pending;
  assert.equal(pending.body.outcome, 'WIN');
  assert.equal(terminalIDs().size, 2);
  await map();
  const guestBeforeRestore = await guest();
  await page.reload();
  await page.getByRole('button', { name: 'Stage 1', exact: true }).waitFor();
  assert.equal(await guest(), guestBeforeRestore);
  await page.getByRole('button', { name: 'Account', exact: true }).click();
  await page.getByText('Saved to account', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Stage 3', exact: true }).waitFor();
  state = await snapshot();
  assert.equal(state.totalScore, 1600);
  assert.equal(state.playerExp, 1500);
  assert.equal(state.powers.extraShuffle, 119);
  assert.equal(state.powers.bomb, 122);
  assert.equal((await journal()).entries.length, 0);
  assert.equal(await guest(), guestInitial);
  assert.equal(terminalIDs().size, 2);
  // A deliberate identical command replay is recognized by the durable receipt; it cannot farm effects.
  const replay = await page.evaluate(async (body) => {
    const { accountSession } = await import('/src/api/http.ts');
    return accountSession.request('/api/game/attempts/terminal', { method: 'POST', body: JSON.stringify(body), retryRead: false });
  }, pending.body);
  assert.equal(replay.snapshot.totalScore, 1600);
  assert.equal(replay.snapshot.playerExp, 1500);
  // A second unresolved outcome stays with account A while Demo and another account remain usable.
  await start(3);
  loseAck = true;
  await win();
  await page.getByText('Save unconfirmed', { exact: true }).first().waitFor({ timeout: 10000 });
  await map();
  const ownerPending = (await journal()).entries[0].pending;
  await page.getByRole('button', { name: 'Play Demo', exact: true }).first().click();
  await page.getByRole('button', { name: 'Stage 1', exact: true }).waitFor();
  assert.equal(await guest(), guestInitial);
  const lookupCount = calls.filter((c) => c.path.includes('/operations/')).length;
  await login('other@example.test');
  await page.getByRole('button', { name: 'Stage 1', exact: true }).waitFor();
  const other = await snapshot();
  assert.notEqual(other.id, ownerPending.ownerId);
  assert.equal(other.totalScore, 0);
  assert.equal(calls.filter((c) => c.path.includes('/operations/')).length, lookupCount);
  assert.equal((await journal()).entries[0].pending.ownerId, ownerPending.ownerId);
  const denied = await page.evaluate(async (op) => {
    const { accountSession } = await import('/src/api/http.ts');
    try {
      await accountSession.request('/api/game/operations/' + op);
      return 'accepted';
    } catch (e) {
      return e.status;
    }
  }, ownerPending.body.operationId);
  assert.equal(denied, 404);
  await page.getByRole('button', { name: 'Logout', exact: true }).click();
  await page.getByRole('button', { name: 'Account', exact: true }).waitFor();
  await login('browser@example.test');
  await page.getByRole('button', { name: 'Stage 4', exact: true }).waitFor();
  assert.equal((await snapshot()).totalScore, 2400);
  assert.equal((await journal()).entries.length, 0);
  assert.equal(await guest(), guestInitial);
  assert.equal(
    calls.some((c) => c.path.includes('/campaign') || c.path.includes('/completeStage/') || c.path.includes('/powers')),
    false,
  );
  assert.deepEqual(errors, []);
  console.log(
    'PASS: isolated replica-set backend; login, acknowledged start, engine ACK inventory, immediate WIN, saved score/EXP/reward, lost response, reload receipt recovery, identical replay, Demo and foreign owner isolation, Guest save unchanged.',
  );
  await context.close();
} finally {
  await browser?.close();
  backend.stdin.write('stop\n');
  await until(() => backend.exitCode !== null, 10000).catch(() => backend.kill());
}
