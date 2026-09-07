# 天赋挖掘测试 Glyph UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变测试业务逻辑的前提下，为首页、结果页和 3 秒完成过场加入轻量 ASCII/Glyph 视觉，并为答题页顶部增加低资源八色动态信号带。

**Architecture:** 新增无业务耦合的 `glyph-renderer.js`，把图像采样、线性光/Gamma、字符映射、颜色混合、静态渲染和动画生命周期封装在单一模块。`app.js` 只负责把现有页面状态、素材和天赋颜色传给渲染器；答题页使用 CSS 合成属性动画，不启动 Canvas 或 JavaScript 帧循环。Canvas 不可用、素材失败或减少动画时显示静态图片/深色 fallback。

**Tech Stack:** 原生 ES modules、Canvas 2D、CSS animations、Node built-in test runner；不新增依赖。

## Global Constraints

- 不重写题库、计分模型、结果文案、测试码验证、历史回放、海报生成和二维码承接。
- 不把中文标题、题目、分数、按钮或报告正文绘制进 Canvas。
- Canvas 实际像素尺寸使用 `min(devicePixelRatio, 2)`，动态网格桌面约 `96–120` 列、移动端约 `52–72` 列。
- sRGB 先解码到线性 RGB，再用 `Y = 0.2126R + 0.0722G + 0.0722B` 计算亮度，颜色混合后编码回 sRGB。
- 完成测试过场保持 `0ms / 1000ms / 2200ms / 3000ms` 时间点；最终结果仍由正式 `calculateProfile()` 生成。
- `prefers-reduced-motion: reduce` 下不启动动画帧循环，仍显示静态视觉和 DOM 状态文字。
- 答题页信号带只动画 CSS `transform` 与 `opacity`，不使用滤镜、阴影、渐变、定时器或 JavaScript 帧循环。
- 所有重要信息继续由可访问 DOM 呈现；Canvas 和信号带均为 `aria-hidden="true"`，不截获指针事件。

---

### Task 1: 建立 Glyph 纯函数与渲染器

**Files:**
- Create: `tests/talent-discovery/glyph-renderer.js`
- Create: `tests/talent-discovery/glyph-renderer.test.mjs`

**Interfaces:**
- Produces `srgbToLinear(channel)`, `linearToSrgb(channel)`, `relativeLuminance(r, g, b)`, `brightnessToGlyph(value, glyphs)`, `mixLinearColor(foreground, background, amount)` and `createGlyphRenderer(canvas, options)`.
- `createGlyphRenderer` returns `{ load(source), renderStatic(config), play(config), pause(), destroy() }`.
- `config` has `{ source, palette, background, mode, duration, seed }`; `mode` is `"static"` or `"assembly"`.

- [ ] **Step 1: Write failing pure-function tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { brightnessToGlyph, linearToSrgb, mixLinearColor, relativeLuminance, srgbToLinear } from "./glyph-renderer.js";

test("sRGB and linear conversion stays in range", () => {
  for (const value of [0, 0.1, 0.5, 1]) {
    const linear = srgbToLinear(value);
    assert.ok(Number.isFinite(linear) && linear >= 0 && linear <= 1);
    assert.ok(Math.abs(linearToSrgb(linear) - value) < 0.000001);
  }
});

test("relative luminance uses linear channels", () => {
  assert.equal(relativeLuminance(0, 0, 0), 0);
  assert.equal(relativeLuminance(1, 1, 1), 1);
  assert.ok(relativeLuminance(1, 1, 1) > relativeLuminance(0.2, 0.2, 0.2));
});

test("brightness mapping is monotonic", () => {
  const values = [0, 0.1, 0.5, 0.9, 1].map((value) => brightnessToGlyph(value));
  assert.deepEqual(values, [".", ":", "+", "%", "@"]);
});

test("color mixing returns bounded rgba components", () => {
  const mixed = mixLinearColor("#2CB7A5", "#142A43", 0.5);
  assert.match(mixed, /^rgba\\(\\d+, \\d+, \\d+, 0\\.5\\)$/);
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `node --test tests/talent-discovery/glyph-renderer.test.mjs`

Expected: FAIL because `glyph-renderer.js` does not exist yet.

- [ ] **Step 3: Implement bounded color and character primitives**

Implement the sRGB transfer functions, relative luminance, `GLYPHS = ".:-=+*#%@"`, clamped index mapping, hex parsing, linear-space color mixing, deterministic seeded order generation, and no-DOM helpers. Return valid values for malformed numeric input by clamping finite values to `[0, 1]`.

- [ ] **Step 4: Implement `createGlyphRenderer` lifecycle**

Use a single hidden sampling canvas to read source pixels, calculate a dynamic grid from the visible canvas width, draw characters with a monospace font, cap DPR at `2`, and cache loaded source promises. `renderStatic` draws once; `play` schedules `requestAnimationFrame` only for `assembly`; `pause` cancels the frame; `destroy` cancels frames, disconnects resize/visibility listeners, and releases references. If the target canvas or 2D context is unavailable, return a no-op renderer with `fallback: true` and never throw during page initialization.

- [ ] **Step 5: Run the focused test and commit**

Run: `node --test tests/talent-discovery/glyph-renderer.test.mjs`

Expected: PASS.

```bash
git add tests/talent-discovery/glyph-renderer.js tests/talent-discovery/glyph-renderer.test.mjs
git commit -m "feat: add glyph renderer primitives"
```

### Task 2: Add Canvas mounts, fallbacks, and quiz signal band

**Files:**
- Modify: `tests/talent-discovery/index.html`
- Modify: `tests/talent-discovery/style.css`
- Modify: `tests/talent-discovery/ui-compat.test.mjs`

**Interfaces:**
- Produces `canvas#home-glyph-canvas`, `canvas#loading-glyph-canvas`, `canvas#result-glyph-canvas` and image fallback elements with stable `data-glyph-fallback` selectors.
- Produces `.quiz-signal-band` with eight `span.quiz-signal-block` elements whose inline colors come from the existing eight dimension colors.

- [ ] **Step 1: Extend the UI contract tests**

Assert that HTML contains all three Canvas IDs, `aria-hidden="true"`, `data-glyph-fallback`, and eight quiz signal blocks; assert CSS contains `@keyframes quiz-signal-drift`, `transform`, `opacity`, `prefers-reduced-motion`, `pointer-events:none`, and no selector animates `width`, `height`, `top`, `left`, or `filter` for the signal band.

- [ ] **Step 2: Run the UI contract test and verify failure**

Run: `node --test tests/talent-discovery/ui-compat.test.mjs`

Expected: FAIL because the new mounts and styles are absent.

- [ ] **Step 3: Add semantic HTML mounts**

Place the home Canvas in the existing home visual/gate area without moving the test-code input; place the result Canvas in `.report-hero` beside the report identity; replace the loading `.signal-map` visual with the loading Canvas while retaining `loading-state`, `loading-detail`, `loading-count`, and the progressbar DOM. Add static `<img>` fallbacks using `home-hero.png`, the relevant result asset placeholder, and `home-hero.png` for loading. Add the quiz signal band as the first child of `.quiz-head` so it occupies a fixed 34px strip above the brand row.

- [ ] **Step 4: Add responsive and low-cost CSS**

Create fixed-size Canvas wrappers with `overflow:hidden`, `pointer-events:none`, and a visible fallback state. Use a dark panel for Glyph surfaces and keep text layers above them with normal DOM stacking. Define eight block colors from the existing dimension palette, animate only `transform` and `opacity` over `5.5s` with staggered delays, set `opacity` between `0.18` and `0.48`, and disable the animation in `@media (prefers-reduced-motion: reduce)`. At `max-width:760px`, reduce Canvas height and signal-block travel without shrinking question text or answer targets.

- [ ] **Step 5: Run UI contract and style checks, then commit**

Run: `node --test tests/talent-discovery/ui-compat.test.mjs && git diff --check`

Expected: PASS with no whitespace errors.

```bash
git add tests/talent-discovery/index.html tests/talent-discovery/style.css tests/talent-discovery/ui-compat.test.mjs
git commit -m "feat: add glyph mounts and quiz signal band"
```

### Task 3: Integrate home and result Glyph rendering

**Files:**
- Modify: `tests/talent-discovery/app.js`
- Modify: `tests/talent-discovery/index.html`
- Test: `tests/talent-discovery/ui-compat.test.mjs`

**Interfaces:**
- Consumes `createGlyphRenderer`, `DIMENSIONS`, `profile.bestKey`, and the existing asset filenames.
- Produces `initializeGlyphs()`, `renderHomeGlyph()`, and `renderResultGlyph(profile)` internal helpers; the existing `start`, `renderResult`, history replay, poster generation, and action handlers remain callable as before.

- [ ] **Step 1: Add integration contract assertions**

Assert that `app.js` imports `./glyph-renderer.js`, references `home-glyph-canvas`, `result-glyph-canvas`, all eight result image filenames through a key-to-file mapping, and calls `destroy()` when replacing a renderer. Keep assertions text-level because Node tests do not provide a browser Canvas.

- [ ] **Step 2: Run the integration contract and verify failure**

Run: `node --test tests/talent-discovery/ui-compat.test.mjs`

Expected: FAIL because `app.js` has no renderer import or lifecycle calls.

- [ ] **Step 3: Add renderer initialization and home rendering**

Import `createGlyphRenderer`; create one renderer per Canvas after the module loads. `renderHomeGlyph()` loads `home-hero.png`, passes the eight dimension colors plus `#142A43` background, and calls `renderStatic` or a low-frequency `play` only when motion is allowed. On load failure, hide the Canvas and reveal its image fallback. Do not block the access-code flow on image loading.

- [ ] **Step 4: Render the best-talent visual without changing report data**

In `renderResult(profile)`, resolve `profile.bestKey` through an explicit map `{ language: "language.png", ... nature: "nature.png" }`, resolve the same dimension color already used by `--talent-color`, and pass them to `renderResultGlyph(profile)`. Destroy the previous result renderer before loading a new profile or replay. Keep `rankedDimensions(profile)` and all DOM report content unchanged.

- [ ] **Step 5: Run all Node tests and commit**

Run: `node --test tests/talent-discovery/*.test.mjs && node --check tests/talent-discovery/app.js && git diff --check`

Expected: PASS.

```bash
git add tests/talent-discovery/app.js tests/talent-discovery/index.html tests/talent-discovery/ui-compat.test.mjs
git commit -m "feat: integrate home and result glyphs"
```

### Task 4: Replace the 3-second loading visual with Glyph assembly

**Files:**
- Modify: `tests/talent-discovery/app.js`
- Modify: `tests/talent-discovery/style.css`
- Modify: `tests/talent-discovery/ui-compat.test.mjs`

**Interfaces:**
- Consumes the loading renderer from Task 3 and the existing `finish()` timers.
- Produces a loading `assembly` render that uses `duration: 2600`, then leaves the final frame visible until the existing `3000ms` result transition.

- [ ] **Step 1: Add timing and fallback assertions**

Assert that `app.js` still contains the `1000`, `2200`, and `3000` callbacks, references `loading-glyph-canvas`, calls `play({ mode: "assembly", duration: 2600 })`, and does not call `calculateProfile` before the `3000ms` callback. Assert that the legacy `.signal-map` is not required for loading state rendering.

- [ ] **Step 2: Run the timing contract and verify failure**

Run: `node --test tests/talent-discovery/ui-compat.test.mjs`

Expected: FAIL because `finish()` still starts the old signal-map animation and has no Glyph assembly call.

- [ ] **Step 3: Wire the loading renderer without altering business timing**

At the start of `finish()`, reset the loading renderer, show the loading screen, and call `play` with the deterministic answer fingerprint as `seed`. Keep the existing DOM text updates at `1000ms` and `2200ms`; at `3000ms`, call `calculateProfile(state.answers)`, render/save the result, destroy or pause loading Glyph, then show `result-screen`. If the renderer reports fallback, keep the static loading image visible and run the same timers.

- [ ] **Step 4: Remove obsolete loading-only visual CSS**

Delete only the signal-map rules made unreachable by the new Canvas; retain shared loading screen, progress, reduced-motion, and DOM status styles. Ensure the Canvas stage has a stable aspect ratio at all six target viewports.

- [ ] **Step 5: Run regression tests and commit**

Run: `node --test tests/talent-discovery/*.test.mjs && node --check tests/talent-discovery/app.js && git diff --check`

Expected: PASS and no changed test/model behavior.

```bash
git add tests/talent-discovery/app.js tests/talent-discovery/style.css tests/talent-discovery/ui-compat.test.mjs
git commit -m "feat: add glyph loading assembly"
```

### Task 5: Browser verification and performance fallback

**Files:**
- Modify: `tests/talent-discovery/glyph-renderer.js`
- Modify: `tests/talent-discovery/style.css`

**Interfaces:**
- Consumes the finished page and renderer from Tasks 1–4.
- Produces verified behavior at the six required viewports; no new product API.

- [ ] **Step 1: Run the complete automated suite**

Run: `node --test tests/talent-discovery/*.test.mjs && node --check tests/talent-discovery/app.js && node --check tests/talent-discovery/glyph-renderer.js && git diff --check`

Expected: PASS.

- [ ] **Step 2: Start the existing local static/server workflow and inspect each state**

Open the real page at `1440 × 900`, `1366 × 768`, `390 × 844`, `390 × 720`, `360 × 720`, and `320 × 720`. Confirm the home Canvas has non-zero pixels, the code form remains readable, the quiz signal band does not shift question layout, the result Canvas matches the best talent color, and the loading Canvas remains visible for the full 3 seconds.

- [ ] **Step 3: Exercise required fallback paths**

Use DevTools or a test toggle to disable Canvas, fail an image request, enable `prefers-reduced-motion`, and hide/show the tab. Confirm static fallbacks appear, no uncaught error is logged, hidden tabs pause animation, and the 3-second business transition is not extended.

- [ ] **Step 4: Exercise the full product workflow**

Run correct and incorrect test-code paths, answer all 40 questions, use previous-question editing, open the report, replay history, save the poster, copy the summary, open cashback, and restart. Confirm eight dimensions remain sorted descending and the poster/QR behavior is unchanged.

- [ ] **Step 5: Commit only after visual acceptance**

Run: `git status --short`

Expected: only the files listed in this plan are changed; commit any final renderer fallback or responsive correction with a focused message.

## Plan Self-Review

- Spec coverage: Canvas algorithm, Gamma pipeline, three page integrations, CSS quiz signal band, 3-second timing, fallback, reduced motion, accessibility, responsive behavior, regression tests, and browser acceptance each have an explicit task.
- Placeholder scan: no `TBD`, `TODO`, “implement later”, or unspecified validation steps are used.
- Interface consistency: Task 1 exports the functions consumed by Tasks 3–4; Canvas IDs and selectors are introduced in Task 2 before app integration; Task 4 preserves the timing contract tested in Task 5.
- Scope: no题库、计分、历史、海报、二维码或测试码协议修改 is planned.
