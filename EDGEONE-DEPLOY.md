# EdgeOne Pages 部署指南(国内免 VPN 直连)

## 为什么要部署到这里

| 访问路径 | 国内(无 VPN) | 说明 |
|---|---|---|
| GitHub Pages 前端 | ✅ 可达 | 页面本身能打开 |
| zreso.cn API | ✅ 可达 | 但拒绝浏览器跨站请求(403) |
| workers.dev(CF Worker 代理) | ❌ **被墙** | ← 之前必须开 VPN 的原因 |
| **edgeone.app(本方案)** | ✅ **可直连** | 腾讯自家边缘网络,免费 |

把**前端 + 代理函数**一起部署到 EdgeOne Pages 后:同源调用代理函数,既没有跨域问题,域名又在国内可达,**完全不需要 VPN**。这个 EdgeOne 地址应作为国内用户的正式入口。GitHub Pages 保留为备用入口，填入自己的 EdgeOne 地址后也可搜索。

## 部署步骤(约 5 分钟,免费)

1. 打开 [https://edgeone.ai/pages](https://edgeone.ai/pages)(或 console.tencentcloud.com 搜 EdgeOne Pages),微信/邮箱注册登录。
2. **Create Project → Import from Git**,授权并选择本仓库(`quark-movie-search`)。
3. 构建设置全部留空/默认(纯静态,无需构建命令),直接 **Start Deploy**。
4. 部署完成后获得免费域名:`https://<项目名>.edgeone.app`。
   - 仓库里的 `functions/api/proxy.js` 会被自动识别为边缘函数,路由 `/api/proxy`。
5. 打开 `https://<项目名>.edgeone.app`,搜索即走同源代理,**免 VPN 可用**；将此地址作为国内用户访问链接。

### (可选)代理更多域名

默认只允许代理 `zreso.cn`。如果要同时代理自部署的 PanSou 实例:
项目设置 → 环境变量 → 添加 `EXTRA_ALLOW_HOSTS` = `pansou.example.com`(多个用逗号分隔)。每项必须是精确 HTTPS 主机名，例如 `pansou.example.com`，不能填写通配符或路径。

## 给 GitHub Pages 版补上免 VPN 能力

不想迁移托管?只把 EdgeOne 当代理用也行:
1. 按上面步骤部署一次(拿到 `xxx.edgeone.app`)。
2. 在 GitHub Pages 版网站右上角 **⚙ 设置** → "远程代理地址"填入 `https://xxx.edgeone.app` → 保存。
3. 之后 GitHub Pages 版会在本地同源函数 404 后自动走你的 EdgeOne 代理，免 VPN 可用。
4. 项目不会再回退到第三方公共 CORS 代理；未配置 EdgeOne 时，国内网络可能无法使用 Cloudflare Worker。

## 加片源:自部署 PanSou(可选,聚合 15+ 片源站)

[fish2018/pansou](https://github.com/fish2018/pansou)(14k+ stars)聚合 TG 频道 + 多个网盘资源站,夸克/阿里/百度/115/迅雷一次搜完,**返回的链接可直接打开,无需"解析"步骤**。

- Docker 一行部署:`docker run -d -p 8888:8888 fish2018/pansou`(服务器/NAS);也支持 Vercel/Zebrur 等免费平台。
- 部署好后,本站右上角 **⚙ 设置** → "PanSou 实例地址"填入公网可访问的 `https://你的地址` → 保存。EdgeOne 页面是 HTTPS，HTTP PanSou 实例会被浏览器的混合内容策略拦截。
- 搜索结果会多出 "PanSou" 来源,卡片直接显示"打开夸克网盘"等按钮。

## 其他补充片源入口

搜索后结果区顶部有深链接按钮(免抓取,永远可用):
- **🧲 老王磁力搜**:国内直连的磁力/BT 搜索引擎(laowangsou.top)
- **📦 PanHub 聚合**:开源聚合网盘搜索演示站(panhub.shenzjd.com)

这些入口仅为跳转补充来源。本站不抓取或依赖任何第三方站点的未公开接口。
