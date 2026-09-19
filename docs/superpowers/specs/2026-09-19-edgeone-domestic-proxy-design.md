# EdgeOne 国内直连代理设计

## 目标

保留 GitHub Pages 作为既有前端入口，同时使部署到腾讯 EdgeOne Pages 的同一份站点成为国内免 VPN 的首选入口。搜索请求在 EdgeOne 域名下通过同源 `/api/proxy` 转发，不依赖被墙的 Cloudflare Worker。

## 范围

- 前端在 EdgeOne 同源环境中优先调用 `/api/proxy`；GitHub Pages 上的该请求快速失败后，再尝试用户在设置中填写的 EdgeOne 代理。
- 禁止默认使用第三方公共 CORS 代理，防止搜索词泄露给公共中继且消除不稳定依赖。
- EdgeOne 与 Cloudflare 代理仅支持 `GET`、`HEAD`、HTTPS 目标；保留严格的主机白名单，并返回通用失败消息。
- 解决解析接口失败后同一链接不能重试的问题。
- 设置面板在保存 PanSou 和远程代理地址前校验 URL；远程代理必须是 HTTPS。
- 文档说明国内用户应访问 EdgeOne 地址，并给出一次性部署与 GitHub Pages 备用入口的配置步骤。

## 不在范围内

- 不抓取、逆向或依赖 `laowangzo.top` 的未公开接口；该站仅作为用户可直达的外部补充来源。
- 不增加账号、数据库、付费服务或新的后端运行时。
- 不移除 GitHub Pages，也不改变现有的结果展示、排序与链接解析流程。

## 架构与数据流

浏览器先调用相对路径 `/api/proxy`。当页面由 EdgeOne Pages 托管时，该路径由 `functions/api/proxy.js` 处理并同源转发给已允许的 HTTPS 片源；当页面由 GitHub Pages 托管时，该路径为 404，前端会立即尝试设置中保存的远程 EdgeOne 地址。若两者均不可用，才尝试专属 Cloudflare Worker，最后对源站直连。PanSou 仅通过显式配置的 HTTPS 地址查询。

所有代理端均拒绝非 `GET`/`HEAD`、非 HTTPS、以及未精确匹配白名单的主机名。前端不再把请求转发给公共 CORS 服务。失败响应只包含稳定的用户可读错误，不泄露运行时异常细节。

## 错误处理与测试

- `resolvingMap` 在请求结算后删除对应 key，使失败请求可重新发起，成功结果仍由 `linkCache` 复用。
- URL 校验失败时保留弹窗并显示提示，不写入 localStorage。
- 添加 Node 内置测试：验证代理限制、设置 URL 规则、失败后可重试的解析去重行为，以及不含公共代理回退。
- 使用本地静态服务器和浏览器冒烟测试确认同源优先、搜索完成及无控制台错误。

## 验收标准

1. EdgeOne 域名下搜索可经 `/api/proxy` 返回结果，国内用户不需要访问 workers.dev。
2. GitHub Pages 通过保存的 EdgeOne 远程代理仍可搜索；未配置时展示清晰的部署指引。
3. 不再请求 `cors.eu.org`。
4. 代理拒绝 POST、HTTP URL 与未允许主机。
5. 解析失败后再次点击会创建新的请求。
