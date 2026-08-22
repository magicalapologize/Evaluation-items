# 社会化程度测试 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 Evaluation-items 测试站中上线 `socialization-degree`，包含 40 道题、六维评分、五阶段、八种人格报告、雷达图、行动建议和可分享海报。

**Architecture:** 复用现有测试产品的静态 HTML、CSS、ES modules、Worker 测试码和历史记录接口。将题库/结果文案放在 `data.mjs`，将计分、阶段和人格匹配放在 `model.mjs`，页面只负责流程与渲染；结果快照遵循现有历史记录 schema。

**Tech Stack:** 原生 HTML/CSS/JavaScript、ES modules、SVG 雷达图、Canvas 海报、Cloudflare Worker + D1、Node `node:test`。

## Global Constraints

- 产品 ID 固定为 `socialization-degree`，前端不写死测试码。
- 40 道题、8 个场景组、6 个维度、5 个阶段、8 个平等人格结果。
- 匹配刻度与展示刻度使用独立函数；不得用维度命中数除以总题数直接显示。
- 每个结果必须有独立提醒；建议必须写出场景、动作和边界/时间。
- 不添加心理诊断、医疗判断、财富承诺或绝对关系判断。
- 沿用现有项目样式与 API；不改动无关测试。
- 每个任务完成后运行该任务列出的测试，再继续下一任务。

### Task 1: 题库、人格结果与计分模型

**Files:**
- Create: `tests/socialization/data.mjs`
- Create: `tests/socialization/model.mjs`
- Create: `tests/socialization/model.test.mjs`
- Create: `scripts/validate-socialization.mjs`

**Interfaces:**
- `data.mjs` exports `DIMENSIONS`, `STAGES`, `QUESTIONS`, `RESULTS`.
- `model.mjs` exports `calculateProfile(answerIndexes)`, `getSignalBounds()`, `simulateDistribution(sampleCount, seed)`.
- `calculateProfile` returns `{ result, stage, raw, signals, displayScores, ranking, topKeys, secondKey, total, fingerprint }`.

- [ ] 编写模型测试：校验 40 题、每题 4 个选项、六维分数矩阵、8 结果资料完整、5 阶段边界、固定答案分布、随机 100,000 份可达性和结果稳定性。
- [ ] 运行 `node --test tests/socialization/model.test.mjs`，确认新模块尚不存在时失败。
- [ ] 编写原创 40 题和 8 组场景，逐项给选项配置主/辅维度语义分数；为 8 个结果写完整画像、优势、风险、适配场景、六维解释、3 条建议和独立提醒。
- [ ] 实现独立维度校准、人格原型距离匹配、确定性并列指纹、综合分和阶段映射。
- [ ] 运行模型测试和 `node scripts/validate-socialization.mjs`，调整矩阵直到所有结果可达、极端答卷分散、结果维度差异达标。

### Task 2: 页面骨架与答题流程

**Files:**
- Create: `tests/socialization/index.html`
- Create: `tests/socialization/style.css`

**Interfaces:**
- 页面通过 `import { DIMENSIONS, QUESTIONS, RESULTS } from "./data.mjs"` 和 `import { calculateProfile } from "./model.mjs"` 消费 Task 1 模块。
- 页面使用现有 `verifyDailyAccessCode`, `YunduHistory`, `YunduHistoryReplay` 等全局接口（以仓库当前实现为准）。

- [ ] 复制现有成熟测评的最小页面结构，建立首页、答题、分析、结果、海报弹窗和好评返现弹窗 screen。
- [ ] 接入 `socialization-degree` 测试码校验、题号/进度、四选项、上一题、完成后计算结果和重新测试。
- [ ] 在桌面和移动断点加入六维雷达图容器、阶段/综合分和结果区块，先使用真实模型数据渲染。
- [ ] 运行静态检查和页面本地预览，确认无模块路径错误、按钮事件错误和控制台异常。

### Task 3: 结果报告、历史快照与交互动作

**Files:**
- Modify: `tests/socialization/index.html`
- Modify: `tests/socialization/style.css`

**Interfaces:**
- 结果快照 `productId` 为 `socialization-degree`，包含 `productTitle`, `result`, `stage`, `overview`, `dimensions`, `sections`, `disclaimer`, `createdAt`。
- 页面提供保存报告、复制摘要、重新测试和好评返现按钮。

- [ ] 渲染六维排名、每个维度的分数/强项/风险/行动、综合评价、人格报告和阶段建议。
- [ ] 实现复制摘要并保证复制文本包含人格、阶段、综合分和六维分数。
- [ ] 实现历史快照保存与回放，确保回放结果不重新依赖当前随机状态。
- [ ] 为按钮、弹窗、空状态和失败状态补充测试，并运行现有 history integration 测试。

### Task 4: 海报与产品资源

**Files:**
- Modify: `tests/socialization/index.html`
- Modify: `tests/socialization/style.css`
- Create: `assets/product-qrs/socialization-degree.png`
- Create: `images/cards/socialization-degree.webp`

**Interfaces:**
- `createPosterImage(profile)` 返回可设置给 `<img>` 的 PNG data URL。
- 海报使用 `assets/product-qrs/socialization-degree.png`，绘制完整六维数据和 3 条建议。

- [ ] 复用现有 Canvas 海报加载器，加入身份、阶段、六维数据、建议和 CTA 四区。
- [ ] 在真实浏览器生成 PNG，打开图片检查文字、雷达图、建议和二维码。
- [ ] 修复手机海报弹窗滚动与横向溢出，再运行目标尺寸检查。

### Task 5: 站点入口、Worker 白名单与资源接入

**Files:**
- Modify: `worker.js`
- Modify: `assets/js/test-history.js`
- Modify: `index.html`
- Modify: `index-preview.html`

**Interfaces:**
- Worker `PRODUCT_IDS` 包含 `socialization-degree`。
- 历史记录路由映射 `/tests/socialization-degree/`。

- [ ] 加入唯一产品 ID 和首页测评卡片/入口。
- [ ] 加入历史记录允许列表和产品路由，确保保存/回放/会员访问可识别。
- [ ] 用错误码、正确码、停用码和跨产品码验证 Worker 响应。

### Task 6: 全链路验收

**Files:**
- Modify only files required by failed checks.
- Test: `tests/socialization/model.test.mjs`, existing integration tests, browser screenshots.

- [ ] 跑模型、历史记录、Worker 相关测试。
- [ ] 跑全选 A/B/C/D、固定序列、随机 100,000 份、8 结果提醒完整性检查。
- [ ] 在 `1440x900`, `1366x768`, `390x844`, `390x720`, `360x720`, `320x720` 完整操作一次并检查无溢出/重叠/控制台错误。
- [ ] 生成并打开真实 PNG 海报，确认六维完整和二维码可识别。
