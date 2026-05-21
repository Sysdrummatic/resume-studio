import test from 'node:test';
import assert from 'node:assert/strict';
import { postJson } from '../app/lib/client-http.ts';
test('postJson returns parsed data for 200 JSON', async () => {
  const response = new Response(JSON.stringify({ ok: true, message: 'done' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

  const payload = await postJson('/api/auth/signin', { email: 'x@example.com' }, async () => response);

  assert.deepEqual(payload, { ok: true, message: 'done', error: undefined });
});

test('postJson returns fallback for non-JSON 500', async () => {
  const response = new Response('', { status: 500 });

  const payload = await postJson('/api/auth/signin', { email: 'x@example.com' }, async () => response);

  assert.equal(payload.error, 'Request failed (500). Try again.');
});

test('postJson returns controlled error when request throws', async () => {
  const payload = await postJson('/api/auth/signin', { email: 'x@example.com' }, async () => {
    throw new Error('network down');
  });

  assert.equal(payload.error, 'Unable to reach server. Check your connection and try again.');
});
