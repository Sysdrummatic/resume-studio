import test from 'node:test';
import assert from 'node:assert/strict';

async function postJson(url, body, fetchImpl = fetch) {
  try {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.toLowerCase().includes('application/json');

    if (isJson) {
      const payload = await response.json();
      return {
        ...payload,
        error: response.ok
          ? undefined
          : payload.error || `Request failed (${response.status}). Try again.`,
      };
    }

    return {
      error: `Request failed (${response.status}). Try again.`,
    };
  } catch {
    return {
      error: 'Unable to reach server. Check your connection and try again.',
    };
  }
}
test('postJson returns parsed payload for successful JSON responses', async () => {
  const response = new Response(JSON.stringify({ ok: true, message: 'done' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

  const payload = await postJson('/api/auth/signin', { email: 'x@example.com' }, async () => response);

  assert.deepEqual(payload, { ok: true, message: 'done', error: undefined });
});

test('postJson returns fallback error for non-JSON 500 responses', async () => {
  const response = new Response('', { status: 500 });

  const payload = await postJson('/api/auth/signin', { email: 'x@example.com' }, async () => response);

  assert.equal(payload.error, 'Request failed (500). Try again.');
});

test('postJson returns network error when fetch throws', async () => {
  const payload = await postJson('/api/auth/signin', { email: 'x@example.com' }, async () => {
    throw new Error('network down');
  });

  assert.equal(payload.error, 'Unable to reach server. Check your connection and try again.');
});
