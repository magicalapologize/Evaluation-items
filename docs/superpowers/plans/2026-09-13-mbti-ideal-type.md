# MBTI 理想型测试 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在云渡测评实验室中上线一款 32 题的“MBTI 理想型测试”，测量用户在恋爱和长期亲密关系中偏好的伴侣 MBTI 原型，并接入现有测试码、会员、历史记录、分享海报和首页入口。

**Architecture:** 新建 `tests/mbti-ideal-type/`，将 32 题、16 种结果和关系解析放在 `data.mjs`，将四轴计分、平分规则和分布模拟放在 `model.mjs`，由 `app.js` 负责答题、会员/测试码、报告、历史快照、复制与 Canvas 海报。Worker 只新增一个独立 `productId`，D1 继续复用 `daily_codes`，不共享任何现有产品测试码。

**Tech Stack:** 原生 HTML/CSS/JavaScript ES Modules、Cloudflare Worker + D1、Node.js 内置 `node:test`、Canvas、现有 `member-auth.js`、`test-history.js` 与 `history-replay.js`。

## Global Constraints

- 产品正式名称为“MBTI 理想型测试”，测试对象限定为恋爱和长期亲密关系中的理想伴侣偏好。
- `productId` 固定为 `mbti-ideal-type`，入口固定为 `/tests/mbti-ideal-type/`。
- 不测用户本人的 MBTI，不声称官方 MBTI® 认证，不做心理诊断、能力评级、最佳配对或关系成功承诺。
- 共 32 道题，E/I、S/N、T/F、J/P 四轴各 8 道；每题 4 个同样合理的选项，按同一轴的 `-2/-1/+1/+2` 语义计分，并打散显示位置。
- 每个关系阶段 8 题，共四阶段；每个阶段四轴各出现 2 题。
- 结果为 16 种 MBTI 类型；每种均有独立关系解析、3 条建议和唯一提醒，不能通过替换类型名称拼接文案。
- 每轴平分必须按“明显偏好次数 → 锚定题 → 答案指纹”稳定处理，不能依赖数组顺序或随机数；平分状态仍显示“偏好接近均衡”。
- 测试码只能通过 `POST /api/verify-code` 查询 D1；前端、页面资源、测试和文档以外的源代码均不得写入真实码。
- 新产品必须使用独立首页卡片图和产品二维码；二维码必须绘制进 Canvas 海报。
- 目标验收尺寸为 `1440×900`、`1366×768`、`390×844`、`390×720`、`360×720`、`320×720`。
- 保留当前用户未提交的 `tests/talent-discovery/` 改动，不纳入本次任务。

## File Map

| 文件 | 责任 |
|---|---|
| `tests/mbti-ideal-type/data.mjs` | 四条轴、四个关系阶段、32 道题与 16 种结果完整文案 |
| `tests/mbti-ideal-type/model.mjs` | 四轴累积、显著偏好、锚定题、指纹决胜、展示刻度和随机分布 |
| `tests/mbti-ideal-type/data.test.mjs` | 题量/覆盖、结果字段、提醒唯一性和文案边界 |
| `tests/mbti-ideal-type/model.test.mjs` | 计分、平分、可达性、固定模式和十万份分布 |
| `tests/mbti-ideal-type/index.html` | 首页、答题、加载、报告、弹窗、SEO 和脚本引用 |
| `tests/mbti-ideal-type/style.css` | 产品视觉、响应式、结果区和弹窗布局 |
| `tests/mbti-ideal-type/app.js` | 授权、答题状态、报告/历史/海报/复制/返现交互 |
| `tests/mbti-ideal-type/ui-compat.test.mjs` | 页面 DOM、资源路径、响应式和海报代码契约 |
| `scripts/validate-mbti-ideal-type.mjs` | 发布前题库、结果、固定答案与随机分布检查 |
| `images/cards/mbti-ideal-type.webp` | 首页轮播和测试网格的 1:1 卡片 |
| `assets/product-qrs/mbti-ideal-type.png` | MBTI 产品专用、可扫描的商品二维码 |
| `index.html` | 热门测评和全部测评的第 13 个入口 |
| `worker.js` | 新 `productId` 的 D1 授权白名单 |
| `test/worker-verify-code.test.mjs` | 新产品测试码、跨产品隔离和缓存响应测试 |
| `05.我的产品/虚拟产品/测试码更新/手动换码备用测试码.md` | 产品映射、独立备用码批次、D1 SQL 与换码记录 |

### Task 1: Define the MBTI data contract and failing tests

**Files:**
- Create: `tests/mbti-ideal-type/data.mjs`
- Create: `tests/mbti-ideal-type/model.mjs`
- Create: `tests/mbti-ideal-type/data.test.mjs`
- Create: `tests/mbti-ideal-type/model.test.mjs`

**Interfaces:**
- `data.mjs` exports `AXES`, `RELATIONSHIP_STAGES`, `QUESTIONS`, `RESULTS`, `DISCLAIMER`.
- `AXES` has four records with `{ key, left, right, leftLabel, rightLabel, anchorQuestionIds }` for `ei`, `sn`, `tf`, `jp`.
- A question has `{ id, stage, axis, text, options }`; each option has `{ text, score, intensity }`, where `score` is one of `-2`, `-1`, `1`, `2` and `intensity` is `1` or `2`.
- `model.mjs` exports `calculateIdealType(answerIndexes)`, `resolveAxis(axis, answers)`, `simulateDistribution(sampleCount, seed)`, `getAxisQuestionCounts()`.
- `calculateIdealType()` returns `{ code, result, axisProfiles, fingerprint }`; an `axisProfiles` record has `{ key, direction, rawScore, strongCount, status, displayValue, label }`.

- [ ] **Step 1: Write the failing data contract tests.**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { AXES, QUESTIONS, RELATIONSHIP_STAGES, RESULTS } from "./data.mjs";

test("题库包含32道四选项题，四轴和四阶段均衡覆盖", () => {
  assert.equal(AXES.length, 4);
  assert.equal(RELATIONSHIP_STAGES.length, 4);
  assert.equal(QUESTIONS.length, 32);
  assert.equal(RESULTS.length, 16);
  for (const axis of AXES) assert.equal(QUESTIONS.filter((question) => question.axis === axis.key).length, 8);
  for (const stage of RELATIONSHIP_STAGES) assert.equal(QUESTIONS.filter((question) => question.stage === stage.key).length, 8);
  for (const question of QUESTIONS) {
    assert.equal(question.options.length, 4);
    assert.deepEqual(question.options.map((option) => option.score).sort((a, b) => a - b), [-2, -1, 1, 2]);
  }
});

test("每种结果具有独立的完整关系报告字段", () => {
  const reminders = RESULTS.map((result) => result.reminder);
  assert.equal(new Set(reminders).size, 16);
  for (const result of RESULTS) {
    assert.match(result.code, /^[EI][SN][TF][JP]$/);
    assert.equal(result.tags.length, 3);
    assert.equal(result.advices.length, 3);
    for (const field of ["name", "summary", "attraction", "security", "strength", "friction", "communication", "rhythm", "reminder"]) assert.ok(result[field], `${result.code} 缺少 ${field}`);
  }
});
```

- [ ] **Step 2: Write the failing model contract tests.**

```js
import { calculateIdealType, getAxisQuestionCounts } from "./model.mjs";

test("非法答案长度和索引不可计算", () => {
  assert.throws(() => calculateIdealType([]), /需要 32 个答案/);
  const answers = Array(32).fill(0);
  answers[3] = 4;
  assert.throws(() => calculateIdealType(answers), /第 4 题答案无效/);
});

test("模型的四轴题量与题库一致", () => {
  assert.deepEqual(getAxisQuestionCounts(), { ei: 8, sn: 8, tf: 8, jp: 8 });
});
```

- [ ] **Step 3: Run the focused tests to verify they fail.**

Run: `node --test tests/mbti-ideal-type/data.test.mjs tests/mbti-ideal-type/model.test.mjs`

Expected: FAIL because the data/model modules do not exist.

- [ ] **Step 4: Create the minimal export scaffold.**

Use the exact product vocabulary and shape below. Do not add question text or production copy in this step.

```js
export const AXES = [
  { key: "ei", left: "E", right: "I", leftLabel: "通过互动补充能量", rightLabel: "通过独处恢复能量", anchorQuestionIds: ["ei-07", "ei-08"] },
  { key: "sn", left: "S", right: "N", leftLabel: "重视具体经验", rightLabel: "重视可能性与意义", anchorQuestionIds: ["sn-07", "sn-08"] },
  { key: "tf", left: "T", right: "F", leftLabel: "优先分析原则", rightLabel: "优先照顾感受与价值", anchorQuestionIds: ["tf-07", "tf-08"] },
  { key: "jp", left: "J", right: "P", leftLabel: "偏好明确计划", rightLabel: "偏好保留弹性", anchorQuestionIds: ["jp-07", "jp-08"] }
];
export const RELATIONSHIP_STAGES = [
  { key: "start", name: "初识与相处启动" },
  { key: "daily", name: "日常互动与陪伴" },
  { key: "conflict", name: "冲突、支持与决策" },
  { key: "future", name: "长期规划与生活方式" }
];
export const QUESTIONS = [];
export const RESULTS = [];
export const DISCLAIMER = "本测试用于恋爱与长期关系中的偏好探索，不构成官方 MBTI 测评、心理诊断或关系成功保证。";
```

- [ ] **Step 5: Run tests and commit the contracts.**

Run: `node --test tests/mbti-ideal-type/data.test.mjs tests/mbti-ideal-type/model.test.mjs`

Expected: the import succeeds, then the tests fail only on intentional empty data assertions.

```bash
git add tests/mbti-ideal-type
git commit -m "test: define MBTI ideal type data contracts"
```

### Task 2: Author the balanced 32-question relationship preference bank

**Files:**
- Modify: `tests/mbti-ideal-type/data.mjs`
- Modify: `tests/mbti-ideal-type/data.test.mjs`

**Interfaces:**
- `QUESTIONS` must be an ordered 32-record array matching the Task 1 schema.
- Question IDs use `ei-01` through `ei-08`, then `sn`, `tf`, and `jp`; their array order alternates axes within each relationship stage.
- Each stage contains exactly two questions for each axis.

- [ ] **Step 1: Add a failing stage-by-axis coverage test.**

```js
test("每个关系阶段均含四轴各两题", () => {
  for (const stage of RELATIONSHIP_STAGES) {
    for (const axis of AXES) {
      const count = QUESTIONS.filter((question) => question.stage === stage.key && question.axis === axis.key).length;
      assert.equal(count, 2, `${stage.key}/${axis.key} 应为两题`);
    }
  }
});

test("题目没有固定选项字母对应同一偏好方向", () => {
  for (const axis of AXES) {
    const questions = QUESTIONS.filter((question) => question.axis === axis.key);
    const leftPositions = questions.flatMap((question) => question.options.map((option, index) => option.score < 0 ? index : -1).filter((index) => index >= 0));
    assert.ok(new Set(leftPositions).size >= 3, `${axis.key} 的左侧偏好位置过于固定`);
  }
});
```

- [ ] **Step 2: Write all 32 questions in the prescribed stage order.**

For every stage, add this axis order: `ei`, `sn`, `tf`, `jp`, `ei`, `sn`, `tf`, `jp`. Use these topic boundaries:

| 阶段 | E/I | S/N | T/F | J/P |
|---|---|---|---|---|
| 初识与相处启动 | 首次见面后的恢复、参与朋友聚会 | 聊天关注具体经历、讨论未来 | 给建议时先拆问题、先接住情绪 | 约会安排、临时邀请 |
| 日常互动与陪伴 | 分享频率、各自独处 | 纪念日表达、旅行体验 | 日常分工、低落时支持 | 周末节奏、家务安排 |
| 冲突、支持与决策 | 冲突后沟通间隔、共同面对压力 | 争执复盘事实、理解背后动机 | 判断谁对谁错、处理伤害 | 问题处理步骤、计划被打断 |
| 长期规划与生活方式 | 家庭社交频率、共同成长方式 | 买房/迁居的考虑、人生愿景 | 金钱和大决定、原则与关怀 | 长期目标、生活变动 |

Each question has four viable answers for the same desired-partner feature, mapped exactly to `-2/-1/+1/+2`. Keep question text under 42 Chinese characters and option text under 52 Chinese characters.

- [ ] **Step 3: Use a small construction helper that preserves explicit scores.**

```js
function makeQuestion(id, stage, axis, text, options) {
  const normalized = options.map(({ text: optionText, score }) => ({ text: optionText, score, intensity: Math.abs(score) }));
  if (normalized.length !== 4 || ![-2, -1, 1, 2].every((score) => normalized.some((option) => option.score === score))) throw new Error(`${id} 必须包含 -2/-1/+1/+2`);
  return { id, stage, axis, text, options: normalized };
}
```

The helper validates only the explicit source data. It must not rotate options based on question index; author each displayed order intentionally.

- [ ] **Step 4: Check question quality before accepting the data.**

Run: `node --test tests/mbti-ideal-type/data.test.mjs`

Expected: PASS for 32 questions, 4 stages, 4 axes, 8 questions per axis, 2 questions per axis per stage, and varied option positions.

Run: `rg -n "最好|应该|正确|成熟|正常|冷漠|控制欲|不负责任" tests/mbti-ideal-type/data.mjs`

Expected: any occurrence must be inspected and removed unless it appears in a neutral explanatory boundary sentence; no question option may frame a preference as morally superior.

- [ ] **Step 5: Commit the question bank.**

```bash
git add tests/mbti-ideal-type/data.mjs tests/mbti-ideal-type/data.test.mjs
git commit -m "feat: add MBTI ideal type relationship question bank"
```

### Task 3: Write the 16 independent relationship reports

**Files:**
- Modify: `tests/mbti-ideal-type/data.mjs`
- Modify: `tests/mbti-ideal-type/data.test.mjs`

**Interfaces:**
- Each result object has `{ code, name, tags, summary, axisReading, attraction, security, strength, friction, communication, rhythm, advices, reminder }`.
- `axisReading` has exactly `ei`, `sn`, `tf`, `jp`; each value explains the ideal partner’s indicated preference in relationship language.
- `advices` is an array of exactly 3 records `{ title, trigger, action, boundary }`.

- [ ] **Step 1: Add failing result-detail tests.**

```js
test("十六种结果覆盖全部MBTI代码并具有独立四轴解释", () => {
  const expected = ["ISTJ", "ISFJ", "INFJ", "INTJ", "ISTP", "ISFP", "INFP", "INTP", "ESTP", "ESFP", "ENFP", "ENTP", "ESTJ", "ESFJ", "ENFJ", "ENTJ"];
  assert.deepEqual(RESULTS.map((result) => result.code).sort(), expected.sort());
  for (const result of RESULTS) {
    assert.deepEqual(Object.keys(result.axisReading).sort(), ["ei", "jp", "sn", "tf"]);
    for (const advice of result.advices) assert.ok(advice.trigger && advice.action && advice.boundary);
  }
});

test("结果不把理想型描述成保证匹配或真实类型判断", () => {
  const copy = JSON.stringify(RESULTS);
  assert.doesNotMatch(copy, /天生一对|绝对适合|注定|保证|真实MBTI|最配/);
});
```

- [ ] **Step 2: Add all 16 result records explicitly.**

Keep result ordering identical to the expected codes in Step 1. Use neutral, relationship-specific names such as “稳定执行型理想伴侣”“温柔秩序型理想伴侣” only when the name accurately reflects the code; the visible MBTI code remains the primary identity.

Each report must distinguish the four functions:

- `attraction`: why this user preference may feel appealing.
- `security`: what predictable relationship experience it may offer.
- `strength`: what can work well in long-term co-operation.
- `friction`: when the same preference can create distance or misunderstanding.

Write `communication` as a concrete method, not a label. Example structure: “发生分歧时，先……；确认……后，再……；避免在……时要求立即回应。”

- [ ] **Step 3: Write the 48 scene-based action records and 16 unique reminders.**

Each `advices` item must cover a different situation: relationship initiation/daily rhythm, conflict/support, and long-term decision. Each `reminder` must name one likely overused preference, one cost, and one correction action. Do not inherit or generate reminders from the four letters.

- [ ] **Step 4: Run the user-facing copy review and tests.**

Run: `node --test tests/mbti-ideal-type/data.test.mjs`

Expected: PASS for 16 codes, 16 unique reminders, four axis readings per result, 48 complete action records, and no prohibited certainty claims.

Review all visible copy for the following and correct it in place: ungrounded authority, diagnostic terms, generic emotional slogans, “首先/其次/最后” structure, and overly similar sentence rhythms. Preserve the MBTI four-axis meaning and the disclaimer.

- [ ] **Step 5: Commit result data.**

```bash
git add tests/mbti-ideal-type/data.mjs tests/mbti-ideal-type/data.test.mjs
git commit -m "feat: add MBTI ideal type relationship reports"
```

### Task 4: Implement deterministic four-axis scoring and release validator

**Files:**
- Modify: `tests/mbti-ideal-type/model.mjs`
- Modify: `tests/mbti-ideal-type/model.test.mjs`
- Create: `scripts/validate-mbti-ideal-type.mjs`

**Interfaces:**
- `resolveAxis(axis, answers)` returns `{ direction, rawScore, strongCount, status, displayValue, label, tieBreak }`.
- `calculateIdealType(answers)` uses `resolveAxis()` once for each axis and returns the result object whose `code` matches its letters.
- `simulateDistribution(sampleCount = 100000, seed = 20260913)` returns all 16 code counters.
- `getAxisQuestionCounts()` returns `{ ei: 8, sn: 8, tf: 8, jp: 8 }`.

- [ ] **Step 1: Add failing scoring and tie-break tests.**

```js
import { AXES, QUESTIONS } from "./data.mjs";
import { calculateIdealType, resolveAxis, simulateDistribution } from "./model.mjs";

function answersFor(axisKey, score) {
  return QUESTIONS.map((question) => question.axis === axisKey ? question.options.findIndex((option) => option.score === score) : question.options.findIndex((option) => option.score === -1));
}

test("每条轴按语义分数形成可解释方向", () => {
  for (const axis of AXES) {
    assert.equal(resolveAxis(axis, answersFor(axis.key, -2)).direction, axis.left);
    assert.equal(resolveAxis(axis, answersFor(axis.key, 2)).direction, axis.right);
  }
});

test("完全相同答案序列的平分结果稳定", () => {
  const answers = QUESTIONS.map((question) => question.options.findIndex((option) => option.score === -1 || option.score === 1));
  assert.deepEqual(calculateIdealType(answers), calculateIdealType(answers));
});
```

- [ ] **Step 2: Implement semantic score aggregation.**

For each axis, collect only questions whose `axis` matches. Sum `option.score`; count a strong answer when `Math.abs(option.score) === 2`. Determine direction by raw score first. Map values to display ranges with a function independent of direction selection:

```js
function getDisplayValue(rawScore) {
  const strength = Math.min(1, Math.abs(rawScore) / 16);
  return Math.round(50 + strength * 45);
}
```

Use `status` values exactly: `"明显偏好"` for `abs(rawScore) >= 8`, `"温和偏好"` for `abs(rawScore) >= 3`, and `"偏好接近均衡"` otherwise.

- [ ] **Step 3: Implement the required tie-break chain.**

```js
function resolveDirection(axis, answers, rawScore, strongCount) {
  if (rawScore < 0) return axis.left;
  if (rawScore > 0) return axis.right;
  const strongBalance = strongCount.left - strongCount.right;
  if (strongBalance < 0) return axis.left;
  if (strongBalance > 0) return axis.right;
  const anchorSum = axis.anchorQuestionIds.reduce((sum, id) => sum + selectedScore(id, answers), 0);
  if (anchorSum < 0) return axis.left;
  if (anchorSum > 0) return axis.right;
  return deterministicBit(answers, axis.key) === 0 ? axis.left : axis.right;
}
```

`selectedScore()` must resolve the actual question by ID. `deterministicBit()` must hash the answer indexes plus `axis.key`; it must not use `Math.random()`, time, or object/array order.

- [ ] **Step 4: Add full reachability and distribution tests.**

```js
test("固定模式至少产生三种不同类型", () => {
  const codes = [0, 1, 2, 3].map((answer) => calculateIdealType(Array(32).fill(answer)).code);
  assert.ok(new Set(codes).size >= 3, codes.join(","));
});

test("十万份随机答卷覆盖十六型且单型命中率在范围内", () => {
  const counts = simulateDistribution(100000, 20260913);
  assert.equal(Object.keys(counts).length, 16);
  for (const [code, count] of Object.entries(counts)) {
    const rate = count / 100000;
    assert.ok(rate >= 0.03 && rate <= 0.15, `${code}: ${rate}`);
  }
});
```

- [ ] **Step 5: Implement the standalone release validator.**

The script imports the product data/model, checks counts and unique reminders, prints all-A/B/C/D results, runs `simulateDistribution(100000)`, exits nonzero when a type is missing or its rate is outside `3%-15%`, and prints each axis’ question count.

- [ ] **Step 6: Run tests, validator, and commit.**

Run:

```bash
node --test tests/mbti-ideal-type/model.test.mjs
node scripts/validate-mbti-ideal-type.mjs
```

Expected: PASS; output contains four 8-question axes, 16 distinct result codes, fixed-pattern codes, and 100,000-answer distribution.

```bash
git add tests/mbti-ideal-type/model.mjs tests/mbti-ideal-type/model.test.mjs scripts/validate-mbti-ideal-type.mjs
git commit -m "feat: add MBTI ideal type scoring model"
```

### Task 5: Add product assets and page shell

**Files:**
- Create: `tests/mbti-ideal-type/index.html`
- Create: `tests/mbti-ideal-type/style.css`
- Create: `tests/mbti-ideal-type/app.js`
- Create: `tests/mbti-ideal-type/ui-compat.test.mjs`
- Add externally prepared: `images/cards/mbti-ideal-type.webp`
- Add externally prepared: `assets/product-qrs/mbti-ideal-type.png`

**Interfaces:**
- `index.html` declares `<meta name="yundu-product-id" content="mbti-ideal-type">` and includes `member-auth.js`, `test-history.js`, `history-replay.js`, `test-backdoor.js`, and `app.js`.
- Required IDs: `home-screen`, `quiz-screen`, `loading-screen`, `result-screen`, `access-code`, `start-btn`, `prev-btn`, `answer-list`, `result-code`, `axis-list`, `advice-list`, `reminder`, `save-poster-btn`, `copy-btn`, `restart-btn`, `cashback-btn`, `poster-modal`, `cashback-modal`.
- `app.js` exports `createPosterImage(profile)` for source-level test inspection and attaches UI listeners after DOM load.

- [ ] **Step 1: Prepare and verify product-specific image assets.**

Before adding references, create/select a 1:1 card that communicates “MBTI 理想型 / 恋爱偏好” without copying the reference screenshots. Create a real QR image that points to this product’s current delivery/entry destination. Then verify:

```bash
sips -g pixelWidth -g pixelHeight images/cards/mbti-ideal-type.webp
sips -g pixelWidth -g pixelHeight assets/product-qrs/mbti-ideal-type.png
```

Expected: card width equals height; QR has nonzero square dimensions and decodes to the intended product destination. Do not add an imitation or placeholder QR.

- [ ] **Step 2: Write the failing UI contract test.**

```js
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const html = fs.readFileSync(new URL("./index.html", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("./style.css", import.meta.url), "utf8");
const app = fs.readFileSync(new URL("./app.js", import.meta.url), "utf8");

test("页面具备授权、答题、四轴报告和操作区契约", () => {
  for (const id of ["home-screen", "quiz-screen", "loading-screen", "result-screen", "access-code", "axis-list", "advice-list", "reminder", "poster-modal", "cashback-modal"]) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /mbti-ideal-type/);
  assert.match(html, /\/api\/verify-code/);
  assert.match(html, /product-qrs\/mbti-ideal-type\.png/);
  assert.match(html, /本测试用于恋爱与长期关系中的偏好探索/);
  assert.match(app, /async function createPosterImage/);
});

test("移动端答案和弹窗有稳定约束", () => {
  assert.match(css, /min-height:\s*52px/);
  assert.match(css, /@media/);
  assert.match(css, /overflow-y:\s*auto/);
});
```

- [ ] **Step 3: Build the access, quiz, loading and report shell.**

Homepage wording must state “32 道亲密关系情境题”“4 条 MBTI 偏好轴”“约 6 分钟”，并在测试码说明附近显示 `DISCLAIMER`。答题页显示当前阶段、题号和进度，使用四个选项和返回修改按钮。结果页先固定四轴区，再放置类型画像、吸引原因、安全感、优势、摩擦、沟通、节奏、建议、提醒和四个现有操作按钮。

- [ ] **Step 4: Implement mobile-first layout constraints.**

At `390×720` and `320×720`, answer cards must remain at least `52px` high with `8px` gaps, and the screen must show all choices plus the previous button without duplicate instructions. Use fixed grid columns/rows for the four axis cards so labels cannot resize the layout.

- [ ] **Step 5: Run contract tests and commit the shell.**

Run: `node --test tests/mbti-ideal-type/ui-compat.test.mjs`

Expected: PASS after all required DOM, asset and CSS hooks exist.

```bash
git add tests/mbti-ideal-type images/cards/mbti-ideal-type.webp assets/product-qrs/mbti-ideal-type.png
git commit -m "feat: scaffold MBTI ideal type test page"
```

### Task 6: Implement access, quiz state, report, and history replay

**Files:**
- Modify: `tests/mbti-ideal-type/app.js`
- Modify: `tests/mbti-ideal-type/index.html`
- Modify: `tests/mbti-ideal-type/style.css`

**Interfaces:**
- `verifyAccessCode(code)` sends `{ productId: "mbti-ideal-type", code }` to `/api/verify-code`.
- `renderQuestion()` stores original option indexes in `state.answers` even when display order is shuffled.
- `renderResult(profile)` fills the report from `profile.result` and its `axisProfiles`, without creating copy from MBTI letters at runtime.
- `buildSnapshot(profile)` returns a history snapshot accepted by the existing Worker result API.

- [ ] **Step 1: Implement code and member access.**

Reuse `YunduMember.getMember()` and the current gate UI conventions. When a member is active, permit direct start and replace the start label; otherwise validate a nonempty code by calling `verifyAccessCode()`. During requests, disable the start button; on errors restore it and show the returned invalid-code, network, or service error. Allow Enter from the input to submit.

- [ ] **Step 2: Implement answer navigation and stable scoring.**

Keep `state = { index: 0, answers: [], profile: null, timers: [], posterUrl: "", historyAttemptId: null }`. On answer selection save its original index, render the chosen state, then automatically advance. The previous button changes only `index`; it never loses an existing answer. On final selection call `calculateIdealType(state.answers)` exactly once before rendering the loading and result stages. Restart clears state and revokes a previous poster object URL.

- [ ] **Step 3: Render the complete report.**

Render code/name/tags, each axis’s `label`, `status` and `displayValue`, then the explicit `attraction`, `security`, `strength`, `friction`, `communication`, `rhythm`, three advice records and `reminder`. Put the disclaimer under the actions. Use `textContent` for result copy and create DOM nodes for advice items; do not set user-visible report copy using unsanitized `innerHTML`.

- [ ] **Step 4: Implement snapshots and replay.**

Use schema version `1` and include at minimum:

```js
{
  schemaVersion: 1,
  attemptId,
  productId: "mbti-ideal-type",
  productTitle: "MBTI 理想型测试",
  result: { name: profile.result.code, image: "" },
  tags: profile.result.tags,
  overview: [profile.result.summary],
  dimensions: profile.axisProfiles.map(({ label, displayValue }) => ({ name: label, value: displayValue })),
  sections: [{ title: "理想伴侣画像", content: profile.result.attraction }],
  answers: state.answers,
  createdAt: new Date().toISOString()
}
```

Initialize `YunduHistoryReplay` for this product. During replay, rebuild a profile from saved answers when present; otherwise render saved snapshot fields without accessing omitted dynamic data.

- [ ] **Step 5: Run focused tests and a complete local flow.**

Run:

```bash
node --test tests/mbti-ideal-type/data.test.mjs tests/mbti-ideal-type/model.test.mjs tests/mbti-ideal-type/ui-compat.test.mjs
node scripts/local-preview.mjs
```

Open `http://127.0.0.1:8765/tests/mbti-ideal-type/`. Check local code entry, member direct entry, all 32 questions, previous-question edit, result changes, restart, copy result, history replay, and both modal close buttons.

- [ ] **Step 6: Commit working product flow.**

```bash
git add tests/mbti-ideal-type
git commit -m "feat: implement MBTI ideal type quiz and report"
```

### Task 7: Implement the independent Canvas share poster

**Files:**
- Modify: `tests/mbti-ideal-type/app.js`
- Modify: `tests/mbti-ideal-type/index.html`
- Modify: `tests/mbti-ideal-type/style.css`
- Modify: `tests/mbti-ideal-type/ui-compat.test.mjs`

**Interfaces:**
- `async function createPosterImage(profile)` returns an image data URL only after `loadPosterImage("../../assets/product-qrs/mbti-ideal-type.png")` resolves.
- The result page assigns that URL to `#poster-image` only after the canvas is complete.

- [ ] **Step 1: Extend the UI contract test for poster behavior.**

```js
test("分享海报等待二维码并绘制完整四轴和CTA", () => {
  assert.match(app, /async function createPosterImage/);
  assert.match(app, /await loadPosterImage\("\.\.\/\.\.\/assets\/product-qrs\/mbti-ideal-type\.png"\)/);
  assert.match(app, /drawImage\(qrImage/);
  assert.match(app, /axisProfiles\.forEach/);
  assert.match(html, /id="poster-image"/);
});
```

- [ ] **Step 2: Implement the four fixed poster regions.**

Use a roughly `1800px` canvas width and a fixed long composition. Draw: identity (brand/type/name/tags), a `2×2` axis grid (four directions + clarity), relationship reading (summary and three actions), and a CTA card containing the product QR, “长按识别二维码” and a product-specific invitation. Wrap Chinese text using a bounded line utility; reserve a final QR width and height of at least `180px` in the generated PNG.

- [ ] **Step 3: Add save and modal behavior.**

The Save Report button opens a scrollable modal, shows a temporary generating status, then assigns the real PNG to the image. Close buttons and Escape revoke object URLs when appropriate. The QR must not be used for the cashback modal, which continues using `assets/images/wechat-qr.webp`.

- [ ] **Step 4: Validate actual poster output.**

Generate one poster from a constructed profile for each of the 16 codes. Open representative PNGs and verify all four axes, long advice text, the independent CTA and QR. Decode at least one QR from an exported image. Record and fix any clipping before proceeding.

- [ ] **Step 5: Run tests and commit.**

Run: `node --test tests/mbti-ideal-type/ui-compat.test.mjs`

```bash
git add tests/mbti-ideal-type
git commit -m "feat: add MBTI ideal type share poster"
```

### Task 8: Integrate the Worker, homepage, backup codes, and remote D1

**Files:**
- Modify: `worker.js`
- Modify: `test/worker-verify-code.test.mjs`
- Modify: `index.html`
- Modify: `README.md`
- Modify: `../../../../测试码更新/手动换码备用测试码.md`

**Interfaces:**
- `PRODUCT_IDS` contains `"mbti-ideal-type"` exactly once.
- `verifyCode()` authorizes this product only against its own `daily_codes.product_id` row.
- Homepage card targets `tests/mbti-ideal-type/` in both the carousel and mini-grid.

- [ ] **Step 1: Add failing Worker tests for the new product.**

Add to the existing D1 double test suite:

```js
test("MBTI理想型码只可进入自身产品", async () => {
  const env = mockEnv({ "mbti-ideal-type": { code: "MB-TEST-ONLY", enabled: 1 } });
  const success = await worker.fetch(requestFor({ productId: "mbti-ideal-type", code: "MB-TEST-ONLY" }), env);
  assert.equal(success.status, 200);
  const cross = await worker.fetch(requestFor({ productId: "love-personality", code: "MB-TEST-ONLY" }), env);
  assert.equal(cross.status, 403);
});
```

The fixture code stays in the test file only and must never be copied into production HTML/JS.

- [ ] **Step 2: Register the product in the Worker.**

Append `"mbti-ideal-type"` to the `PRODUCT_IDS` set in `worker.js`. Do not add special code sharing: `acceptedProducts` must resolve to only `["mbti-ideal-type"]` for this product. Retain the existing normalized code query, `enabled = 1` condition, and `Cache-Control: no-store` response behavior.

- [ ] **Step 3: Add homepage entries and update project inventory.**

In the carousel, add a card linking to `tests/mbti-ideal-type/` with `images/cards/mbti-ideal-type.webp`, title “MBTI 理想型测试”, label “亲密关系 · 理想伴侣偏好”, and `32题 · 16种结果`. Add the corresponding mini-grid card using `EVA/013`, `32 道题`, `约 6 分钟`, `16 种结果`. Update “12 项开放测试” and its corresponding metric/count text to 13, and add the product to `README.md` current tests list.

- [ ] **Step 4: Add independent test codes to the backup-code document.**

In [手动换码备用测试码.md](/Users/yunfan/ObsidianVaults/MyVault/05.我的产品/虚拟产品/测试码更新/手动换码备用测试码.md):

1. Add `mbti-ideal-type | MBTI 理想型测试 | https://magicassess.top/tests/mbti-ideal-type/` to the product mapping table.
2. Add a separate `### MBTI 理想型测试独立码` table with five distinct `MB-XXXX-XXXX` codes, first row marked “待启用 / 首码”, and subsequent rows “待启用”. Generate them with the project’s non-ambiguous alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`; do not reuse values from any existing document row.
3. Add a single-product SQL block that performs `INSERT INTO daily_codes ... ON CONFLICT(product_id) DO UPDATE`, using `mbti-ideal-type` and a clearly marked manually selected code value.
4. Add a change-log row only after the remote D1 mutation and live verification in Step 7.

- [ ] **Step 5: Run integration tests and inspect code leakage.**

Run:

```bash
node --test test/worker-verify-code.test.mjs test/worker-results.test.mjs
node --test tests/mbti-ideal-type/*.test.mjs
rg -n "MB-[A-Z0-9-]+|ACCESS_CODE|validCode" tests/mbti-ideal-type worker.js index.html
```

Expected: Worker tests and product tests pass; the leakage scan has no test-code hit in production page/Worker files. The test document may contain manually maintained backup codes; no code from that document appears in page source.

- [ ] **Step 6: Deploy static assets and Worker, then write D1.**

First deploy the committed site and Worker with the project’s existing Cloudflare command. Only when the deployed test page and Worker recognize `mbti-ideal-type`, execute the selected first code against remote D1:

```bash
npx wrangler d1 execute yundu-evaluation --remote --command "INSERT INTO daily_codes (product_id, code, valid_date, enabled, updated_at) VALUES ('mbti-ideal-type', '<selected-backup-code>', '2026-09-13', 1, CURRENT_TIMESTAMP) ON CONFLICT(product_id) DO UPDATE SET code = excluded.code, valid_date = excluded.valid_date, enabled = 1, updated_at = CURRENT_TIMESTAMP;"
```

Use the actual deployment date in place of `2026-09-13`. This is the only task step that mutates the production database. Do not execute it before the user has approved the current product content and its product QR is ready for release.

- [ ] **Step 7: Verify the live D1 code and finish documentation.**

Run the D1 query and live API requests:

```bash
npx wrangler d1 execute yundu-evaluation --remote --command "SELECT product_id, code, valid_date, enabled FROM daily_codes WHERE product_id = 'mbti-ideal-type';"
curl -i -X POST 'https://magicassess.top/api/verify-code' -H 'Content-Type: application/json' -d '{"productId":"mbti-ideal-type","code":"<selected-backup-code>"}'
curl -i -X POST 'https://magicassess.top/api/verify-code' -H 'Content-Type: application/json' -d '{"productId":"love-personality","code":"<selected-backup-code>"}'
```

Expected: D1 row enabled; MBTI request returns `200` and `{"success":true}`; cross-product request returns `403`. Then update the first code row to “已启用 / 已同步二维码”, add actual date and append a matching change-log entry.

- [ ] **Step 8: Commit integrations and operational documentation.**

```bash
git add worker.js test/worker-verify-code.test.mjs index.html README.md ../../../../测试码更新/手动换码备用测试码.md
git commit -m "feat: publish MBTI ideal type test integration"
```

### Task 9: Perform complete visual and release verification

**Files:**
- Modify only when a verified issue requires it: `tests/mbti-ideal-type/index.html`, `tests/mbti-ideal-type/style.css`, `tests/mbti-ideal-type/app.js`, `tests/mbti-ideal-type/*.test.mjs`

**Interfaces:**
- All Task 1-8 contracts remain unchanged.

- [ ] **Step 1: Run the complete automated suite.**

```bash
node --test tests/mbti-ideal-type/*.test.mjs test/worker-verify-code.test.mjs test/worker-results.test.mjs
node scripts/validate-mbti-ideal-type.mjs
```

Expected: all tests pass; every code reachable; all distribution rates between `3%-15%`; four axis counts are 8; reminders are complete and unique.

- [ ] **Step 2: Run all required answer-pattern checks.**

Verify all-A/B/C/D yield at least three types, construct all 16 intended combinations, force raw-score ties for every axis, and verify each produces a deterministic result with `status: "偏好接近均衡"`.

- [ ] **Step 3: Run the required desktop and mobile browser checks.**

Start `node scripts/local-preview.mjs` and execute the full user flow at `1440×900`, `1366×768`, `390×844`, `390×720`, `360×720`, and `320×720`. At each size confirm no overlap, `document.documentElement.scrollWidth <= window.innerWidth`, no console errors, visible answer cards, working previous button, scrollable modals and readable report headings.

- [ ] **Step 4: Validate the live flow after release.**

On `https://magicassess.top/tests/mbti-ideal-type/`, enter the current code, answer 32 questions, navigate back and modify an answer, confirm report changes when a threshold is crossed, generate a real poster, scan its QR, copy the result, restart, and verify the new result is saved in member history.

- [ ] **Step 5: Make only required fixes, re-run affected checks, and commit.**

```bash
git add tests/mbti-ideal-type
git commit -m "test: verify MBTI ideal type release"
```

## Self-Review

- Spec coverage: task 1-4 implement the 32-question, four-axis, 16-result model and explicit tie behavior; task 5-7 implement the site, full result flow and standalone QR poster; task 8 implements homepage, Worker, backup codes and D1; task 9 verifies required viewport and live flows.
- No task relies on copying the reference product’s questions, result copy or visual assets.
- Data interfaces use `calculateIdealType()` and `axisProfiles` consistently from model to app to poster/history.
- Remote D1 mutation is isolated in Task 8 after deployment, QR readiness and user approval; the plan never places real codes in frontend code.
- The approved scope excludes self-MBTI typing, partner-to-partner matching, official certification, diagnostics, payments and backend/schema expansion.
