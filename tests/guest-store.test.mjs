import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GuestStore,
  GUEST_STORAGE_KEY,
  GUEST_STARTING_POWERS,
  guestStageAccess,
  resolveGuestStage,
  parseGuestSave,
  canonicalGuestPower,
} from '../src/services/guest/guestStore.ts';

function fixture() {
  const data = new Map([
    ['match3-progress', '{"completedLevels":[1,2,3]}'],
    ['user', '{"id":"stale"}'],
  ]);
  const storage = { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) };
  return { data, storage, store: new GuestStore(() => storage) };
}
const current = (store) => store.getSnapshot().save;
const start = (store, n) => store.enter(n, crypto.randomUUID()).binding;

test('fresh isolated save starts at stage 1 without importing or deleting legacy keys', () => {
  const { store, data } = fixture();
  assert.deepEqual(guestStageAccess(current(store)).playableStages, [1]);
  assert.deepEqual(current(store).powers, GUEST_STARTING_POWERS);
  assert.equal(data.size, 3);
  assert.equal(data.get('user'), '{"id":"stale"}');
  assert.deepEqual(current(store).completedStages, []);
});

test('only sequential wins unlock campaign stages, then optional sandbox', () => {
  const { store } = fixture();
  for (let n = 1; n <= 11; n++) {
    assert.throws(() => start(store, n + 1), /locked/);
    const binding = start(store, n);
    assert.equal(store.finish(binding, 'WIN'), true);
    assert.equal(store.finish(binding, 'WIN'), false);
    assert.equal(store.finish(binding, 'LOSS'), false);
    assert.equal(guestStageAccess(current(store)).frontier, n + 1);
    assert.equal(guestStageAccess(current(store)).campaignComplete, n === 11);
  }
  assert.equal(guestStageAccess(current(store)).sandboxUnlocked, true);
  const sandbox = start(store, 12);
  assert.equal(store.finish(sandbox, 'WIN'), false);
  store.leave();
  assert.equal(guestStageAccess(current(store)).campaignComplete, true);
  assert.equal(current(store).completedStages.length, 11);
});

test('map and direct URLs use the same access selector', () => {
  const { store } = fixture();
  for (let n = 1; n <= 12; n++) {
    const save = current(store);
    for (let url = 1; url <= 12; url++) {
      const resolved = resolveGuestStage(save, url);
      assert.ok(guestStageAccess(save).playableStages.includes(resolved));
      assert.equal(resolved, n);
    }
    if (n <= 11) store.finish(start(store, n), 'WIN');
  }
});

test('LOSS keeps run/frontier/completion and spent inventory; duplicate events have no effect', () => {
  const { store } = fixture();
  store.finish(start(store, 1), 'WIN');
  const runId = current(store).runId;
  const a = start(store, 2);
  assert.equal(canonicalGuestPower('gridlaser'), 'bomb');
  assert.equal(store.consume(a, 'bomb', 1, 100), true);
  assert.equal(store.consume(a, 'bomb', 1, 100), false);
  const powers = current(store).powers;
  assert.equal(store.finish(a, 'LOSS'), true);
  assert.equal(store.finish(a, 'LOSS'), false);
  assert.equal(store.finish(a, 'WIN'), false);
  assert.equal(store.consume(a, 'laser', 1, 101), false);
  assert.deepEqual(current(store).powers, powers);
  assert.equal(current(store).runId, runId);
  assert.deepEqual(current(store).completedStages, [1]);
  assert.equal(guestStageAccess(current(store)).frontier, 2);
  const retry = start(store, 2);
  assert.notEqual(retry.attemptId, a.attemptId);
  assert.equal(store.finish(a, 'LOSS'), false);
  assert.equal(store.consume(a, 'laser', 1, 102), false);
  assert.deepEqual(current(store).powers, powers);
});

test('quit and refresh retain progress/inventory but never restore a board or infer loss', () => {
  const { store, storage } = fixture();
  store.finish(start(store, 1), 'WIN');
  const a = start(store, 2);
  store.consume(a, 'extraShuffle', 1, 1);
  const restored = new GuestStore(() => storage);
  assert.equal(current(restored).activeAttempt.status, 'left');
  assert.deepEqual(current(restored).completedStages, [1]);
  assert.equal(current(restored).powers.extraShuffle, GUEST_STARTING_POWERS.extraShuffle - 1);
  restored.leave();
  assert.equal(guestStageAccess(current(restored)).frontier, 2);
  assert.ok(!JSON.stringify(current(restored)).includes('board'));
});

test('explicit reset creates a fresh run and rejects stale callbacks', () => {
  const { store } = fixture();
  const a = start(store, 1);
  store.consume(a, 'bomb', 1, 1);
  store.finish(a, 'WIN');
  store.reset();
  assert.notEqual(current(store).runId, a.runId);
  assert.deepEqual(current(store).powers, GUEST_STARTING_POWERS);
  assert.equal(guestStageAccess(current(store)).frontier, 1);
  assert.equal(store.finish(a, 'WIN'), false);
});

test('invalid/unsupported saves recover without deleting unrelated storage', () => {
  for (const bad of ['', '{', 'null', '{}', JSON.stringify({ schemaVersion: 2 })]) {
    const { storage, data } = fixture();
    data.set(GUEST_STORAGE_KEY, bad);
    const store = new GuestStore(() => storage);
    assert.equal(store.getSnapshot().recovered, true);
    assert.equal(guestStageAccess(current(store)).frontier, 1);
    assert.ok(data.has('match3-progress'));
  }
  const valid = current(fixture().store);
  for (const bad of [
    { ...valid, completedStages: [2] },
    { ...valid, completedStages: [1, 1] },
    { ...valid, completedStages: Array.from({ length: 12 }, (_, i) => i + 1) },
    { ...valid, powers: { ...valid.powers, bomb: -1 } },
    { ...valid, campaignVersion: 'different-order' },
  ]) {
    assert.equal(parseGuestSave(JSON.stringify(bad)), null);
  }
});

test('read, write and storage-property failures allow in-memory progression', () => {
  const ports = [
    () => {
      throw Error('blocked property');
    },
    () => ({
      getItem() {
        throw Error('read');
      },
      setItem() {},
    }),
    () => ({
      getItem() {
        return null;
      },
      setItem() {
        throw Error('quota');
      },
    }),
  ];
  for (const port of ports) {
    const store = new GuestStore(port);
    assert.equal(store.getSnapshot().persistence, 'visit');
    store.finish(start(store, 1), 'WIN');
    assert.equal(guestStageAccess(current(store)).frontier, 2);
  }
});

test('StrictMode detach/reattach keeps one attempt; real navigation marks left', async () => {
  const { store } = fixture();
  const first = store.enter(1, 'route');
  store.release(first.lease);
  const second = store.enter(1, 'route');
  await Promise.resolve();
  assert.equal(first.binding.attemptId, second.binding.attemptId);
  assert.equal(current(store).activeAttempt.status, 'playing');
  store.release(second.lease);
  await Promise.resolve();
  assert.equal(current(store).activeAttempt.status, 'left');
  assert.equal(guestStageAccess(current(store)).frontier, 1);
});

test('idle tabs adopt a new run; live attempts refuse stale writes after another-tab reset', () => {
  const { store, storage, data } = fixture();
  const old = start(store, 1);
  const other = new GuestStore(() => storage);
  other.reset();
  const newer = data.get(GUEST_STORAGE_KEY);
  assert.equal(store.finish(old, 'WIN'), false);
  assert.equal(store.consume(old, 'bomb', 1, 9), false);
  assert.equal(store.getSnapshot().conflict, true);
  store.leave();
  store.reset();
  assert.equal(data.get(GUEST_STORAGE_KEY), newer);
  const idle = new GuestStore(() => storage);
  other.reset();
  idle.syncExternal(data.get(GUEST_STORAGE_KEY));
  assert.equal(current(idle).runId, current(other).runId);
  assert.equal(idle.getSnapshot().conflict, false);
});
