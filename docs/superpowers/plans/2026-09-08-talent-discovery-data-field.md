# 天赋挖掘测试 Canvas 双层数据场实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变测试业务流程的前提下，将首页和结果页的稀疏圆点背景升级为高密度、深色、动态的 Canvas 双层天赋数据场，并保持原有图片与 DOM 信息可见。

**Architecture:** 保留现有 `createGlyphRenderer` 作为 3 秒过场的图片采样渲染器；重写同文件中的 `createParticleRenderer` 为不采样原图的轻量数据场渲染器。新粒子渲染器由低分辨率字符矩阵、天赋词碎片、彩色光场和扫描线组成，`app.js` 只传递 palette、最佳天赋 key 和 seed，不读取或修改题库/计分模型。首页与结果页的原图元素继续作为独立 DOM 图片层显示在数据场之上。

**Tech Stack:** 原生 ES modules、Canvas 2D、CSS animations、Node built-in test runner；不引入 WebGL 或第三方依赖。

## Global Constraints

- 背景基色使用 `#05070B` 或同等级近黑色；现有原图不删除、不隐藏、不送入粒子背景采样。
- Canvas 仅作为 `aria-hidden="true"`、`pointer-events:none` 的背景层；标题、题目、分数、报告、按钮和状态文案继续由 DOM 提供。
- 首页和结果页动态数据场不承载必要中文信息；天赋词碎片只作为视觉线索。
- 过场业务时序严格保持 `0ms / 1000ms / 2200ms / 3000ms`，正式 `calculateProfile(state.answers)` 只能在 `3000ms` 回调中执行。
- 答题页信号带只使用 CSS `transform` 与 `opacity`，不启动 JavaScript 帧循环。
- 支持 `prefers-reduced-motion`、页面隐藏、Canvas/context 不可用、图片加载失败和移动端低资源降级。
- 不修改 `data.mjs`、`model.mjs`、测试码验证、历史、海报、二维码和商品承接逻辑。

---

### Task 1: 固化数据场纯函数与测试契约

**Files:**
- Modify: `tests/talent-discovery/glyph-renderer.js`
- Modify: `tests/talent-discovery/glyph-renderer.test.mjs`

**Interfaces:**
- Consumes: 现有 `createParticleRenderer(canvas, options)` 调用形态。
- Produces: `createParticleRenderer` 支持 `{ palette, background, count, seed, talentWords, bestKey, mode }`，返回 `{ fallback, renderStatic(time), play(), pause(), destroy() }`；保留现有 `createGlyphRenderer` 与其导出函数不变。

- [ ] **Step 1: 写失败测试，锁定高密度和双层数据场行为**

在现有粒子测试后增加：

```js
test("data-field renderer draws a dense character matrix and talent fragments", () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  let fillTextCalls = 0;
  let strokeCalls = 0;
  const context = {
    setTransform() {}, clearRect() {}, fillRect() {}, beginPath() {}, arc() {}, fill() {},
    moveTo() {}, lineTo() {}, stroke() {},
    fillText() { fillTextCalls += 1; },
    set fillStyle(_) {}, set globalAlpha(_) {}, set font(_) {}, set lineWidth(_) {},
  };
  context.stroke = () => { strokeCalls += 1; };
  globalThis.document = { hidden: false, addEventListener() {}, removeEventListener() {} };
  globalThis.window = { devicePixelRatio: 1, innerWidth: 1440, matchMedia: () => ({ matches: false }) };
  try {
    const renderer = createParticleRenderer({ clientWidth: 900, clientHeight: 420, getContext: () => context }, {
      palette: ["#1769AA", "#5B3FA3", "#3F6F3A"],
      background: "#05070B",
      count: 3200,
      seed: 11,
      talentWords: ["语言", "逻辑", "空间"],
    });
    assert.equal(renderer.renderStatic(1000), true);
    assert.ok(fillTextCalls >= 1800);
    assert.ok(strokeCalls >= 1);
    renderer.destroy();
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
  }
});

test("data-field reduced motion renders once without scheduling frames", () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const originalRaf = globalThis.requestAnimationFrame;
  let scheduled = 0;
  const context = { setTransform() {}, clearRect() {}, fillRect() {}, fillText() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {} };
  globalThis.document = { hidden: false, addEventListener() {}, removeEventListener() {} };
  globalThis.window = { devicePixelRatio: 1, innerWidth: 390, matchMedia: () => ({ matches: true }) };
  globalThis.requestAnimationFrame = () => { scheduled += 1; return 1; };
  try {
    const renderer = createParticleRenderer({ clientWidth: 320, clientHeight: 220, getContext: () => context }, { talentWords: ["语言"], count: 1600 });
    assert.equal(renderer.play(), true);
    assert.equal(scheduled, 0);
    renderer.destroy();
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
    globalThis.requestAnimationFrame = originalRaf;
  }
});
```

- [ ] **Step 2: 运行聚焦测试，确认当前稀疏圆点实现失败**

运行：`node --test tests/talent-discovery/glyph-renderer.test.mjs`

预期：新增“dense character matrix”断言失败，因为当前实现仅调用少量 `arc/fill`，没有字符矩阵和扫描线。

- [ ] **Step 3: 实现确定性数据场模型**

在 `createParticleRenderer` 内替换圆点数组为以下四类状态：

```js
const desktopDensity = 3200;
const mobileDensity = 1800;
const glyphs = ".:·×▫+=*#%@";
const words = options.talentWords?.length ? options.talentWords : ["语言", "逻辑", "空间", "身体", "音乐", "人际", "内在", "自然"];
```

使用已有 LCG seed 生成：`matrix`（网格字符亮度/相位/颜色索引）、`fragments`（单字位置/速度/透明度/颜色）、`orbs`（3–5 个缓慢光场中心）和 `scanPhase`。桌面字符数量控制在 `2800–4200`，移动端控制在 `1400–2200`。`bestKey` 存在时，将最佳天赋对应颜色用于更多 matrix 单元和更高 fragment opacity；没有最佳天赋时均匀使用八色。

- [ ] **Step 4: 实现单帧绘制顺序**

`renderStatic(time)` 必须依次执行：

1. `resize()`，填充 `#05070B`。
2. 绘制低透明度字符矩阵；用正弦相位和局部光场改变字符密度/亮度。
3. 绘制拆散的天赋单字碎片；不得在一帧中长时间完整显示大标题。
4. 绘制 1 条低透明度横向扫描带和至少 1 个局部彩色字符高亮区。
5. 恢复 `globalAlpha`，返回 `true`。

只使用 `fillText`、`fillRect`、`stroke` 等 Canvas 2D 基础 API，不使用 CSS filter、WebGL、第三方库或逐字符 DOM。

- [ ] **Step 5: 保持生命周期与降级行为**

保留现有 `play/pause/destroy` 形态：普通模式持续调度帧；减少动画或页面隐藏时暂停；`destroy()` 取消帧、断开 ResizeObserver、移除 visibility listener。Canvas/context 不可用时返回 `fallback:true`，不抛异常。

- [ ] **Step 6: 运行测试并提交**

运行：`node --test tests/talent-discovery/glyph-renderer.test.mjs && node --check tests/talent-discovery/glyph-renderer.js && git diff --check`

预期：全部通过。

```bash
git add tests/talent-discovery/glyph-renderer.js tests/talent-discovery/glyph-renderer.test.mjs
git commit -m "feat: render dense talent data field background"
```

### Task 2: 修正首页与结果页的背景层级

**Files:**
- Modify: `tests/talent-discovery/index.html`
- Modify: `tests/talent-discovery/style.css`
- Modify: `tests/talent-discovery/ui-compat.test.mjs`

**Interfaces:**
- Consumes: Task 1 的 `createParticleRenderer`，现有 `home-particle-canvas`、`result-particle-canvas` 和图片元素。
- Produces: Canvas 为近黑色背景层，原图片保持可见且位于 Canvas 之上，DOM 内容位于两者之上。

- [ ] **Step 1: 先扩展 UI 契约测试**

增加文本契约：

```js
assert.match(css, /--data-field-bg\s*:\s*#05070B/i);
assert.match(css, /\.particle-background[^}]*z-index\s*:\s*0/);
assert.match(css, /\.glyph-surface img:not\(\.glyph-fallback\)[^}]*z-index\s*:\s*2/);
assert.match(css, /\.glyph-surface canvas[^}]*z-index\s*:\s*1/);
assert.match(html, /id="result-visual-image"[^>]+src="language\.png"/);
assert.doesNotMatch(html, /result-visual-image[^>]*hidden/);
```

- [ ] **Step 2: 运行测试确认层级断言失败**

运行：`node --test tests/talent-discovery/ui-compat.test.mjs`

预期：因当前图片没有明确高于 Canvas 的层级、背景仍为 `#142A43` 而失败。

- [ ] **Step 3: 修改 HTML，保留原图并补齐背景语义**

将首页视觉容器改为显式双层结构：`canvas.particle-background` → `img.home-hero-image`；结果视觉容器保留 `img#result-visual-image`，只新增 class 和必要的 fallback 属性。不得删除 `src`，不得把原图内容替换成 Canvas。

- [ ] **Step 4: 修改 CSS 层级与近黑色基底**

在 `:root` 增加 `--data-field-bg:#05070B`；`.home-screen`、`.report-hero` 和 `.glyph-surface` 使用该色作为数据场底色。设置：

```css
.particle-background { z-index:0; opacity:.92; }
.glyph-surface canvas { position:absolute; inset:0; z-index:1; }
.glyph-surface img:not(.glyph-fallback) { position:relative; z-index:2; opacity:.9; }
.glyph-surface .glyph-fallback { z-index:3; }
```

图片层必须有足够不透明度，确保用户能辨认原图；正文层继续使用 `z-index:4` 或现有相对层级。移动端不得因 Canvas 变为静态背景而隐藏图片。

- [ ] **Step 5: 运行 UI 测试与空白检查并提交**

运行：`node --test tests/talent-discovery/ui-compat.test.mjs && git diff --check`

```bash
git add tests/talent-discovery/index.html tests/talent-discovery/style.css tests/talent-discovery/ui-compat.test.mjs
git commit -m "fix: keep artwork above talent data field"
```

### Task 3: 将首页/结果页配置接入八项天赋数据

**Files:**
- Modify: `tests/talent-discovery/app.js`
- Modify: `tests/talent-discovery/glyph-renderer.js`
- Modify: `tests/talent-discovery/ui-compat.test.mjs`

**Interfaces:**
- Consumes: `DIMENSIONS`, `profile.bestKey`、`RESULT_GLYPH_ASSETS`、Task 1 的 `talentWords/bestKey` 选项。
- Produces: `renderHomeParticles()` 和 `renderResultParticles(profile)` 向渲染器传入八项天赋词、明确背景色和稳定 seed；结果页最佳天赋拥有主色信号。

- [ ] **Step 1: 增加集成契约测试**

```js
assert.match(app, /talentWords\s*:/);
assert.match(app, /bestKey\s*:/);
assert.match(app, /background:\s*["']#05070B["']/);
assert.match(app, /count:\s*(?:3\d{3}|[12]\d{3})/);
assert.match(app, /homeParticleRenderer\?\.destroy\(\)/);
```

- [ ] **Step 2: 运行测试确认当前配置不满足方案 2**

运行：`node --test tests/talent-discovery/ui-compat.test.mjs`

预期：当前仍传入 `#142A43`、`count:96/82` 且没有天赋词，因此失败。

- [ ] **Step 3: 更新首页配置**

将 `renderHomeParticles()` 改为传入：

```js
{
  palette: DIMENSIONS.map(({ color }) => color),
  talentWords: DIMENSIONS.map(({ short, name }) => short || name.replace(/天赋$/, "")),
  background: "#05070B",
  count: 3200,
  seed: 17,
}
```

调用 `play()`；渲染失败时只显示现有静态结构，不阻塞测试码入口。

- [ ] **Step 4: 更新结果页配置**

保留 `RESULT_GLYPH_ASSETS` 和 `result-visual-image.src` 映射，改为传入：

```js
{
  palette: DIMENSIONS.map(({ color }) => color),
  talentWords: DIMENSIONS.map(({ short, name }) => short || name.replace(/天赋$/, "")),
  bestKey: profile.bestKey,
  background: "#05070B",
  count: 3000,
  seed: 29 + answerFingerprint(state.answers),
}
```

结果页 `--talent-color` 继续控制 DOM 标题与维度颜色；Canvas 最佳天赋颜色仅是辅助视觉。

- [ ] **Step 5: 运行回归测试并提交**

运行：`node --test tests/talent-discovery/*.test.mjs && node --check tests/talent-discovery/app.js && git diff --check`

```bash
git add tests/talent-discovery/app.js tests/talent-discovery/glyph-renderer.js tests/talent-discovery/ui-compat.test.mjs
git commit -m "feat: connect talent words to home and result fields"
```

### Task 4: 优化 3 秒过场为数据读取→聚拢→收束

**Files:**
- Modify: `tests/talent-discovery/app.js`
- Modify: `tests/talent-discovery/glyph-renderer.js`
- Modify: `tests/talent-discovery/ui-compat.test.mjs`

**Interfaces:**
- Consumes: 现有 `finish()` 业务计时和 Task 1 的 `createGlyphRenderer` assembly 模式。
- Produces: 过场视觉时长 `2600ms`，结果切换仍在 `3000ms`；不提前计算正式 profile。

- [ ] **Step 1: 增加过场契约测试**

```js
assert.match(app, /mode:\s*["']assembly["']/);
assert.match(app, /duration:\s*2600/);
assert.match(app, /background:\s*["']#05070B["']/);
assert.match(app.slice(app.indexOf("function finish()"), app.indexOf('$(')), /calculateProfile\(state\.answers\)/);
```

- [ ] **Step 2: 修改 loading Glyph 配置**

`renderLoadingGlyph(seed)` 使用 `background:"#05070B"`、八项天赋 palette 和 `talentWords`；保留 `home-hero.png` 作为采样源和图片 fallback。`createGlyphRenderer.play({ mode:"assembly", duration:2600 })` 的结果只影响视觉，不影响业务计时。

- [ ] **Step 3: 为 assembly 增加阶段性绘制参数**

在 `createGlyphRenderer` 的 assembly 分支中根据 `elapsed / duration` 计算：

- `0–0.31`：绘制 20%→55% 字符，主要集中于暗部；
- `0.31–0.69`：提高八色字符和片段密度，向中心焦点移动；
- `0.69–1`：达到完整采样密度，保留轻微亮度呼吸。

不得改变 `play` 返回值、`pause/destroy` 行为或现有采样 Gamma 管线。

- [ ] **Step 4: 保持 1000/2200/3000ms DOM 时序**

仅调整 loading Canvas 视觉参数，不修改 `finish()` 三个 `setTimeout` 的延迟和 `3000ms` 内的业务顺序：`calculateProfile` → `renderResult` → `saveHistory` → 销毁 loading renderer → `show("result-screen")`。

- [ ] **Step 5: 运行全部测试并提交**

运行：`node --test tests/talent-discovery/*.test.mjs && node --check tests/talent-discovery/app.js && node --check tests/talent-discovery/glyph-renderer.js && git diff --check`

```bash
git add tests/talent-discovery/app.js tests/talent-discovery/glyph-renderer.js tests/talent-discovery/ui-compat.test.mjs
git commit -m "feat: stage three-second talent assembly transition"
```

### Task 5: 浏览器验收与性能降级

**Files:**
- Modify: `tests/talent-discovery/glyph-renderer.js`
- Modify: `tests/talent-discovery/style.css`

**Interfaces:**
- Consumes: Tasks 1–4 的页面和渲染器。
- Produces: 六种 viewport 下可见、无溢出、可暂停、可降级的背景效果。

- [ ] **Step 1: 启动本地静态服务并打开页面**

从项目根目录运行：`python3 -m http.server 4173`，打开 `http://127.0.0.1:4173/tests/talent-discovery/`。

- [ ] **Step 2: 检查首页与结果页**

逐一检查 `1440×900`、`1366×768`、`390×844`、`390×720`、`360×720`、`320×720`：

- 近黑色背景上能看到连续变化的高密度字符矩阵，而不是少量圆点。
- 首页 `home-hero.png` 与结果页 `language/logic/spatial/body/music/interpersonal/introspection/nature.png` 仍可辨认。
- 测试码输入框、按钮、标题和报告正文在 Canvas 之上，不被遮挡。
- `document.documentElement.scrollWidth <= window.innerWidth`。

- [ ] **Step 3: 检查答题页与过场**

开始答题并完成 40 题，确认顶部八色信号带持续可见；最后一题后观察 3 秒过场，确认读取→聚拢→收束且结果在 3000ms 切换。

- [ ] **Step 4: 检查降级与无障碍**

启用 `prefers-reduced-motion: reduce`，确认首页/结果页静态可见、答题信号带停止运动；模拟 Canvas context 失败和图片加载失败，确认不会白屏、不会阻塞测试入口；切换后台标签页后确认帧循环暂停。

- [ ] **Step 5: 最终自动化验证**

运行：

```bash
node --test tests/talent-discovery/*.test.mjs
node --check tests/talent-discovery/app.js
node --check tests/talent-discovery/glyph-renderer.js
git diff --check
```

验收结论必须同时满足：29 项既有测试及新增测试通过、原图保留、Canvas 非空、3 秒时序不变、八项天赋降序展示不回归、无控制台错误。

