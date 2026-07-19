# 云渡测评实验室

静态评估测试网站首页，基于 HTML5 UP Phantom 模板改造。

Cloudflare 上线、D1 测试码接入和手动换码流程见：`../../../产品手册/Cloudflare部署与每日测试码操作手册.md`。

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
- 三国谋士测试
- 路径：`tests/three-kingdoms-advisor/`
- 历史帝王测试
- 路径：`tests/historical-emperor/`

五款测试统一通过 Worker 路由 `/api/verify-code` 查询 D1 中当前启用的测试码，前端不保存固定正确码。测试码不会在零点自动失效，只有手动更新 D1 或将 `enabled` 改为 `0` 后才会失效。

网站同时提供“云渡超级会员”通道：会员使用唯一激活码开通和登录，登录成功后通过安全 Cookie 解锁全部测试；未登录用户仍可继续使用对应产品当前启用的单项测试码。

会员中心：`member/`

会员接口：

- `POST /api/member/login`：首次激活或再次登录
- `GET /api/member/me`：读取当前会员状态
- `POST /api/member/logout`：退出当前设备
- `POST /api/member/redeem`：使用新激活码续费

## 目录说明

```text
index.html                    网站首页
worker.js                     Worker 入口与测试码校验接口
wrangler.jsonc                Worker、静态资源和 D1 Binding 配置
.assetsignore                 静态资源上传排除规则
assets/css/main.css           Phantom 模板基础样式
assets/css/site.css           首页品牌与响应式样式
assets/css/member.css         会员中心样式
assets/css/test-member.css    测试页会员解锁提示样式
assets/js/member-auth.js      共享会员状态模块
member/                       会员激活、登录与续费页面
migrations/                   D1 数据库迁移
scripts/                      会员激活码生成工具
images/solo-business-cover.svg  测试卡片封面
images/love-personality-cover.svg  恋爱相处人格测试卡片封面
images/workplace-madness-cover.svg  打工人发疯人格测试卡片封面
images/historical-emperor-cover.svg  历史帝王测试卡片封面
tests/solo-business/          可独立部署的测试页面副本
tests/love-personality/       恋爱相处人格测试页面
tests/workplace-madness/      打工人发疯人格测试页面
tests/three-kingdoms-advisor/ 三国谋士测试页面
tests/historical-emperor/     历史帝王测试页面
```

## 新增测试

1. 在 `tests/` 下建立新的英文路径目录。
2. 将测试页面及其本地资源放入该目录。
3. 在首页 `test-grid` 中复制一张 `test-card`，修改标题、说明、元信息和链接。
4. 检查测试页资源路径，并提供返回 `../../` 的入口。
5. 引入 `member-auth.js` 与 `test-member.css`，复用会员自动解锁逻辑。

## 发布说明

当前项目使用 Cloudflare Worker + Static Assets，不是 Pages Functions。GitHub 部署命令使用 `npx wrangler deploy`，D1 Binding 已在 `wrangler.jsonc` 中固定为变量 `DB`。

会员数据库迁移与激活码生成、导入、发货流程见：`../../../产品手册/云渡超级会员/会员系统部署与激活码操作手册.md`。
