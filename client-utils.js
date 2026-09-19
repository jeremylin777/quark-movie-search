export function normalizeHttpsOrigin(value, label = '地址') {
  const text = String(value || '').trim();
  if (!text) return '';

  let url;
  try {
    url = new URL(text);
  } catch {
    throw new Error(`${label}不是有效 URL`);
  }
  if (url.protocol !== 'https:') {
    throw new Error(`${label}必须使用 HTTPS`);
  }
  return url.origin;
}

export function buildProxyUrls(target, { remoteProxy = '', customProxy = '' } = {}) {
  const encoded = encodeURIComponent(target);
  return [
    `/api/proxy?url=${encoded}`,
    ...(remoteProxy ? [`${remoteProxy}/api/proxy?url=${encoded}`] : []),
    ...(customProxy ? [`${customProxy}/?url=${encoded}`] : []),
    target,
  ];
}

export function runDeduplicated(inflight, key, task) {
  if (inflight.has(key)) return inflight.get(key);
  const promise = Promise.resolve().then(task);
  inflight.set(key, promise);
  return promise.finally(() => inflight.delete(key));
}
