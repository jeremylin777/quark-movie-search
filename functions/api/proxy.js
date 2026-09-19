/**
 * 夸克影视搜 - EdgeOne Pages 边缘函数代理
 * =====================================================
 * 部署在腾讯云 EdgeOne Pages(免费)后, 与前端同源:
 *   ① 无跨域限制(浏览器直接调用 /api/proxy?url=...)
 *   ② *.edgeone.app 域名国内可直连, 无需 VPN
 *   ③ 服务端转发时伪造 zreso 需要的 Origin/Referer 头
 *
 * 用法: GET /api/proxy?url=<encodeURIComponent 后的目标地址>
 * 白名单: zreso.cn 默认允许; 其他域名(如 PanSou 实例)通过
 *         环境变量 EXTRA_ALLOW_HOSTS 配置(逗号分隔), 防止被滥用
 *
 * 部署步骤见仓库 EDGEONE-DEPLOY.md
 */

const DEFAULT_ALLOW = ['zreso.cn'];

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, corsHeaders()),
  });
}

function hostAllowed(hostname, extra) {
  const all = DEFAULT_ALLOW.concat(extra || []);
  return all.some(h => hostname === h);
}

export async function onRequest(context) {
  const { request, env } = context || {};

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return jsonResponse({ ok: false, msg: '仅支持 GET 和 HEAD 请求' }, 405);
  }

  const url = new URL(request.url);
  const target = url.searchParams.get('url');
  if (!target) {
    return jsonResponse({ ok: false, msg: '缺少 url 参数, 用法: /api/proxy?url=<编码后的目标地址>' }, 400);
  }

  // 白名单校验: 默认 zreso.cn + 环境变量 EXTRA_ALLOW_HOSTS(逗号分隔)
  let targetUrl;
  try {
    targetUrl = new URL(target);
  } catch (e) {
    return jsonResponse({ ok: false, msg: 'url 参数无效' }, 400);
  }
  let extra = [];
  try {
    extra = String((env && env.EXTRA_ALLOW_HOSTS) || '').split(',')
      .map(s => s.trim().toLowerCase().replace(/\.$/, ''))
      .filter(s => /^[a-z0-9.-]+$/.test(s));
  } catch (e) { extra = []; }
  if (targetUrl.protocol !== 'https:') {
    return jsonResponse({ ok: false, msg: '仅允许 HTTPS 目标地址' }, 400);
  }
  if (!hostAllowed(targetUrl.hostname, extra)) {
    return jsonResponse({ ok: false, msg: '不允许访问该域名: ' + targetUrl.hostname + '(可在环境变量 EXTRA_ALLOW_HOSTS 中添加)' }, 403);
  }

  // 服务端转发: 伪造源站要求的请求头
  try {
    const init = {
      method: request.method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        'Accept': request.headers.get('Accept') || '*/*',
        'Referer': targetUrl.origin + '/',
        'Origin': targetUrl.origin,
      },
    };
    const resp = await fetch(targetUrl.toString(), init);
    const headers = Object.assign({}, corsHeaders());
    const ct = resp.headers.get('content-type');
    if (ct) headers['Content-Type'] = ct;
    const cc = resp.headers.get('cache-control');
    if (cc) headers['Cache-Control'] = cc;
    return new Response(resp.body, { status: resp.status, headers });
  } catch (e) {
    return jsonResponse({ ok: false, msg: '代理暂时不可用，请稍后重试' }, 502);
  }
}
