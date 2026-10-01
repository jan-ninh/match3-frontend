import test from 'node:test';
import assert from 'node:assert/strict';
import { nativePixels, boardPointerDelta } from '../src/features/grid/input/boardCoordinates.ts';
test('scaled board input preserves native distances for drag and targeting', () => {
  assert.equal(nativePixels(30, 480, 240), 60);
  assert.equal(nativePixels(120, 480, 320), 180);
  assert.equal(nativePixels(-20, 480, 320), -30);
  assert.equal(nativePixels(60, 480, 480), 60);
  assert.equal(nativePixels(60, 0, 0), 60);
  const board = { offsetWidth: 480, offsetHeight: 480, getBoundingClientRect: () => ({ width: 320, height: 320 }) };
  assert.deepEqual(boardPointerDelta({ closest: () => board }, 40, 20), { dx: 60, dy: 30 });
  assert.deepEqual(boardPointerDelta(null, 40, 20), { dx: 40, dy: 20 });
});
