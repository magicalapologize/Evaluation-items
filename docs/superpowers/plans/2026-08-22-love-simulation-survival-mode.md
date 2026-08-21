# 心动副本「心动生存局」Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 20 题完整恋爱线旁增加一个最多 12 关、可提前出局、可生成独立结果与分享卡片的「心动生存局」。

**Architecture:** 保留完整模式现有数据与结果算法；在 `data.js` 添加固定题目索引和生存文案，在 `model.js` 添加无 DOM 的纯函数，在 `app.js` 用 `state.mode` 分流答题和结果。HTML 只增加模式页、生存反馈和结果结构，CSS 沿用现有视觉变量做最小扩展。

**Tech Stack:** 原生 ES modules、DOM、SVG 雷达图、Canvas 海报、Node.js `node:test`、Cloudflare Static Assets（Worker/D1 不改）。

## Global Constraints

- 四角色各固定 12 题，不运行时随机抽题。
- 前 3 关不能结束，第 4 关最早出局；连续翻车 3 或累计危险值 6 触发失败。
- 生存模式不能返回上一题，反馈和结果必须稳定，不使用 `Math.random()`。
- 四角色 × 六档共 24 条独立结局文案，不使用角色名替换模板。
- 生存雷达独立计算并限制在 `18–95`；完整模式雷达和动态最高项逻辑保持不变。
- 测试码、D1、Worker、商品二维码和完整模式题目均不修改。

---

### Task 1: 生存配置与纯模型

**Files:**
- Modify: `tests/love-simulation/data.js`
- Modify: `tests/love-simulation/model.js`
- Create: `tests/love-simulation/survival-model.test.mjs`

**Interfaces:**
- Produces: `SURVIVAL_CONFIG`, `SURVIVAL_COPY`；`settleSurvivalAnswer(state, option)`、`shouldEndSurvival(state, questionNumber)`、`calculateSurvivalResult(role, history)`。

- [ ] **Step 1: 写失败测试**

覆盖四角色 12 个唯一索引、保护期、抢救关、连续/累计失败、3/5 分恢复、温度、死因、18–95 维度范围、结果稳定性和 24 条独立结局。

- [ ] **Step 2: 确认测试失败**

Run: `node --test tests/love-simulation/survival-model.test.mjs`

Expected: FAIL，提示生存配置或函数尚未导出。

- [ ] **Step 3: 最小实现**

在 `data.js` 显式保存各角色题号、反馈、死因、建议和 24 条结局；在 `model.js` 以纯函数实现结算和结果计算，不改 `calculateResult()`。

- [ ] **Step 4: 确认模型测试通过**

Run: `node --test tests/love-simulation/survival-model.test.mjs`

Expected: PASS。

### Task 2: 模式选择与生存答题流程

**Files:**
- Modify: `tests/love-simulation/index.html`
- Modify: `tests/love-simulation/app.js`
- Modify: `tests/love-simulation/style.css`
- Create: `tests/love-simulation/ui-contract.test.mjs`

**Interfaces:**
- Consumes: Task 1 的生存配置和纯函数。
- Produces: 测试码后模式选择、共用角色选择、12 关答题、三格警报、稳定即时反馈、提前结束分流。

- [ ] **Step 1: 写 UI 契约失败测试**

检查模式屏、生存警报、反馈区、生存结果屏和必要按钮 ID；检查应用代码未在生存分支启用上一题。

- [ ] **Step 2: 确认测试失败**

Run: `node --test tests/love-simulation/ui-contract.test.mjs`

Expected: FAIL，提示模式或生存节点缺失。

- [ ] **Step 3: 实现模式和答题状态机**

测试码成功后进入模式页；`full` 走原逻辑，`survival` 使用固定 12 题并锁定已选按钮，显示 700ms 左右稳定反馈后结算。抢救关在题目上方明确提示，生存模式隐藏上一题。

- [ ] **Step 4: 实现响应式样式**

添加两张模式卡、三格警报、反馈条；确保手机四个选项不横向溢出，并保留现有完整模式样式。

- [ ] **Step 5: 确认契约测试通过**

Run: `node --test tests/love-simulation/ui-contract.test.mjs`

Expected: PASS。

### Task 3: 生存结果页与挑战分享卡

**Files:**
- Modify: `tests/love-simulation/index.html`
- Modify: `tests/love-simulation/app.js`
- Modify: `tests/love-simulation/style.css`
- Modify: `tests/love-simulation/ui-contract.test.mjs`

**Interfaces:**
- Consumes: `calculateSurvivalResult(role, history)`。
- Produces: 生存首屏、危险信号雷达、致命选择、纠偏建议、四个重玩入口、独立 Canvas 挑战卡。

- [ ] **Step 1: 扩展失败测试**

检查生存结果字段、四个按钮、完整结果的生存入口、挑战卡二维码资源和生存图注。

- [ ] **Step 2: 实现结果渲染和导流**

显示关数、称号、角色结局、温度、死因、危险雷达、致命选择和一条建议；实现同角色重来、换角色、走完整线及完整线转生存局。

- [ ] **Step 3: 实现独立挑战卡**

Canvas 只放角色、关数、称号、死因、挑战文案和现有商品二维码；等待图片加载完成后绘制。

- [ ] **Step 4: 确认测试通过**

Run: `node --test tests/love-simulation/*.test.mjs`

Expected: PASS。

### Task 4: 回归、浏览器与手机验收

**Files:**
- Modify only if a verification failure directly requires a fix.

**Interfaces:**
- Consumes: 完整实现。
- Produces: 模型、DOM、完整模式回归和目标视口验收结果。

- [ ] **Step 1: 静态与模型回归**

Run: `node --check tests/love-simulation/app.js && node --check tests/love-simulation/data.js && node --check tests/love-simulation/model.js && node --test tests/love-simulation/*.test.mjs`

Expected: 全部通过。

- [ ] **Step 2: 本地浏览器完整流程**

使用本地静态服务器和会员直通，分别跑：完整模式 20 题、生存模式第 4 关出局、生存模式 12 关通关、两类海报生成。

- [ ] **Step 3: 响应式验收**

检查 `1440×900`、`1366×768`、`390×844`、`360×720`、`320×720`，要求 `document.documentElement.scrollWidth <= window.innerWidth`，结果首屏和四个选项可见且无重叠。

- [ ] **Step 4: 差异检查**

Run: `git diff --check -- tests/love-simulation docs/superpowers/plans/2026-08-22-love-simulation-survival-mode.md`

Expected: 无空白错误，且不包含 Worker、D1、测试码或无关文件修改。
