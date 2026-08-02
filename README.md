# 夸克影视搜 🎬

快速搜索电影、电视剧、动漫的夸克网盘链接。纯静态网页,打开即用。

## ✨ 功能

- 🔍 搜索影视资源的夸克/百度/迅雷/UC 网盘链接
- 🔗 一键解析真实网盘链接,复制/直达
- 🎬 四档排序:最新 / 夸克优先 / 相关度 / 高清优先
- 🎞️ 从标题智能识别画质(4K/1080P)和文件大小
- 💾 搜索缓存:10 分钟内重复搜索秒开,不重复请求
- 🔄 代理自动降级 + 失败快速重试 + 友好错误提示
- 📱 移动端适配

## 🚀 在线访问

**https://jeremylin777.github.io/quark-movie-search/**

## 🏗️ 技术架构

```
浏览器 (index.html)
   │  请求
   ▼
Cloudflare Worker 专属代理 (worker.js, 已部署)
   │  转发 (白名单仅 zreso.cn)
   ▼
泽索搜 API (zreso.cn) — 全网网盘影视资源
```

- 纯前端单文件 `index.html`,无任何框架依赖
- 专属代理解决 CORS 跨域限制,稳定快速
- 代理不可用时自动降级到公共代理 / 直连

## 📁 项目结构

| 文件 | 说明 |
|---|---|
| `index.html` | 主站(单文件,含全部样式/逻辑) |
| `worker.js` | Cloudflare Worker 专属代理代码 |
| `deploy/` | GitHub Pages 部署目录 |

## 🔧 本地运行

```bash
# 任意静态服务器即可
python -m http.server 8080
# 然后访问 http://localhost:8080
```

## 🛡️ 自部署专属代理(可选)

当前已部署,如需重新部署或迁移:

1. 打开 https://dash.cloudflare.com/ 注册(免费)
2. Workers & Pages → Create application → Create Worker
3. 将 `worker.js` 内容粘贴部署
4. 得到 `https://xxx.workers.dev` 地址
5. 打开 `index.html`,在顶部 `CUSTOM_PROXY` 配置中填入该地址

## ⚠️ 注意事项

- 解析接口(泽索搜 wash)有频率限制,连续快速点击可能触发限流,等待 10-30 秒即可
- 资源来自公开网络,部分链接可能失效(状态显示"✕ 失效")
- 本机网络对海外域名(workers.dev/github.io)可能不稳定,属网络环境限制

## 📜 免责声明

本项目仅用于技术学习与搜索聚合演示,不存储、不传播任何受版权保护的内容。所有资源链接来自公开网络,请遵守当地法律法规,侵权请联系源站处理。
