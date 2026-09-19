# EdgeOne 国内直连代理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** 让同一代码库部署到 EdgeOne Pages 后成为国内免 VPN 的搜索入口，同时保留 GitHub Pages 与已配置远程 EdgeOne 代理的兼容性。

**Architecture:** 新增浏览器端 ES 模块，负责代理 URL 顺序、HTTPS 设置校验和可重试的 in-flight 请求管理；index.html 以模块方式使用它。两个代理均限制 HTTPS、GET/HEAD 和精确白名单，页面移除公共 CORS 中继。

**Tech Stack:** 原生浏览器 JavaScript、EdgeOne Pages Functions、Cloudflare Worker、Node.js 内置 node:test、Python Playwright。

---

### Task 1: 建立可执行测试并锁定客户端行为

**Files:**
- Create: package.json
- Create: tests/client-utils.test.mjs
- Create: client-utils.js

- [ ] **Step 1: 编写失败测试**

Create tests/client-utils.test.mjs:

~~~js
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
~~~

- [ ] **Step 2: 验证 RED**

Run: npm test -- tests/client-utils.test.mjs

Expected: ERR_MODULE_NOT_FOUND for client-utils.js.

- [ ] **Step 3: 实现最小模块**

Create package.json with type module and test script node --test. Create client-utils.js:

~~~js
export function normalizeHttpsOrigin(value, label = '地址') {
  const text = String(value || '').trim();
  if (!text) return '';
  let url;
  try { url = new URL(text); } catch { throw new Error(label + '不是有效 URL'); }
  if (url.protocol !== 'https:') throw new Error(label + '必须使用 HTTPS');
  return url.origin;
}

export function buildProxyUrls(target, { remoteProxy = '', customProxy = '' } = {}) {
  const encoded = encodeURIComponent(target);
  return [
    '/api/proxy?url=' + encoded,
    ...(remoteProxy ? [remoteProxy + '/api/proxy?url=' + encoded] : []),
    ...(customProxy ? [customProxy + '/?url=' + encoded] : []),
    target,
  ];
}

export function runDeduplicated(inflight, key, task) {
  if (inflight.has(key)) return inflight.get(key);
  const promise = Promise.resolve().then(task);
  inflight.set(key, promise);
  return promise.finally(() => inflight.delete(key));
}
~~~

- [ ] **Step 4: 验证 GREEN**

Run: npm test -- tests/client-utils.test.mjs

Expected: 3 passing tests.

- [ ] **Step 5: Commit**

Run:
~~~bash
git add package.json client-utils.js tests/client-utils.test.mjs
git commit -m "test: cover domestic proxy client behavior"
~~~

### Task 2: 加固 EdgeOne 代理策略

**Files:**
- Modify: functions/api/proxy.js:18-92
- Modify: worker.js:21-89
- Create: tests/edgeone-proxy.test.mjs

- [ ] **Step 1: 编写失败测试**

Create tests/edgeone-proxy.test.mjs:

~~~js
import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../functions/api/proxy.js';

function request(method, target) {
  return {
    method,
    url: 'https://movie.edgeone.app/api/proxy?url=' + encodeURIComponent(target),
    headers: new Headers(),
  };
}

test('rejects methods other than GET and HEAD', async () => {
  const response = await onRequest({ request: request('POST', 'https://zreso.cn/api/search') });
  assert.equal(response.status, 405);
});

test('rejects HTTP and unlisted hosts before fetching', async () => {
  assert.equal((await onRequest({ request: request('GET', 'http://zreso.cn/api/search') })).status, 400);
  assert.equal((await onRequest({ request: request('GET', 'https://example.com/') })).status, 403);
});
~~~

- [ ] **Step 2: 验证 RED**

Run: npm test -- tests/edgeone-proxy.test.mjs

Expected: POST currently reaches fetch instead of 405, and HTTP is not rejected before fetch.

- [ ] **Step 3: 最小代理限制**

Keep OPTIONS handling. For all other requests return 405 unless method is GET or HEAD. After parsing the target URL return 400 unless protocol equals https:. Preserve exact host allow-list validation. Return the stable message 代理暂时不可用 on fetch error; do not expose e.message. Apply the same rule to worker.js.

- [ ] **Step 4: 验证 GREEN**

Run: npm test -- tests/edgeone-proxy.test.mjs

Expected: 2 passing tests with no real network request.

- [ ] **Step 5: Commit**

Run:
~~~bash
git add functions/api/proxy.js worker.js tests/edgeone-proxy.test.mjs
git commit -m "fix: harden domestic proxy requests"
~~~

### Task 3: 接入客户端模块和国内优先体验

**Files:**
- Modify: index.html:401-1436
- Create: tests/smoke.py

- [ ] **Step 1: 编写失败浏览器测试**

Create tests/smoke.py. Start a local static server, open index.html with Playwright, intercept requests, and assert that a search first requests /api/proxy, never requests cors.eu.org, and a failed resolve click can trigger a new proxy request.

- [ ] **Step 2: 验证 RED**

Run: py tests/smoke.py

Expected: current source contains and can request cors.eu.org; retry remains blocked by a rejected resolvingMap entry.

- [ ] **Step 3: 最小前端修改**

Change the inline script to type module and import the three client utilities. Use buildProxyUrls instead of buildProxies, normalize configured URLs before saving settings, and runDeduplicated for wash resolution. Assign doSearch to window.doSearch so the existing retry button remains compatible. Update status text to label EdgeOne as the recommended domestic no-VPN entry.

- [ ] **Step 4: 验证 GREEN**

Run: npm test && py tests/smoke.py

Expected: Node tests pass; browser test confirms no public proxy, retry works, and no page error occurs.

- [ ] **Step 5: Commit**

Run:
~~~bash
git add index.html tests/smoke.py
git commit -m "fix: prefer EdgeOne proxy for domestic access"
~~~

### Task 4: 更新文档、发布并验证

**Files:**
- Modify: README.md
- Modify: EDGEONE-DEPLOY.md

- [ ] **Step 1: 更新部署说明**

Mark the EdgeOne URL as the recommended entry for domestic users. Explain that GitHub Pages needs the saved EdgeOne URL to search, public CORS fallback has been removed, and laowangzo.top is only an external destination rather than a dependency.

- [ ] **Step 2: 完整验证**

Run:
~~~bash
npm test
py tests/smoke.py
git diff --check
git status --short
~~~

Expected: all tests pass, diff check has no output, and only expected files are modified.

- [ ] **Step 3: 提交、合并、推送**

Run:
~~~bash
git add README.md EDGEONE-DEPLOY.md
git commit -m "docs: clarify EdgeOne domestic deployment"
git checkout main
git merge --ff-only feature/edgeone-domestic-proxy
git push origin main
~~~
