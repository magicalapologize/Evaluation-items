# 「天赋挖掘测试｜找到你的天赋领域」实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Each task ends with a focused test cycle and a commit.

**Goal:** 在现有云渡测评实验室中新增一款以加德纳多元智能理论为框架的 40 题深度「天赋挖掘测试」，复用现有测试码、会员、历史记录和海报能力，并让「天赋职业评估」测试码也能授权进入新测试。

**Architecture:** 新建 `tests/talent-discovery/`，将题库、文案和结果字段放在独立 `data.mjs`，将计分、主辅天赋、活跃天赋、隐藏潜能和分布模拟放在独立 `model.mjs`，页面只负责流程和渲染。Worker 保持单一测试码 API，在服务端为 `talent-discovery` 配置 `talent-discovery` 与 `talent-career` 两个可用码来源；首页、职业评估页和新测试页只通过链接推荐，不复制真实码。

**Tech Stack:** 现有原生 HTML/CSS/JavaScript、Cloudflare Worker + D1、Node.js 内置 `node:test`、Canvas 海报、项目既有 `member-auth.js` / `test-history.js` / `history-replay.js`。

## Global Constraints

- 产品正式名称必须是「天赋挖掘测试｜找到你的天赋领域」。
- 页面维度统一使用「语言表达天赋、逻辑推演天赋、空间想象天赋、身体实践天赋、音乐节奏天赋、人际感知天赋、内在觉察天赋、自然观察天赋」，不可显示“语言智能”等理论原名作为用户维度标题。
- 结果名称直接写最佳天赋名称，不使用“某某者”式角色命名。
- 测试总题数为 40 道，每题 4 个选项，5 个场景各 8 题。
- 完成答题后直接显示完整报告，不增加付费解锁流程。
- 新产品 `productId` 固定为 `talent-discovery`；前端不得出现真实测试码、演示码或默认码。
- `talent-discovery` 验证必须接受新产品当前码和 `talent-career` 当前码；其他产品当前码不得进入新测试。
- 报告必须包含：最佳天赋评估、8 项天赋综合解读、4 项活跃天赋深入分析、隐藏天赋潜能、潜在发展瓶颈、优势职业赛道、天赋拓展策略、个人竞争力、进阶成长方案。
- 结果是相对倾向的自我观察，不写固定智力等级、诊断、准确率、权威认证或职业保证。
- 所有用户可见文案初稿完成后必须按 `humanizer-zh` 规则去除 AI 痕迹，再复核理论含义、计分含义和事实边界。
- 海报完整展示 8 项天赋，使用新产品独立二维码，不把网页截图缩小当海报。
- 目标验收尺寸为 `1440×900`、`1366×768`、`390×844`、`390×720`、`360×720`、`320×720`。

## File Map

| 文件 | 责任 |
|---|---|
| `tests/talent-discovery/data.mjs` | 八项天赋、40 道题、8 个最佳天赋结果的全部文案和职业赛道数据 |
| `tests/talent-discovery/model.mjs` | 计分、维度独立归一化、主辅天赋、活跃/待唤醒天赋、职业赛道排序、模拟分布 |
| `tests/talent-discovery/index.html` | 首页、答题、加载、完整报告、弹窗、脚本引用和 SEO 信息 |
| `tests/talent-discovery/style.css` | 新产品视觉、答题布局、报告布局、移动端断点和打印/海报预览样式 |
| `tests/talent-discovery/app.js` | 测试码验证、答题状态、结果渲染、历史快照、复制、海报和好评返现 |
| `tests/talent-discovery/data.test.mjs` | 题库、结果字段、文案去重与理论边界测试 |
| `tests/talent-discovery/model.test.mjs` | 计分稳定性、结果可达性、固定选项和 10 万份分布测试 |
| `tests/talent-discovery/ui-compat.test.mjs` | HTML/CSS/脚本契约和资源路径测试 |
| `tests/talent-discovery/assets/` | 若页面需要产品专用局部图片，放新产品自己的资源，不复用其他测试二维码 |
| `images/cards/talent-discovery.webp` | 首页轮播和测试卡片用 1:1 图片 |
| `images/talent-discovery-cover.svg` | 首页卡片或 OG 封面用视觉资源 |
| `assets/product-qrs/talent-discovery.png` | 新测试专用商品二维码 |
| `index.html` | 测试首页轮播卡和测试列表推荐入口 |
| `tests/talent-career/index.html` | 增加推荐「天赋挖掘测试」入口 |
| `worker.js` | 注册新 productId 和跨产品测试码授权查询 |
| `test/worker-results.test.mjs` 或新增 `test/worker-verify-code.test.mjs` | 验证 productId、测试码来源和跨产品隔离 |
| `scripts/validate-talent-discovery.mjs` | 发布前一键执行分布、固定模式、字段和海报前置检查 |

### Task 1: 建立数据模型契约与失败测试

**Files:**
- Create: `tests/talent-discovery/data.test.mjs`
- Create: `tests/talent-discovery/model.test.mjs`
- Create: `tests/talent-discovery/model.mjs`
- Create: `tests/talent-discovery/data.mjs`

**Interfaces:**
- `data.mjs` exports `DIMENSIONS`, `SCENES`, `QUESTIONS`, `RESULTS`, `CAREER_TRACKS`.
- `model.mjs` exports `calculateProfile(answerIndexes)`, `getSignalBounds()`, `getActiveTalents(profile)`, `getAwakeningTalent(profile)`, `rankCareerTracks(profile)`, `simulateDistribution(sampleCount, seed)`.
- `calculateProfile()` returns `{ raw, signals, displayScores, ranking, bestKey, supportKey, activeKeys, awakeningKey, result, careerTracks, fingerprint }`.

- [ ] **Step 1: Write the failing data contract tests.**

```js
test("天赋挖掘题库是40道四选项题、8项天赋和8个最佳天赋结果", () => {
  assert.equal(QUESTIONS.length, 40);
  assert.equal(DIMENSIONS.length, 8);
  assert.equal(RESULTS.length, 8);
  assert.deepEqual(SCENES.map((scene) => scene.questionCount), [8, 8, 8, 8, 8]);
  for (const question of QUESTIONS) {
    assert.ok(question.id && question.scene && question.text);
    assert.equal(question.options.length, 4);
    for (const option of question.options) {
      assert.ok(option.text);
      assert.deepEqual(Object.keys(option.scores).sort(), DIMENSIONS.map(({ key }) => key).sort());
    }
  }
});
```

- [ ] **Step 2: Write the failing model tests.**

```js
test("答案长度和索引无效时拒绝计算", () => {
  assert.throws(() => calculateProfile([]), /需要 40 个答案/);
  const answers = Array(40).fill(0);
  answers[7] = 4;
  assert.throws(() => calculateProfile(answers), /第 8 题答案无效/);
});

test("相同答案序列返回相同主辅天赋和画像", () => {
  const answers = Array.from({ length: 40 }, (_, index) => index % 4);
  assert.deepEqual(calculateProfile(answers), calculateProfile(answers));
});
```

- [ ] **Step 3: Run the focused tests and confirm they fail because the data/model contract is not implemented.**

Run: `node --test tests/talent-discovery/data.test.mjs tests/talent-discovery/model.test.mjs`

Expected: FAIL with missing module/export or incomplete fixture errors.

- [ ] **Step 4: Define the exact data schema before writing the full copy.**

Use this shape in `data.mjs`:

```js
const question = {
  id: "learn-01",
  scene: "学习与理解",
  text: "具体生活情境问题",
  options: [
    { text: "真实选择一", scores: { language: 3, logic: 0, spatial: 0, body: 0, music: 0, interpersonal: 0, introspection: 0, nature: 0 } },
    { text: "真实选择二", scores: { language: 0, logic: 2, spatial: 0, body: 0, music: 0, interpersonal: 0, introspection: 1, nature: 0 } },
    { text: "真实选择三", scores: { language: 0, logic: 0, spatial: 2, body: 0, music: 0, interpersonal: 0, introspection: 0, nature: 1 } },
    { text: "真实选择四", scores: { language: 0, logic: 0, spatial: 0, body: 1, music: 0, interpersonal: 0, introspection: 0, nature: 0 } }
  ]
};
```

Every option must contain all eight keys with numeric values; an option may have a main signal and one auxiliary signal, but must not score every dimension.

- [ ] **Step 5: Commit the contract tests and schema scaffold.**

```bash
git add tests/talent-discovery
git commit -m "test: define talent discovery data contract"
```

### Task 2: Author and humanize the 40-question bank and report copy

**Files:**
- Modify: `tests/talent-discovery/data.mjs`
- Modify: `tests/talent-discovery/data.test.mjs`
- Create: `docs/superpowers/reviews/2026-09-07-talent-discovery-copy-review.md`

**Interfaces:**
- `data.mjs` supplies the exact data contract from Task 1.
- Every `RESULTS` item has `bestTalent`, `summary`, `keywords`, `portrait`, `signals`, `strength`, `risk`, `activeTalentCopy`, `hiddenPotential`, `bottleneck`, `careerFit`, `expansionStrategy`, `competitiveEdge`, `growthPlan`, `advices`, and `reminder`.
- `activeTalentCopy` contains a distinct entry for each of the eight talent keys; the renderer chooses four keys at runtime.

- [ ] **Step 1: Write failing copy-quality tests.**

```js
test("八个结果包含深度报告所需字段且提醒独立", () => {
  const reminders = RESULTS.map((result) => result.reminder);
  assert.equal(new Set(reminders).size, RESULTS.length);
  for (const result of RESULTS) {
    assert.ok(result.bestTalent && result.summary && result.portrait);
    assert.ok(result.hiddenPotential && result.bottleneck && result.careerFit);
    assert.ok(result.expansionStrategy && result.competitiveEdge && result.growthPlan);
    assert.equal(result.keywords.length, 3);
    assert.equal(result.advices.length, 3);
    assert.deepEqual(Object.keys(result.activeTalentCopy).sort(), DIMENSIONS.map(({ key }) => key).sort());
  }
});

test("用户可见维度不使用智能或某某者命名", () => {
  const visible = [...DIMENSIONS.map((item) => item.name), ...RESULTS.map((item) => item.name)];
  assert.ok(visible.every((text) => !text.includes("智能")));
  assert.ok(visible.every((text) => !/者$/.test(text)));
});
```

- [ ] **Step 2: Write the 40 questions in five groups of eight.**

Use the groups `学习与理解`, `创作与表达`, `问题解决`, `关系与自我`, `日常环境与兴趣`. Each question must use a concrete situation and four reasonable choices. Keep question text at 40 Chinese characters or fewer and each option at 42 Chinese characters or fewer so the mobile answer cards remain stable.

- [ ] **Step 3: Assign semantic scores and validate coverage.**

Each dimension gets five primary observation questions across the five scenes. Use auxiliary scores sparingly, keep the option positions varied, and ensure all eight score keys exist on every option. Do not rotate scores by question index.

- [ ] **Step 4: Write eight result records and the 9-module report copy.**

For each best-talent result, write independently: best-talent explanation, eight-talent reading, active-talent copy, hidden-potential copy, bottleneck, career tracks, expansion strategy, competitive edge, growth plan, three scene-based actions, and one reminder containing a recognizable habit, a concrete cost, and a correction action.

- [ ] **Step 5: Run `humanizer-zh` on all user-facing copy and record the review.**

Check for filler openings, promotional claims, three-part slogans, excessive em dashes, “不仅……而且……”, vague authority, fixed-ability language, and repeated sentence rhythm. Preserve the theory disclaimer and every scoring signal. Record representative before/after examples and a 1–10 score for directness, rhythm, trust, authenticity, and concision in `docs/superpowers/reviews/2026-09-07-talent-discovery-copy-review.md`.

- [ ] **Step 6: Run the data tests and commit the finished copy.**

Run: `node --test tests/talent-discovery/data.test.mjs`

Expected: PASS with no duplicate question/option text, eight complete result records, eight unique reminders, and no forbidden visible labels.

```bash
git add tests/talent-discovery/data.mjs tests/talent-discovery/data.test.mjs docs/superpowers/reviews/2026-09-07-talent-discovery-copy-review.md
git commit -m "feat: add talent discovery question bank and report copy"
```

### Task 3: Implement the scoring model and distribution validator

**Files:**
- Modify: `tests/talent-discovery/model.mjs`
- Modify: `tests/talent-discovery/model.test.mjs`
- Create: `scripts/validate-talent-discovery.mjs`

**Interfaces:**
- `calculateProfile(answers)` returns `raw`, `signals`, `displayScores`, `ranking`, `bestKey`, `supportKey`, `activeKeys`, `awakeningKey`, `result`, `careerTracks`, and `fingerprint`.
- `getActiveTalents(profile)` returns exactly four dimension keys, sorted deterministically by display score and answer fingerprint.
- `getAwakeningTalent(profile)` returns one key that is not the best key and is selected from a low-signal but nonzero or cross-scene candidate.
- `rankCareerTracks(profile)` returns 3–5 track records with `name`, `fit`, `why`, and `tryAction`.
- `simulateDistribution(sampleCount, seed)` returns counts for all eight best-talent keys.

- [ ] **Step 1: Implement independent signal bounds and normalization.**

Compute each dimension’s attainable min/max from its own five primary questions. Keep matching values normalized for ranking separate from display values mapped to approximately `35–95`; never use display values to select the best talent.

- [ ] **Step 2: Implement main/support/active/awakening selection.**

Sort normalized dimensions by score, then use the stable answer fingerprint for ties. Active talents must include the top four dimensions after a cross-scene stability check; awakening must not duplicate best or support.

- [ ] **Step 3: Implement career-track matching.**

Use the best/support/active combination to rank the data-defined tracks. Return fit as a comparison aid, not a probability or promise, and carry each track’s concrete low-cost validation action into the result page.

- [ ] **Step 4: Add model tests for edge cases and distribution.**

```js
test("固定选项至少覆盖三种最佳天赋", () => {
  const keys = [0, 1, 2, 3].map((answer) => calculateProfile(Array(40).fill(answer)).bestKey);
  assert.ok(new Set(keys).size >= 3, keys.join(","));
});

test("十万份随机答卷覆盖八项天赋且单项不垄断", () => {
  const distribution = simulateDistribution(100000, 20260907);
  assert.deepEqual(Object.keys(distribution).sort(), DIMENSIONS.map(({ key }) => key).sort());
  for (const count of Object.values(distribution)) {
    const rate = count / 100000;
    assert.ok(rate >= 0.03 && rate <= 0.20, `命中率 ${rate} 超出范围`);
  }
});
```

- [ ] **Step 5: Run model tests and the release validator.**

Run: `node --test tests/talent-discovery/model.test.mjs`

Run: `node scripts/validate-talent-discovery.mjs`

Expected: PASS; output must include question count, dimension count, result count, fixed-choice best keys, signal bounds, and random distribution.

- [ ] **Step 6: Commit the model.**

```bash
git add tests/talent-discovery/model.mjs tests/talent-discovery/model.test.mjs scripts/validate-talent-discovery.mjs
git commit -m "feat: add talent discovery scoring model"
```

### Task 4: Add product assets and page scaffold

**Files:**
- Create: `tests/talent-discovery/index.html`
- Create: `tests/talent-discovery/style.css`
- Create: `tests/talent-discovery/app.js`
- Add externally generated: `images/cards/talent-discovery.webp`
- Add externally generated: `images/talent-discovery-cover.svg`
- Add product QR: `assets/product-qrs/talent-discovery.png`

**Interfaces:**
- The page uses `PRODUCT_ID = "talent-discovery"` in one place.
- The page imports `member-auth.js`, `test-history.js`, `history-replay.js`, `data.mjs`, and `model.mjs` using the project’s current browser-compatible loading pattern.
- Required DOM IDs include `home-screen`, `quiz-screen`, `loading-screen`, `result-screen`, `poster-modal`, `cashback-modal`, `start-btn`, `prev-btn`, `save-poster-btn`, `copy-result-btn`, `restart-btn`, `cashback-btn`, `radar-svg`, `dimension-list`, `active-talent-list`, `hidden-potential`, `career-track-list`, `growth-plan`, and `result-reminder`.

- [ ] **Step 1: Verify generated assets before adding page references.**

Check the user-generated files with `sips` and require: card `1:1`, cover `1:1` or existing SVG viewBox, QR readable as a QR image. Do not create a fake QR or put text into the generated artwork.

- [ ] **Step 2: Write the UI contract test before implementation.**

Assert that the HTML contains the product ID, eight-talent labels, all nine report module headings, the theory disclaimer, `/api/verify-code`, `product-qrs/talent-discovery.png`, and history replay initialization. Assert CSS contains the specified palette, mobile breakpoints, answer minimum height, and no shared hover/selected selector.

- [ ] **Step 3: Build the three-screen scaffold.**

Create the access home with title, 40/8/9 feature strip, code field, member state, and recommendation text. Create the quiz screen with group, progress, question, four options, previous button, and no duplicate footer on mobile. Create the result screen with the nine modules and existing action buttons.

- [ ] **Step 4: Run the UI contract test and commit the scaffold.**

Run: `node --test tests/talent-discovery/ui-compat.test.mjs`

Expected: PASS after the HTML/CSS/script references are complete.

```bash
git add tests/talent-discovery images/cards/talent-discovery.webp images/talent-discovery-cover.svg assets/product-qrs/talent-discovery.png
git commit -m "feat: scaffold talent discovery test page"
```

### Task 5: Implement quiz flow, member access, history, and complete report rendering

**Files:**
- Modify: `tests/talent-discovery/app.js`
- Modify: `tests/talent-discovery/index.html`
- Modify: `tests/talent-discovery/style.css`

**Interfaces:**
- `verifyAccessCode(code)` posts `{ productId: "talent-discovery", code }` to `/api/verify-code`.
- `renderQuestion()` renders the shuffled display order while storing original option indexes.
- `renderResult(profile)` fills every report module from `profile` and `RESULTS`, never assembling reminders from tags.
- `renderHistorySnapshot(snapshot)` supports `YunduHistoryReplay.init("talent-discovery", ...)`.

- [ ] **Step 1: Implement access-code and member flow.**

Reuse the existing `member-auth.js` contract. On code verification, disable the button and show a pending label, restore it on both success and failure, distinguish invalid code/network/service errors, and allow Enter to submit. Members skip the code verification while still using `talent-discovery` in history snapshots.

- [ ] **Step 2: Implement answer state and navigation.**

Store original option indexes in `state.answers`, randomize only display order, blur the clicked button, advance after selection, support previous-question editing, and clear the previous attempt on restart. The final answer calls `calculateProfile()` once and immediately transitions through the existing loading screen into the report.

- [ ] **Step 3: Render the report modules.**

Render best/support talent, eight dimension scores, four active talents, awakening talent, bottleneck, 3–5 career tracks, expansion strategy, competitive edge, growth plan, three actions, and the independent reminder. Use text nodes or safe DOM assignment for user-facing copy. Add the theory disclaimer near the report actions.

- [ ] **Step 4: Save and restore history snapshots.**

Persist `schemaVersion`, `attemptId`, `productId`, `productTitle`, answers, result, dimensions, active talents, awakening talent, career tracks, growth plan, and created date through the existing member result API. Replay a snapshot without recalculating from missing fields.

- [ ] **Step 5: Run UI tests and a local manual flow.**

Run: `node --test tests/talent-discovery/*.test.mjs`

Run: `node scripts/local-preview.mjs` and open `http://127.0.0.1:8765/tests/talent-discovery/`.

Manual checks: empty code, invalid code, member direct start, answer selection, previous edit, final report, restart, history replay, copy summary, and modal close/Esc.

- [ ] **Step 6: Commit the working quiz and report.**

```bash
git add tests/talent-discovery
git commit -m "feat: implement talent discovery quiz and report"
```

### Task 6: Implement Canvas poster and result actions

**Files:**
- Modify: `tests/talent-discovery/app.js`
- Modify: `tests/talent-discovery/index.html`
- Modify: `tests/talent-discovery/style.css`

**Interfaces:**
- `createPosterImage(profile)` is `async` and resolves a PNG data URL after `loadPosterImage()` completes for the result art and `assets/product-qrs/talent-discovery.png`.
- The poster contains identity, all eight scores, four active talents, three actions, theory boundary copy, and the product QR CTA.

- [ ] **Step 1: Add the poster contract test.**

Assert source contains `async function createPosterImage`, awaited image loading, `drawImage(qrImage, ...)`, `product-qrs/talent-discovery.png`, full dimension iteration, and a poster modal with a scrollable preview.

- [ ] **Step 2: Implement the four poster regions.**

Use a fixed high-resolution canvas width of about `1800px`, a stable long height, and the new palette. Use a 2×4 dimension layout. Wrap long Chinese text before drawing and reserve at least `180px` for the QR code.

- [ ] **Step 3: Verify an actual PNG, not only `toDataURL()`.**

Open the generated PNG and inspect that the identity is not crowded, all eight dimensions are present, the three actions are not clipped, CTA contrast is sufficient, and the QR code can be decoded.

- [ ] **Step 4: Run poster UI tests and commit.**

Run: `node --test tests/talent-discovery/ui-compat.test.mjs`

```bash
git add tests/talent-discovery
git commit -m "feat: add talent discovery report poster"
```

### Task 7: Add Worker authorization and recommendation entry points

**Files:**
- Modify: `worker.js`
- Create or modify: `test/worker-verify-code.test.mjs`
- Modify: `index.html`
- Modify: `tests/talent-career/index.html`
- Modify: `tests/talent-career/app.js` only if the recommendation must be injected by its existing render flow

**Interfaces:**
- `PRODUCT_IDS` includes `talent-discovery`.
- The verify-code handler accepts a product-specific list of code sources. For `talent-discovery`, it checks the current enabled row for `talent-discovery` or `talent-career`; for every existing product, it checks only its own row.

- [ ] **Step 1: Write Worker authorization tests.**

Use a minimal in-memory D1 double that recognizes the verify-code SQL and returns rows for configured product/code pairs. Cover: new code succeeds, talent-career code succeeds for new product, another product code fails, disabled source fails, unknown product fails, and response headers include `Cache-Control: no-store`.

- [ ] **Step 2: Implement the server-side source mapping.**

Keep the client payload unchanged: `{ productId, code }`. Bind the code once and the allowed product IDs as explicit SQL placeholders; do not interpolate user input into SQL. Keep `enabled = 1` in the query and do not use `valid_date` as automatic expiry.

- [ ] **Step 3: Add the homepage and career-page recommendation links.**

Add one new carousel/test card with the new card asset and link `tests/talent-discovery/`. Add a visually consistent, keyboard-accessible recommendation section to `tests/talent-career/index.html` linking to the new test. Do not alter the career test’s scoring or title.

- [ ] **Step 4: Run authorization and existing Worker tests.**

Run: `node --test test/worker-verify-code.test.mjs test/worker-results.test.mjs`

Expected: PASS, with all existing product result tests unchanged.

- [ ] **Step 5: Commit the integration.**

```bash
git add worker.js test/worker-verify-code.test.mjs index.html tests/talent-career/index.html tests/talent-career/app.js
git commit -m "feat: authorize talent discovery with career test codes"
```

### Task 8: Complete responsive, copy, model, and release verification

**Files:**
- Modify: `tests/talent-discovery/style.css`
- Modify: `tests/talent-discovery/app.js`
- Modify: `tests/talent-discovery/*.test.mjs`
- Modify: `scripts/validate-talent-discovery.mjs`
- Modify: `docs/superpowers/reviews/2026-09-07-talent-discovery-copy-review.md`

- [ ] **Step 1: Run all automated checks.**

Run:

```bash
node --test tests/talent-discovery/*.test.mjs test/worker-verify-code.test.mjs test/worker-results.test.mjs
node scripts/validate-talent-discovery.mjs
```

Expected: all tests pass; no reminder, result field, question, option, or dimension coverage failure.

- [ ] **Step 2: Run the required answer-pattern checks.**

Confirm all-A/all-B/all-C/all-D produce at least three different best talents, random simulation covers all eight, the same answer sequence is stable, and each best talent can produce a distinct support/active/awakening profile.

- [ ] **Step 3: Run the full local browser flow at every target viewport.**

Use the local preview server and inspect `1440×900`, `1366×768`, `390×844`, `390×720`, `360×720`, and `320×720`. Check `document.documentElement.scrollWidth <= window.innerWidth`, no console errors, no overlap, answer buttons at least 52px high on mobile, and scrollable poster/cashback modals.

- [ ] **Step 4: Verify real poster output and QR.**

Generate one poster for every best-talent result, inspect at least one full-size PNG per result family, confirm all eight dimensions and the correct product QR, and run a QR decoder against the saved PNG.

- [ ] **Step 5: Check source for credential leakage and wrong labels.**

Run:

```bash
rg -n "ACCESS_CODE|validCode|YF-[A-Z0-9-]+|天赋智能|语言智能|逻辑智能|者$" tests/talent-discovery worker.js index.html tests/talent-career
```

Expected: no real code/default code and no forbidden visible labels. The word “智能” may remain only inside the explicit theory disclaimer if needed, never as a dimension/result heading.

- [ ] **Step 6: Commit the verified release.**

```bash
git add tests/talent-discovery scripts/validate-talent-discovery.mjs docs/superpowers/reviews/2026-09-07-talent-discovery-copy-review.md worker.js index.html tests/talent-career
git commit -m "test: verify talent discovery release"
```

## Self-Review

- Spec coverage: product name, eight renamed talent dimensions, 40 questions, best/support model, nine result modules, humanizer review, separate assets, direct full-report flow, shared test-code authorization, recommendation links, history, poster, responsive targets, and distribution validation each have a task.
- No implementation task relies on a fixed test code or a vague “later” step.
- `calculateProfile()` is the only model entry point used by the page; `renderResult()` consumes its returned keys consistently.
- The Worker keeps `talent-discovery` history separate even when authorization comes from `talent-career`.
- The only external prerequisite is the user-generated image/QR files listed in Task 4; their required paths and dimensions are explicit.
- The plan intentionally excludes payment, post-test paywalls, diagnostic claims, standardization norms, and a new career database, matching the approved design scope.
