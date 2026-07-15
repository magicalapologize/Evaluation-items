# 云渡测评实验室

静态评估测试网站首页，基于 HTML5 UP Phantom 模板改造。

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
- 演示测试码：`SOLO-2026`
- 恋爱相处人格测试
- 路径：`tests/love-personality/`
- 演示测试码：`LOVE-2026`
- 打工人发疯人格测试
- 路径：`tests/workplace-madness/`
- 演示测试码：`CRAZY-2026`

## 目录说明

```text
index.html                    网站首页
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

发布时上传整个 `Evaluation-items` 目录，不能只上传首页文件。当前测试码在前端代码中，仅用于体验门槛，不具备安全鉴权能力。
