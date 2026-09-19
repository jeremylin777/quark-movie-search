import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../functions/api/proxy.js';

function request(method, target) {
  return {
    method,
    url: `https://movie.edgeone.app/api/proxy?url=${encodeURIComponent(target)}`,
    headers: new Headers(),
  };
}

async function withFetchStub(task) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('unexpected upstream call');
  try {
    return await task();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function withFetchHandler(handler, task) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = handler;
  try {
    return await task();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test('rejects methods other than GET and HEAD', async () => {
  await withFetchStub(async () => {
    const response = await onRequest({ request: request('POST', 'https://zreso.cn/api/search') });
    assert.equal(response.status, 405);
  });
});

test('rejects HTTP and unlisted hosts before fetching', async () => {
  await withFetchStub(async () => {
    assert.equal((await onRequest({ request: request('GET', 'http://zreso.cn/api/search') })).status, 400);
    assert.equal((await onRequest({ request: request('GET', 'https://example.com/') })).status, 403);
  });
});

test('does not follow an allowlisted host redirect', async () => {
  let init;
  await withFetchHandler(async (_url, requestInit) => {
    init = requestInit;
    return new Response(null, { status: 302, headers: { Location: 'https://example.com/' } });
  }, async () => {
    const response = await onRequest({ request: request('GET', 'https://zreso.cn/api/search') });
    assert.equal(response.status, 502);
  });
  assert.equal(init.redirect, 'manual');
});
