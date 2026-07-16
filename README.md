# 云渡测评实验室

静态评估测试网站首页，基于 HTML5 UP Phantom 模板改造。

Cloudflare 上线、D1 测试码接入和每日运维流程见：`Cloudflare部署与每日测试码操作手册.md`。

## 本地预览

在当前目录启动静态服务器：

```bash
python3 -m http.server 8765
```

访问：

```text
http://127.0.0.1:8765/
```

## 当前测试

- 副业 / 一人公司赛道测试
- 路径：`tests/solo-business/`
- 恋爱相处人格测试
- 路径：`tests/love-personality/`
- 打工人发疯人格测试
- 路径：`tests/workplace-madness/`

三款测试统一通过 Worker 路由 `/api/verify-code` 查询 D1 中的每日测试码，前端不保存固定正确码。

## 目录说明

```text
index.html                    网站首页
worker.js                     Worker 入口与测试码校验接口
wrangler.jsonc                Worker、静态资源和 D1 Binding 配置
.assetsignore                 静态资源上传排除规则
assets/css/main.css           Phantom 模板基础样式
assets/css/site.css           首页品牌与响应式样式
images/solo-business-cover.svg  测试卡片封面
images/love-personality-cover.svg  恋爱相处人格测试卡片封面
images/workplace-madness-cover.svg  打工人发疯人格测试卡片封面
tests/solo-business/          可独立部署的测试页面副本
tests/love-personality/       恋爱相处人格测试页面
tests/workplace-madness/      打工人发疯人格测试页面
```

## 新增测试

1. 在 `tests/` 下建立新的英文路径目录。
2. 将测试页面及其本地资源放入该目录。
3. 在首页 `test-grid` 中复制一张 `test-card`，修改标题、说明、元信息和链接。
4. 检查测试页资源路径，并提供返回 `../../` 的入口。

## 发布说明

当前项目使用 Cloudflare Worker + Static Assets，不是 Pages Functions。GitHub 部署命令使用 `npx wrangler deploy`，D1 Binding 已在 `wrangler.jsonc` 中固定为变量 `DB`。
