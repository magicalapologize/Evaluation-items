# 天赋挖掘测试首页介绍区 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在天赋挖掘测试首页首屏入口之后增加紧凑的产品介绍区，让用户快速理解测试动机、理论依据、报告价值和适用人群。

**Architecture:** 继续使用单页 HTML + 页面级 CSS。介绍内容作为 `#home-screen` 内的静态语义区块，使用现有首页粒子背景和颜色变量，不引入新脚本、依赖或图片；UI 契约测试检查结构、文案和响应式样式存在。

**Tech Stack:** HTML5、CSS、Node.js `node:test`。

## Global Constraints

- 首屏已有测试入口保持首要 CTA，不新增测试流程或验证逻辑。
- 结果表述只描述相对倾向与探索线索，不承诺能力诊断或职业结论。
- 桌面新增介绍区约 560–680px，手机新增约 600–800px，避免对标页式超长页面。
- 不新增外部资源、图片或运行时依赖。

---

### Task 1: Add the compact homepage information structure

**Files:**
- Modify: `tests/talent-discovery/index.html` in the `#home-screen` section after `.theory-note`
- Test: `tests/talent-discovery/ui-compat.test.mjs`

**Interfaces:**
- Produces the static selectors `.home-intro`, `.home-reasons`, `.home-method`, `.home-benefits`, `.home-fit-list`, and anchor `#home-method` for CSS and tests.

- [ ] **Step 1: Add a failing UI contract test**

Add assertions that the homepage contains the four headings, three reason cards, four benefit cards, three fit labels, the theory disclaimer, and the “了解测试方法” anchor.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --test tests/talent-discovery/ui-compat.test.mjs`

Expected: FAIL because the new homepage selectors and headings are not present.

- [ ] **Step 3: Add the compact semantic markup**

Insert after `.theory-note`:

```html
<section id="home-method" class="home-intro" aria-labelledby="intro-title">
  <div class="home-intro-heading">
    <p class="eyebrow">WHY TALENT MAP</p>
    <h2 id="intro-title">先看见你的自然倾向，再决定下一步</h2>
    <p>天赋不是一张给你贴上的标签，而是一组可以被观察、练习和验证的倾向。</p>
  </div>
  <div class="home-reasons" aria-label="为什么做这项测试">
    <article><strong>说不清自己擅长什么</strong><span>把日常反应整理成可理解的线索。</span></article>
    <article><strong>总被单一标准衡量</strong><span>从八个角度看见不同的优势组合。</span></article>
    <article><strong>想找方向却缺少依据</strong><span>用真实情境选择，找到值得继续验证的方向。</span></article>
  </div>
  <div class="home-intro-grid">
    <article class="home-method">
      <p class="intro-label">TEST BASIS</p>
      <h3>参考加德纳的多元智能理论</h3>
      <p>我们把理论维度转译成语言表达、逻辑推演、空间想象、身体实践、音乐节奏、人际感知、内在觉察和自然观察八项天赋。结果反映本次答卷中的相对倾向，不是智力诊断，也不代表固定能力等级。</p>
    </article>
    <div class="home-benefits" aria-label="你将获得什么">
      <article><b>01</b><strong>最佳天赋评估</strong><span>看见当前最突出的优势线索。</span></article>
      <article><b>02</b><strong>八项天赋排序</strong><span>了解自己的强弱组合，而不是只看单项。</span></article>
      <article><b>03</b><strong>活跃天赋组合</strong><span>理解优势如何在真实场景里协同。</span></article>
      <article><b>04</b><strong>赛道与成长建议</strong><span>把观察转成可以尝试的下一步。</span></article>
    </div>
  </div>
  <div class="home-fit"><p class="intro-label">SUITABLE FOR</p><div class="home-fit-list"><span>想更了解自己的人</span><span>正在探索职业或副业方向的人</span><span>希望把优势转成行动计划的人</span></div></div>
  <a class="home-method-link" href="#home-method">了解测试方法 <span aria-hidden="true">↓</span></a>
</section>
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `node --test tests/talent-discovery/ui-compat.test.mjs`

Expected: PASS for the new homepage structure and all existing contracts.

- [ ] **Step 5: Commit**

```bash
git add tests/talent-discovery/index.html tests/talent-discovery/ui-compat.test.mjs
git commit -m "feat: add compact talent discovery homepage intro"
```

### Task 2: Style the introduction for desktop and mobile

**Files:**
- Modify: `tests/talent-discovery/style.css` near the existing homepage rules and mobile media query
- Test: `tests/talent-discovery/ui-compat.test.mjs`

**Interfaces:**
- Consumes the selectors added in Task 1.
- Produces responsive layout rules with existing theme variables and no new assets.

- [ ] **Step 1: Add failing style assertions**

Assert that `.home-intro` uses a constrained width, `.home-reasons` and `.home-benefits` use grid layouts, and the mobile media query changes `.home-benefits` to two columns.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --test tests/talent-discovery/ui-compat.test.mjs`

Expected: FAIL because the new selectors are not styled.

- [ ] **Step 3: Add minimal responsive CSS**

Use existing variables: `.home-intro` with `margin: 70px auto 0`, `.home-reasons` as three columns, `.home-intro-grid` as `minmax(260px,.8fr) minmax(0,1.2fr)`, `.home-benefits` as 2×2, and `.home-fit-list` as three flexible pills. Use translucent navy panels and `#ffffff20` borders. At `max-width:760px`, reduce spacing, stack `.home-intro-grid`, keep `.home-benefits` at two columns, and let fit labels wrap.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `node --test tests/talent-discovery/ui-compat.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/talent-discovery/style.css tests/talent-discovery/ui-compat.test.mjs
git commit -m "style: keep talent homepage intro compact on mobile"
```

### Task 3: Run the full regression and static preview checks

**Files:**
- Verify: `tests/talent-discovery/*.test.mjs`, `tests/talent-discovery/app.js`, `tests/talent-discovery/glyph-renderer.js`

- [ ] **Step 1: Run all product tests**

Run: `node --test tests/talent-discovery/*.test.mjs`

Expected: all tests pass.

- [ ] **Step 2: Run syntax and whitespace checks**

Run: `node --check tests/talent-discovery/app.js && node --check tests/talent-discovery/glyph-renderer.js && git diff --check`

Expected: exit code 0 with no syntax or whitespace errors.

- [ ] **Step 3: Check page and asset responses through the local preview server**

Run: `curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8765/tests/talent-discovery/`

Expected: `200`; the existing local preview flow and asset paths remain available.
