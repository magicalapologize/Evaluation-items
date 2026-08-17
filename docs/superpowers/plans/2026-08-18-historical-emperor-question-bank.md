# Historical Emperor Question Bank Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the historical emperor test's templated questions and position-biased score signals with the approved 30-question review draft, then verify balanced and stable result behavior.

**Architecture:** Keep the existing single-page test and result-matching functions unchanged. Replace only `QUESTIONS` and `OPTION_SIGNALS`, and add one standalone Node validation script that evaluates the real arrays and scoring functions from the HTML.

**Tech Stack:** Static HTML/JavaScript, Node.js built-ins (`fs`, `vm`, `assert`).

## Global Constraints

- Do not change result copy, profiles, access-code behavior, poster code, or deployment configuration. Mobile quiz spacing may be tightened only as needed to keep the approved longer questions usable at the required viewports.
- Keep exactly 30 questions and four answers per question.
- Use the approved restrained written tone; do not restore product-management wording.
- Main signals use weight 3 and auxiliary signals use weight 1 through the existing `signalScore()` implementation.
- Each dimension must appear as a main signal 20 times. Every A/B/C/D position must contain all six dimensions, while the four positions retain different mixed profiles so fixed answers do not collapse to the same score vector.
- All 12 results must be reachable; 100,000 deterministic random answers must place every result between 3% and 15%.
- Do not deploy automatically.

---

### Task 1: Add Question-Bank Behavior Validation

**Files:**
- Create: `scripts/validate-historical-emperor.mjs`
- Inspect: `tests/historical-emperor/index.html`

**Interfaces:**
- Consumes: `QUESTIONS`, `OPTION_SIGNALS`, `EMPEROR_PROFILES`, `DIMENSIONS`, `SIGNAL_KEYS`, `signalScore()`, `normalizeShape()`, and `resultKey()` from the real page script.
- Produces: a command-line validation that exits nonzero on structural, balance, determinism, fixed-answer, or distribution failures.

- [ ] **Step 1: Write the failing validation**

The script must extract the page's inline JavaScript, evaluate the real constants/functions in `vm`, and assert:

```js
assert.equal(QUESTIONS.length, 30);
assert.ok(QUESTIONS.every((question) => question[3].length === 4));
assert.deepEqual(primaryTotals, { strategist: 20, tactician: 20, commander: 20, diplomat: 20, innovator: 20, analyst: 20 });
assert.ok(Object.values(primaryByPosition).every((counts) => counts.every((count) => count >= 3 && count <= 8)));
assert.ok(new Set(fixedResults).size >= 3);
assert.ok(distribution.every((item) => item.rate >= 0.03 && item.rate <= 0.15));
```

- [ ] **Step 2: Run the validation against the old question bank**

Run: `node scripts/validate-historical-emperor.mjs`

Expected: FAIL because the existing B/C/D positions map almost entirely to fixed dimensions.

- [ ] **Step 3: Commit the failing validation**

```bash
git add scripts/validate-historical-emperor.mjs
git commit -m "test: validate historical emperor question balance"
```

### Task 2: Replace Questions and Semantic Signals

**Files:**
- Modify: `tests/historical-emperor/index.html:458-557`
- Reference: `docs/superpowers/specs/2026-08-18-historical-emperor-question-bank-design.md`
- Test: `scripts/validate-historical-emperor.mjs`

**Interfaces:**
- Consumes: the existing `signalScore(signal, key)` contract where the first letter scores 3 and the second letter scores 1.
- Produces: 30 approved questions and a 30-by-4 `OPTION_SIGNALS` matrix aligned by question and option index.

- [ ] **Step 1: Replace the `QUESTIONS` array**

Copy the approved question text and answer order exactly from the design document, without changing other page data.

- [ ] **Step 2: Replace `OPTION_SIGNALS`**

Assign the approved main signal as the first letter and one semantically supported auxiliary signal as the second letter. Keep every row aligned with the four answer options.

- [ ] **Step 3: Run the validation and tune only auxiliary signals if needed**

Run: `node scripts/validate-historical-emperor.mjs`

Expected: PASS with 30 questions, 120 answers, balanced main signals, at least 3 fixed-answer results, all 12 results reachable, and each random result rate between 3% and 15%.

- [ ] **Step 4: Check the exact diff**

Run: `git diff --check && git diff -- tests/historical-emperor/index.html`

Expected: only the question and signal arrays change.

### Task 3: Browser Flow and Final Verification

**Files:**
- Verify: `tests/historical-emperor/index.html`
- Verify: `scripts/validate-historical-emperor.mjs`

**Interfaces:**
- Consumes: the local preview endpoint and the updated page.
- Produces: evidence that a real mobile test flow renders all questions and reaches a result without overflow or console errors.

- [ ] **Step 1: Start or reuse local preview**

Run: `node scripts/local-preview.mjs`

Expected: local preview available at `http://127.0.0.1:8765/` or another free port.

- [ ] **Step 2: Exercise the real flow in a browser**

At `390 x 844`, enter a local preview code, answer all 30 questions, go back once to change an answer, and reach the result. Assert `document.documentElement.scrollWidth <= window.innerWidth` and capture console errors.

- [ ] **Step 3: Run final commands**

```bash
node scripts/validate-historical-emperor.mjs
git diff --check
git status --short
```

Expected: validation exits 0, diff check is clean, and only the approved implementation/test files plus this plan are changed.

- [ ] **Step 4: Commit implementation after verification**

```bash
git add tests/historical-emperor/index.html scripts/validate-historical-emperor.mjs docs/superpowers/plans/2026-08-18-historical-emperor-question-bank.md
git commit -m "feat: refine historical emperor questions"
```

Do not deploy. Report the simulation distribution and wait for explicit deployment approval.
