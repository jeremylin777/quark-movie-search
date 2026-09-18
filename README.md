# 夸克影视搜 🎬

快速搜索电影、电视剧、动漫的夸克网盘链接。纯静态网页,打开即用。

## ✨ 功能

- 🔍 多片源聚合:泽索搜(默认) + PanSou 实例(可选,⚙ 设置中配置,聚合 15+ 片源站)
- ⚡ PanSou 结果直达:链接免解析直接打开(夸克/阿里/百度/115/迅雷),含磁力链接支持
- 🧲 更多片源深链接:一键跳转老王磁力(国内直连 BT 搜索)/ PanHub 聚合搜索
- 🔗 一键解析真实网盘链接,复制/直达
- 🎬 五档排序:最新 / 夸克优先 / 相关度 / 高清优先 / 字幕优先
- 🎞️ 从标题智能识别画质(4K/1080P)和字幕(内封/双语/特效/无字幕)
- 💾 搜索缓存:10 分钟内重复搜索秒开,过期后台静默刷新
- 🔄 五级代理自动降级:同源函数 → EdgeOne → CF Worker → 公共代理 → 直连
- 📱 移动端适配

## 🚀 在线访问

**https://jeremylin777.github.io/quark-movie-search/**

> 国内免 VPN 直连部署方案(推荐):把本仓库部署到腾讯 EdgeOne Pages,见 [EDGEONE-DEPLOY.md](EDGEONE-DEPLOY.md)

## 🏗️ 技术架构

```
浏览器 (index.html)
   │  ① 同源代理 /api/proxy (EdgeOne Pages 部署后自动生效, 国内免VPN)
   │  ② 远程 EdgeOne 代理 (⚙ 设置中配置)
   │  ③ Cloudflare Worker 专属代理 (worker.js, 海外/VPN 快)
   │  ④ cors.eu.org 公共代理 → ⑤ 直连
   ▼
片源A: 泽索搜 API (zreso.cn) — wash 解析出网盘链接
片源B: PanSou 实例 (fish2018/pansou 自部署) — 链接直达免解析
片源C: 老王磁力 / PanHub — 深链接跳转, 免抓取
```

- 纯前端单文件 `index.html`,无任何框架依赖
- 多片源并行搜索、分源状态展示、同源内去重合并
- 代理链按优先级自动降级,单个代理故障不影响搜索

## 📁 项目结构

| 文件 | 说明 |
|---|---|
| `index.html` | 主站(单文件,含全部样式/逻辑) |
| `functions/api/proxy.js` | EdgeOne Pages 边缘函数(同源代理,国内免 VPN 核心) |
| `worker.js` | Cloudflare Worker 专属代理代码 |
| `EDGEONE-DEPLOY.md` | EdgeOne 部署指南 + PanSou 自部署教程 |
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
