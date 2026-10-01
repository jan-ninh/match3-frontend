import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequester, RequestError } from '../src/api/transport.ts';
import { OutcomeStore, persistenceFailure } from '../src/services/account/outcomeStore.ts';
const fast = { deadlineMs: 30, readBudgetMs: 65, retryDelayMs: 10 };
const never = () => new Promise(() => {});
const json = (x) => new Response(JSON.stringify(x));
test('never-resolving fetch times out, aborts, and mutations send only once', async () => {
  let count = 0,
    signal;
  const request = createRequester('', {
    ...fast,
    fetch: (_url, opts) => {
      count++;
      signal = opts.signal;
      return never();
    },
  });
  await assert.rejects(request('/mutation', { method: 'POST' }), (e) => e.kind === 'timeout');
  assert.equal(count, 1);
  assert.equal(signal.aborted, true);
});
test('body consumption is inside the deadline', async () => {
  const request = createRequester('', { ...fast, fetch: async () => ({ ok: true, arrayBuffer: never }) });
  await assert.rejects(request('/body', { retryRead: false }), (e) => e.kind === 'timeout');
});
test('read retries once, with a bounded total budget including delay', async () => {
  let count = 0;
  const start = performance.now();
  const request = createRequester('', {
    ...fast,
    fetch: () => {
      count++;
      return never();
    },
  });
  await assert.rejects(request('/profile'), (e) => e.kind === 'timeout');
  assert.equal(count, 2);
  assert.ok(performance.now() - start < 140);
});
test('transient read can recover on its only retry; 403 never implies session expiry', async () => {
  let count = 0;
  const request = createRequester('', { ...fast, fetch: async () => (++count === 1 ? new Response('{}', { status: 503 }) : json({ ok: true })) });
  assert.deepEqual(await request('/status'), { ok: true });
  assert.equal(count, 2);
  const forbidden = createRequester('', {
    ...fast,
    fetch: async () => {
      count++;
      return new Response('{}', { status: 403 });
    },
  });
  await assert.rejects(forbidden('/private'), (e) => e.kind === 'forbidden');
  assert.equal(count, 3);
});
test('caller cancellation stops obsolete fetches and pending read retry', async () => {
  for (const fetch of [
    never,
    async () => {
      throw Error('network');
    },
  ]) {
    let count = 0;
    const controller = new AbortController();
    const request = createRequester('', {
      ...fast,
      fetch: () => {
        count++;
        return fetch();
      },
    });
    const pending = request('/profile', { signal: controller.signal });
    setTimeout(() => controller.abort(), 3);
    await assert.rejects(pending, (e) => e.kind === 'cancelled');
    assert.equal(count, 1);
  }
});
test('classification covers HTTP, protocol and configuration failures without response secrets', async () => {
  for (const [status, kind] of [
    [401, 'unauthenticated'],
    [403, 'forbidden'],
    [409, 'conflict'],
    [400, 'validation'],
    [500, 'server'],
  ]) {
    const request = createRequester('', { ...fast, fetch: async () => new Response('secret', { status }) });
    await assert.rejects(request('/test', { method: 'POST' }), (e) => e.kind === kind && !e.message.includes('secret'));
  }
  await assert.rejects(createRequester('', { fetch: async () => new Response('<html>') })('/bad', { retryRead: false }), (e) => e.kind === 'protocol');
  await assert.rejects(createRequester('file:///bad')('/bad'), (e) => e.kind === 'configuration');
});
test('WIN/LOSS presentation is synchronous and independent of persistence', async () => {
  for (const result of ['WIN', 'LOSS']) {
    const store = new OutcomeStore();
    let presented = false,
      reject;
    const pending = new Promise((_resolve, r) => {
      reject = r;
    });
    const input = {
      ownerId: 'account',
      id: result,
      stage: 1,
      write: () => pending,
      present: () => {
        presented = true;
      },
    };
    store.start(input);
    assert.equal(presented, true);
    assert.equal(store.getSnapshot().status, 'saving');
    store.start(input);
    reject(new RequestError('timeout'));
    await Promise.resolve();
    assert.equal(store.getSnapshot().status, 'unconfirmed');
    assert.equal(store.getSnapshot().result, undefined);
    assert.equal(store.blocked('account'), true);
  }
  assert.equal(persistenceFailure(new RequestError('forbidden')), 'not-accepted');
});
test('authoritative saved status only follows acknowledgement; rewards have no replay fallback', async () => {
  const store = new OutcomeStore();
  let calls = 0;
  store.start({ ownerId: 'a', id: 'win', stage: 1, present: () => {}, write: async () => ({ playerLevel: 2, playerExp: 0 }) });
  await Promise.resolve();
  assert.equal(store.getSnapshot().status, 'saved');
  const write = async () => {
    calls++;
    throw new RequestError('unavailable');
  };
  store.claimReward('win', write);
  store.claimReward('win', write);
  await Promise.resolve();
  assert.equal(calls, 1);
  assert.equal(store.getSnapshot().status, 'unconfirmed');
});
