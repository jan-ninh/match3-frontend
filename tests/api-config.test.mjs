import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apiBase } from '../src/api/apiBase.ts';
test('API origin normalizes trailing slashes; same-origin proxy requires explicit /', () => {
  assert.equal(apiBase(' https://api.example/// ', true), 'https://api.example');
  assert.equal(apiBase('http://127.0.0.1:3011/', true), 'http://127.0.0.1:3011');
  assert.equal(apiBase('/', true), '');
});
test('missing/malformed/credential-bearing API settings reject without echoing input; production remote HTTP rejected', () => {
  for (const value of [
    undefined,
    '',
    '  ',
    '//example',
    '/api',
    'https://api.example/api',
    'https://user:sentinel-password@api.example',
    'https://api.example?secret=sentinel',
    'https://api.example/#secret',
    'ftp://api.example',
    'http://remote.example',
  ]) {
    assert.throws(
      () => apiBase(value, true),
      (e) => /VITE_API_URL/.test(e.message) && !e.message.includes('sentinel'),
    );
  }
  assert.equal(apiBase('http://local-dev.example'), 'http://local-dev.example');
});
