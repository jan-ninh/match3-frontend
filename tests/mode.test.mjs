import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ModeStore, readLegacyHint } from '../src/services/account/modeStore.ts';
import { RequestError, createRequester } from '../src/api/transport.ts';
import { GuestStore } from '../src/services/guest/guestStore.ts';
const identity = { id: 'a', username: 'Account A' };
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};
test('stale saved-user hint is separate from immediate Demo and requires explicit entry', () => {
  const hint = readLegacyHint(() => ({ getItem: () => JSON.stringify(identity) }));
  const store = new ModeStore();
  assert.equal(hint.id, 'a');
  assert.equal(store.getSnapshot().mode, 'demo');
  assert.equal(store.getSnapshot().selected, null);
  store.beginAccount(hint);
  assert.equal(store.getSnapshot().mode, 'legacy-account');
  assert.equal(store.getSnapshot().availability, 'checking');
});
test('bounded account timeout becomes unavailable without fabricated profile or progress', async () => {
  const store = new ModeStore();
  store.beginAccount(identity);
  const request = createRequester('', { deadlineMs: 10, readBudgetMs: 25, retryDelayMs: 3, fetch: () => new Promise(() => {}) });
  await store.refresh((_id, signal) => request('/profile', { signal }));
  assert.equal(store.getSnapshot().availability, 'unavailable');
  assert.equal(store.getSnapshot().profile, null);
  assert.equal(store.getSnapshot().error.kind, 'timeout');
});
test('late response after explicit Demo cannot switch mode or alter guest data', async () => {
  const guest = new GuestStore();
  const saved = JSON.stringify(guest.getSnapshot().save);
  const store = new ModeStore();
  const generation = store.beginAccount(identity);
  const pending = deferred();
  let signal;
  const read = store.refresh((_id, s) => {
    signal = s;
    return pending.promise;
  });
  store.playDemo();
  assert.equal(signal.aborted, true);
  pending.resolve({ powers: { bomb: 999 }, progress: { stage11: { completed: true } } });
  await read;
  assert.equal(store.getSnapshot().mode, 'demo');
  assert.equal(store.getSnapshot().profile, null);
  assert.equal(store.isCurrent(generation, 'a'), false);
  assert.equal(JSON.stringify(guest.getSnapshot().save), saved);
});
test('previous account responses and obsolete credential intents cannot overwrite new account', async () => {
  const store = new ModeStore();
  const old = store.beginAccount(identity),
    pending = deferred();
  const read = store.refresh(() => pending.promise);
  store.beginAccount({ id: 'b', username: 'B' });
  await store.refresh(async () => ({ owner: 'b', powers: { bomb: 2 } }));
  pending.resolve({ owner: 'a' });
  await read;
  assert.equal(store.getSnapshot().profile.owner, 'b');
  assert.equal(store.setIdentity(old, identity), false);
});
test('reconnect and route observation do not change mode; retry is explicit and rejection distinct', async () => {
  const store = new ModeStore();
  store.beginAccount(identity);
  await store.refresh(async () => {
    throw new RequestError('forbidden', 403);
  });
  assert.equal(store.getSnapshot().availability, 'rejected');
  assert.equal(store.getSnapshot().error.kind, 'forbidden');
  const generation = store.getSnapshot().generation;
  await store.refresh(async () => ({ ok: true }));
  assert.equal(store.getSnapshot().generation, generation);
  store.playDemo();
  let reads = 0;
  await store.refresh(async () => {
    reads++;
    return {};
  });
  assert.equal(reads, 0);
  assert.equal(store.getSnapshot().mode, 'demo');
});
test('storage-blocked or invalid hints cannot prevent Demo and generations isolate account exit', () => {
  assert.equal(
    readLegacyHint(() => {
      throw Error('blocked');
    }),
    null,
  );
  assert.equal(
    readLegacyHint(() => ({ getItem: () => '{broken' })),
    null,
  );
  const store = new ModeStore();
  const first = store.beginAccount(identity);
  store.playDemo();
  const next = store.beginAccount(identity);
  assert.notEqual(first, next);
  assert.equal(store.isCurrent(first, 'a'), false);
  assert.equal(store.isCurrent(next, 'a'), true);
});
