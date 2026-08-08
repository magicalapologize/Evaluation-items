# Seven Sins Result Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the seven result summaries and reminders so each result has a distinct voice, while preserving a dynamically rendered second-highest dimension.

**Architecture:** Keep all result copy in `data.mjs`. Add one `secondarySummary` string with a `{second}` placeholder to each result, then replace that placeholder in the existing result renderer. Keep scoring, snapshots, poster copy, and layout unchanged.

**Tech Stack:** JavaScript ES modules, static HTML, Node.js built-in test runner.

## Global Constraints

- Preserve the dynamic second-highest dimension.
- Each result must have its own `summary`, `secondarySummary`, and `reminder` voice.
- The rendered first-reaction copy and reminder must each grow by approximately 10-20 Chinese characters from the current version.
- Do not modify questions, scoring, result selection, D1, test codes, page layout, or poster layout.
- Existing history snapshots keep their stored copy and are not rewritten.

---

### Task 1: Lock the result-copy contract with tests

**Files:**
- Modify: `tests/seven-sins/model.test.mjs`

**Interfaces:**
- Consumes: `RESULTS: Array<Result>` from `tests/seven-sins/data.mjs`.
- Produces: a test contract requiring `secondarySummary: string` with exactly one `{second}` placeholder on every result.

- [ ] **Step 1: Write the failing copy-contract test**

Add the following baseline constants and test:

```js
const COPY_BASELINES = {
  pride: { firstReaction: 51, reminder: 49 },
  greed: { firstReaction: 50, reminder: 39 },
  lust: { firstReaction: 49, reminder: 45 },
  envy: { firstReaction: 50, reminder: 63 },
  wrath: { firstReaction: 49, reminder: 40 },
  gluttony: { firstReaction: 54, reminder: 51 },
  sloth: { firstReaction: 44, reminder: 49 }
};

test("七种结果拥有独立的次高维度解释且文案增量符合要求", () => {
  const secondarySummaries = RESULTS.map((result) => result.secondarySummary);
  assert.equal(new Set(secondarySummaries).size, RESULTS.length);

  for (const result of RESULTS) {
    assert.equal(typeof result.secondarySummary, "string");
    assert.equal(result.secondarySummary.match(/\{second\}/g)?.length, 1);

    const firstReaction = `${result.summary} ${result.secondarySummary.replace("{second}", "嫉妒")}`;
    const firstDelta = [...firstReaction].length - COPY_BASELINES[result.key].firstReaction;
    const reminderDelta = [...result.reminder].length - COPY_BASELINES[result.key].reminder;

    assert.ok(firstDelta >= 10 && firstDelta <= 20, `${result.name}第一反应增加了${firstDelta}字`);
    assert.ok(reminderDelta >= 10 && reminderDelta <= 20, `${result.name}提醒增加了${reminderDelta}字`);
  }
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
node --test tests/seven-sins/model.test.mjs
```

Expected: FAIL because `secondarySummary` does not exist.

- [ ] **Step 3: Commit the failing contract test**

```bash
git add tests/seven-sins/model.test.mjs
git commit -m "test: define seven sins result copy contract"
```

### Task 2: Add distinct result copy and dynamic rendering

**Files:**
- Modify: `tests/seven-sins/data.mjs`
- Modify: `tests/seven-sins/index.html`
- Test: `tests/seven-sins/model.test.mjs`

**Interfaces:**
- Consumes: `result.secondarySummary: string` containing exactly one `{second}` placeholder and `second.name: string` from the calculated profile.
- Produces: rendered first-reaction text in the form `${result.summary} ${result.secondarySummary.replace("{second}", second.name)}`.

- [ ] **Step 1: Replace the seven summaries and add secondary summaries**

Use these exact `summary` and `secondarySummary` values:

```js
pride: {
  summary: "你把能力和体面看得很重。被人质疑时，你很少当场解释，反而会默默把标准再抬高一截。",
  secondarySummary: "若「{second}」排在第二，它往往决定你这次想证明给谁看。"
},
greed: {
  summary: "你对机会有一种近乎本能的嗅觉。一旦看见新的空间，就会立刻盘算怎样把它握在手里。",
  secondarySummary: "而「{second}」排在第二，透露了你最舍不得放下的那份筹码。"
},
lust: {
  summary: "你很容易被一个人或一件事带来的感觉击中。心动一来，注意力和热情都会迅速靠过去。",
  secondarySummary: "「{second}」排在第二，也在左右你靠近之后的选择。"
},
envy: {
  summary: "你对人与人之间的差距非常敏锐。别人领先的那一步，很快就会变成你重新调整目标的参照。",
  secondarySummary: "排在第二的「{second}」，说明你通常会用什么方式追上去。"
},
wrath: {
  summary: "你的底线像一根绷紧的线。遇到越界或不公平，你很难继续装作没事，通常会马上给出反应。",
  secondarySummary: "「{second}」排在第二，决定了你的火气最容易被哪类事情点着。"
},
gluttony: {
  summary: "你很会在压力里替自己找一口喘息。吃点好的、买点喜欢的，或沉进娱乐里，都能让你暂时缓过来。",
  secondarySummary: "排在第二的「{second}」，说明你最常在什么情绪下需要这份补偿。"
},
sloth: {
  summary: "事情一复杂，你会先把它放远一点。计划其实一直在脑子里，最难熬的是开始那几步。",
  secondarySummary: "「{second}」排在第二，也透露了你迟迟不动时在顾虑什么。"
}
```

- [ ] **Step 2: Replace the seven reminders**

Use these exact `reminder` values:

```js
pride: "别人一句质疑，很容易让你把整件事都扛到自己身上，非要做出个漂亮结果。先别急着加码，挑一个最能说明问题的部分做好，剩下的让时间回答。",
greed: "机会太多时，你最容易输在每一件都舍不得放。下次又想开新项目，先把旧项目推进到能交付，再给新机会留位置。",
lust: "心动时，你会很快把对方放进生活中心，很多细节也因此被滤掉。先留出三次普通相处的时间，看看热烈退下去以后，你们还剩下什么。",
envy: "比较能帮你看清差距，也会悄悄偷走自己的节奏。再遇到让你羡慕的人，别把他的整个人生搬来压自己；只拆一个今天能试的动作，做完就关掉页面，回到你的进度。",
wrath: "火气上来时，你的话常常比诉求先冲出去，对方最后只记住了语气。下次反击前，先说清楚你到底要他停止哪件事。",
gluttony: "你很懂得给自己找点快乐，这份本事在累的时候很管用。可如果每次难受都靠吃、买或刷过去，真正的疲惫只会被推迟。先完成一个收尾动作，再安心享受。",
sloth: "拖延最会伪装成“等状态好一点”，于是一天很快就过去了。碰到又想往后放的事，别安排完整计划，只打开文件、做十五分钟，让身体先进入任务。"
```

- [ ] **Step 3: Replace the fixed secondary-dimension sentence**

Replace:

```js
$("result-summary-copy").textContent = `${result.summary} 压力上来时，「${second.name}」也常会跟着出现。`;
```

with:

```js
const secondarySummary = result.secondarySummary.replace("{second}", second.name);
$("result-summary-copy").textContent = `${result.summary} ${secondarySummary}`;
```

- [ ] **Step 4: Run the focused tests**

Run:

```bash
node --test tests/seven-sins/model.test.mjs tests/seven-sins/ui-compat.test.mjs
```

Expected: all tests PASS.

- [ ] **Step 5: Commit the implementation**

```bash
git add tests/seven-sins/data.mjs tests/seven-sins/index.html
git commit -m "feat: personalize seven sins result copy"
```

### Task 3: Verify content and responsive rendering

**Files:**
- Verify: `tests/seven-sins/data.mjs`
- Verify: `tests/seven-sins/index.html`
- Verify: `tests/seven-sins/model.test.mjs`

**Interfaces:**
- Consumes: the seven result records and the existing result-page renderer.
- Produces: evidence that copy constraints, regression tests, and responsive wrapping all pass.

- [ ] **Step 1: Run the full seven-sins test suite**

```bash
node --test tests/seven-sins/*.test.mjs
```

Expected: all tests PASS.

- [ ] **Step 2: Audit copy fields and forbidden fixed template**

```bash
node --input-type=module - <<'EOF'
import { RESULTS } from "./tests/seven-sins/data.mjs";
for (const result of RESULTS) {
  const first = `${result.summary} ${result.secondarySummary.replace("{second}", "嫉妒")}`;
  console.log(result.name, [...first].length, [...result.reminder].length);
}
EOF
rg -n "压力上来时.*也常会跟着出现" tests/seven-sins
```

Expected: seven rows of lengths and no `rg` match.

- [ ] **Step 3: Start the local preview server**

```bash
node scripts/local-preview.mjs
```

Expected: preview available at `http://127.0.0.1:8765/tests/seven-sins/`.

- [ ] **Step 4: Inspect desktop and mobile result layouts**

Open a newly completed result at `1440 x 900` and `390 x 844`. Verify that the first-reaction and reminder cards wrap naturally, do not overlap nearby content, and do not create horizontal overflow.

- [ ] **Step 5: Verify the final diff**

```bash
git diff --check HEAD~2..HEAD
git status --short
```

Expected: no whitespace errors and no unintended modified files.
