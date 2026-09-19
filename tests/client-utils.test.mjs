import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProxyUrls, normalizeHttpsOrigin, runDeduplicated } from '../client-utils.js';

test('buildProxyUrls never uses a public CORS relay', () => {
  const urls = buildProxyUrls('https://zreso.cn/api/search?q=x', {
    remoteProxy: 'https://movie.edgeone.app',
    customProxy: 'https://worker.example.workers.dev',
  });
  assert.deepEqual(urls, [
    '/api/proxy?url=https%3A%2F%2Fzreso.cn%2Fapi%2Fsearch%3Fq%3Dx',
    'https://movie.edgeone.app/api/proxy?url=https%3A%2F%2Fzreso.cn%2Fapi%2Fsearch%3Fq%3Dx',
    'https://worker.example.workers.dev/?url=https%3A%2F%2Fzreso.cn%2Fapi%2Fsearch%3Fq%3Dx',
    'https://zreso.cn/api/search?q=x',
  ]);
});

test('normalizeHttpsOrigin rejects non-HTTPS proxy URLs', () => {
  assert.throws(() => normalizeHttpsOrigin('http://proxy.example'), /HTTPS/);
  assert.equal(normalizeHttpsOrigin('https://proxy.example/a/'), 'https://proxy.example');
});

test('runDeduplicated removes a rejected request so it can retry', async () => {
  const inflight = new Map();
  await assert.rejects(runDeduplicated(inflight, 'a', () => Promise.reject(new Error('first'))));
  assert.equal(await runDeduplicated(inflight, 'a', () => Promise.resolve('second')), 'second');
});
