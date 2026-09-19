/**
 * 夸克影视搜 - Cloudflare Worker 专属 CORS 代理
 * =====================================================
 * 用途: 解决浏览器跨域(CORS)限制, 让前端网页能稳定访问泽索搜 API
 * 优势: 免费、全球节点快、不受公共代理波动影响, 且专属 IP 不与本地挤限流额度
 *
 * 部署步骤(约 2 分钟, 免费):
 * 1. 打开 https://dash.cloudflare.com/ 注册/登录(免费)
 * 2. 左侧菜单选 "Workers & Pages" → "Create application" → "Create Worker"
 * 3. 名称随意, 如 quark-search-proxy → Deploy
 * 4. 点 "Edit code", 删除默认代码, 粘贴本文件全部内容 → Save and Deploy
 * 5. 部署完成后你会得到一个地址: https://quark-search-proxy.你的子域.workers.dev
 * 6. 把这个地址填到 index.html 顶部的 CUSTOM_PROXY 配置里即可
 *
 * 验证: 浏览器打开
 *   https://quark-search-proxy.你的子域.workers.dev/?url=https%3A%2F%2Fzreso.cn%2Fapi%2Fsearch%3Fq%3D三体
 *   应返回 JSON 数据
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const target = url.searchParams.get('url');

    if (!target) {
      return new Response('缺少 url 参数, 用法: /?url=<编码后的目标地址>', {
        status: 400,
        headers: corsHeaders()
      });
    }

    // 仅允许转发到白名单域名, 防止 Worker 被滥用
    // 默认 zreso.cn; 需代理其他域名(如 PanSou 实例)时在 Worker 环境变量
    // EXTRA_ALLOW_HOSTS 中配置(逗号分隔, 如: pansou.example.com,foo.com)
    let targetUrl;
    try {
      targetUrl = new URL(target);
    } catch (e) {
      return new Response('url 参数无效', { status: 400, headers: corsHeaders() });
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('仅支持 GET 和 HEAD 请求', { status: 405, headers: corsHeaders() });
    }
    let extra = [];
    try {
      extra = String((env && env.EXTRA_ALLOW_HOSTS) || '').split(',')
        .map(s => s.trim().toLowerCase().replace(/\.$/, ''))
        .filter(s => /^[a-z0-9.-]+$/.test(s));
    } catch (e) { extra = []; }
    const allowed = ['zreso.cn'].concat(extra);
    if (targetUrl.protocol !== 'https:') {
      return new Response('仅允许 HTTPS 目标地址', { status: 400, headers: corsHeaders() });
    }
    const hostOk = allowed.some(h => targetUrl.hostname === h);
    if (!hostOk) {
      return new Response('不允许访问该域名: ' + targetUrl.hostname, {
        status: 403,
        headers: corsHeaders()
      });
    }

    // 转发请求
    try {
      const init = {
        method: request.method,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
          'Accept': request.headers.get('Accept') || '*/*',
          'Referer': 'https://zreso.cn/',
          'Origin': 'https://zreso.cn',
        },
      };
      const resp = await fetch(targetUrl.toString(), init);
      const headers = corsHeaders();
      // 透传必要响应头
      for (const h of ['content-type', 'cache-control']) {
        const v = resp.headers.get(h);
        if (v) headers.set(h, v);
      }
      return new Response(resp.body, { status: resp.status, headers });
    } catch (e) {
      return new Response('代理暂时不可用，请稍后重试', {
        status: 502,
        headers: corsHeaders()
      });
    }
  }
};

function corsHeaders() {
  return new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Max-Age': '86400',
  });
}
