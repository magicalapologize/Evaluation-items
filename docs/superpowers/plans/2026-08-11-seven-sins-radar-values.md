# Seven Sins Radar Values Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display each seven-sins radar axis name together with its current 0-100 tendency index.

**Architecture:** Keep the existing SVG radar geometry and display scores. Extend `renderRadar(displayScores)` to emit a two-line name/value label for each axis, with direction-aware text alignment, and style the two lines separately in the incumbent palette.

**Tech Stack:** Static HTML, inline SVG, CSS, Node.js built-in test runner.

## Global Constraints

- Preserve the existing seven-dimension scoring and display values.
- Preserve the existing radar shape, grid rings, axis lines, and seven dots.
- Show every dimension name and its `0-100` value in the radar SVG.
- Keep the existing dark red and gold visual system.
- Verify at `1440px`, `390px`, and `320px` viewport widths with no horizontal overflow.

---

### Task 1: Add a failing radar-label contract test

**Files:**
- Modify: `tests/seven-sins/ui-compat.test.mjs`

**Interfaces:**
- Consumes: `index.html` source and existing renderer source assertions.
- Produces: a regression test requiring `.radar-label` and `.radar-value` SVG text nodes in the renderer.

- [ ] **Step 1: Add the source contract test**

Append:

```js
test("雷达图为七个维度输出罪名和倾向指数标签", () => {
  assert.match(html, /class=\\"radar-label\\"/);
  assert.match(html, /class=\\"radar-value\\"/);
  assert.match(html, /displayScores\\[dimension\\.key\\]/);
  assert.match(html, /labelRadius/);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

```bash
node --test tests/seven-sins/ui-compat.test.mjs
```

Expected: FAIL because the current renderer has only `.radar-label` and no `.radar-value` or `labelRadius`.

- [ ] **Step 3: Commit the failing test**

```bash
git add tests/seven-sins/ui-compat.test.mjs
git commit -m "test: define radar value label contract"
```

### Task 2: Render and style radar values

**Files:**
- Modify: `tests/seven-sins/index.html:330-341`
- Modify: `tests/seven-sins/style.css:195-201`

**Interfaces:**
- Consumes: `displayScores` keyed by each `DIMENSIONS` item.
- Produces: SVG `<text class="radar-label">` for names and `<text class="radar-value">` for values.

- [ ] **Step 1: Extend `renderRadar(displayScores)`**

Use a label radius outside the graph and emit two text nodes per dimension. Keep `labelRadius` outside the graph and use the real `displayScores[dimension.key]` value.

- [ ] **Step 2: Add CSS hierarchy**

```css
.radar-label { fill: var(--gold-soft); font-size: 12px; font-weight: 700; }
.radar-value { fill: var(--cream); font-family: Georgia, serif; font-size: 12px; font-weight: 800; }
```

Keep the existing `.radar-svg { overflow: visible; }` so outer labels are not clipped.

- [ ] **Step 3: Run focused tests**

```bash
node --test tests/seven-sins/ui-compat.test.mjs tests/seven-sins/model.test.mjs
```

Expected: all tests PASS.

- [ ] **Step 4: Commit implementation**

```bash
git add tests/seven-sins/index.html tests/seven-sins/style.css
git commit -m "feat: show values on seven sins radar"
```

### Task 3: Verify responsive rendering and mechanical UI quality

**Files:**
- Verify: `tests/seven-sins/index.html`
- Verify: `tests/seven-sins/style.css`

- [ ] **Step 1: Run all seven-sins tests**

```bash
node --test tests/seven-sins/*.test.mjs
```

Expected: all tests PASS.

- [ ] **Step 2: Run Impeccable detector once on changed UI files**

```bash
node /Users/yunfan/.codex/skills/impeccable/scripts/detect.mjs --json tests/seven-sins/index.html tests/seven-sins/style.css
```

Expected: no unexplained new overflow or contrast findings caused by the radar labels.

- [ ] **Step 3: Start local preview and inspect a result**

```bash
node scripts/local-preview.mjs
```

Use the existing local test-code bypass, complete one result, and inspect the radar at `1440x900`, `390x844`, and `320x720`. Check that all seven values are visible and `document.documentElement.scrollWidth <= window.innerWidth`.

- [ ] **Step 4: Verify final diff**

```bash
git diff --check HEAD~2..HEAD
git status --short
```

Expected: no whitespace errors and only the intended radar/test files changed after the documentation commits.
