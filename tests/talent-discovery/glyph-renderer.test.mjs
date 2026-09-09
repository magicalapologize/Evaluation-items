import test from "node:test";
import assert from "node:assert/strict";
import { brightnessToGlyph, calculateGlyphGrid, linearToSrgb, mixLinearColor, relativeLuminance, srgbToLinear, createGlyphRenderer, createParticleRenderer } from "./glyph-renderer.js";

test("particle renderer animates a background without sampling an image", () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const originalRaf = globalThis.requestAnimationFrame;
  const originalCancel = globalThis.cancelAnimationFrame;
  let fillCalls = 0;
  let rafCalls = 0;
  const context = {
    setTransform() {}, clearRect() {}, fillRect() {}, beginPath() {}, arc() {}, fill() {},
    get fillStyle() { return ""; }, set fillStyle(_) { fillCalls += 1; },
  };
  globalThis.document = { hidden: false, addEventListener() {}, removeEventListener() {} };
  globalThis.window = { devicePixelRatio: 1, innerWidth: 390, matchMedia: () => ({ matches: false }) };
  globalThis.requestAnimationFrame = (callback) => { rafCalls += 1; return 1; };
  globalThis.cancelAnimationFrame = () => {};
  try {
    const canvas = { clientWidth: 320, clientHeight: 180, getContext: () => context };
    const renderer = createParticleRenderer(canvas, { count: 8, seed: 7 });
    assert.equal(renderer.fallback, false);
    assert.equal(renderer.renderStatic(), true);
    assert.ok(fillCalls > 8);
    assert.equal(renderer.play(), true);
    assert.equal(rafCalls, 1);
    renderer.destroy();
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
    globalThis.requestAnimationFrame = originalRaf;
    globalThis.cancelAnimationFrame = originalCancel;
  }
});

test("particle renderer respects reduced motion without scheduling frames", () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const originalRaf = globalThis.requestAnimationFrame;
  let scheduled = 0;
  const context = { setTransform() {}, clearRect() {}, fillRect() {}, beginPath() {}, arc() {}, fill() {} };
  globalThis.document = { hidden: false, addEventListener() {}, removeEventListener() {} };
  globalThis.window = { devicePixelRatio: 1, matchMedia: () => ({ matches: true }) };
  globalThis.requestAnimationFrame = () => { scheduled += 1; return 1; };
  try {
    const renderer = createParticleRenderer({ clientWidth: 320, clientHeight: 180, getContext: () => context });
    assert.equal(renderer.play(), true);
    assert.equal(scheduled, 0);
    renderer.destroy();
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
    globalThis.requestAnimationFrame = originalRaf;
  }
});

test("data-field renderer draws a dense character matrix and talent fragments", () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  let fillTextCalls = 0;
  let strokeCalls = 0;
  const context = {
    setTransform() {}, clearRect() {}, fillRect() {}, beginPath() {}, arc() {}, fill() {},
    moveTo() {}, lineTo() {},
    fillText() { fillTextCalls += 1; },
    stroke() { strokeCalls += 1; },
    set fillStyle(_) {}, set globalAlpha(_) {}, set font(_) {}, set lineWidth(_) {},
  };
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

test("loading data field renders highlighted strings without an image source", () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  let fillTextCalls = 0;
  const context = {
    setTransform() {}, clearRect() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
    fillText() { fillTextCalls += 1; },
    set fillStyle(_) {}, set globalAlpha(_) {}, set font(_) {}, set textBaseline(_) {}, set lineWidth(_) {},
  };
  globalThis.document = { hidden: false, addEventListener() {}, removeEventListener() {} };
  globalThis.window = { devicePixelRatio: 1, innerWidth: 1440, matchMedia: () => ({ matches: true }) };
  try {
    const renderer = createParticleRenderer({ clientWidth: 640, clientHeight: 520, getContext: () => context }, {
      palette: ["#1769AA", "#2CB7A5", "#F5C451"], background: "#05070B", count: 3200,
      talentWords: ["语言", "逻辑", "空间"], mode: "loading",
    });
    assert.equal(renderer.play({ mode: "loading", highlightWords: ["读取", "天赋", "地图"] }), true);
    assert.ok(fillTextCalls >= 2800);
    renderer.destroy();
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
  }
});

test("loading field keeps character positions fixed while reveal progress changes brightness", () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const draws = [];
  const context = {
    setTransform() {}, clearRect() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
    fillText(text, x, y) { draws.push({ text, x, y, alpha: this.globalAlpha }); },
    set fillStyle(_) {}, set globalAlpha(value) { this._alpha = value; }, get globalAlpha() { return this._alpha; }, set font(_) {}, set textBaseline(_) {}, set lineWidth(_) {},
  };
  globalThis.document = { hidden: false, addEventListener() {}, removeEventListener() {} };
  globalThis.window = { devicePixelRatio: 1, innerWidth: 1440, matchMedia: () => ({ matches: true }) };
  try {
    const renderer = createParticleRenderer({ clientWidth: 640, clientHeight: 520, getContext: () => context }, {
      palette: ["#1769AA", "#2CB7A5"], background: "#05070B", count: 3200, seed: 7, mode: "loading", talentWords: ["语言", "天赋"],
    });
    renderer.renderStatic(1000, { mode: "loading", progress: 0.2, highlightWords: ["读取", "天赋"] });
    const first = draws.slice(); draws.length = 0;
    renderer.renderStatic(1000, { mode: "loading", progress: 0.8, highlightWords: ["读取", "天赋"] });
    const second = draws.slice();
    assert.equal(first.length, second.length);
    assert.deepEqual(first.map(({ x, y }) => ({ x, y })), second.map(({ x, y }) => ({ x, y })));
    assert.notDeepEqual(first.map(({ alpha }) => alpha), second.map(({ alpha }) => alpha));
    renderer.destroy();
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
  }
});

test("loading animation advances reveal progress from the animation clock", () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const originalRaf = globalThis.requestAnimationFrame;
  const progresses = [];
  const context = { setTransform() {}, clearRect() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, fillText() {}, set fillStyle(_) {}, set globalAlpha(_) {}, set font(_) {}, set textBaseline(_) {}, set lineWidth(_) {} };
  globalThis.document = { hidden: false, addEventListener() {}, removeEventListener() {} };
  globalThis.window = { devicePixelRatio: 1, innerWidth: 1440, matchMedia: () => ({ matches: false }) };
  globalThis.requestAnimationFrame = (callback) => { progresses.push(callback); return progresses.length; };
  try {
    const renderer = createParticleRenderer({ clientWidth: 640, clientHeight: 520, getContext: () => context }, { background: "#05070B", count: 3200, seed: 9, mode: "loading" });
    assert.equal(renderer.play({ mode: "loading" }), true);
    const firstFrame = progresses.shift();
    firstFrame(1000);
    const secondFrame = progresses.shift();
    secondFrame(2300);
    assert.equal(progresses.length, 1);
    renderer.destroy();
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
    globalThis.requestAnimationFrame = originalRaf;
  }
});

test("loading grid uses the reference symbols and a moving diagonal light band", () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const draws = [];
  const context = {
    setTransform() {}, clearRect() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
    fillText(text, x, y) { draws.push({ text, x, y, alpha: this.globalAlpha }); },
    set fillStyle(_) {}, set globalAlpha(value) { this._alpha = value; }, get globalAlpha() { return this._alpha; }, set font(_) {}, set textBaseline(_) {}, set lineWidth(_) {},
  };
  globalThis.document = { hidden: false, addEventListener() {}, removeEventListener() {} };
  globalThis.window = { devicePixelRatio: 1, innerWidth: 1440, matchMedia: () => ({ matches: true }) };
  try {
    const renderer = createParticleRenderer({ clientWidth: 640, clientHeight: 520, getContext: () => context }, { palette: ["#1769AA", "#2CB7A5"], background: "#05070B", count: 3200, seed: 5, mode: "loading" });
    renderer.renderStatic(0, { mode: "loading", progress: 0.2 });
    const first = draws.splice(0);
    renderer.renderStatic(0, { mode: "loading", progress: 0.8 });
    const second = draws.splice(0);
    assert.ok(first.some(({ text }) => ["·", "米", "日", "X", "田", "窗"].includes(text)));
    assert.deepEqual(first.map(({ x, y }) => ({ x, y })), second.map(({ x, y }) => ({ x, y })));
    assert.notDeepEqual(first.map(({ alpha }) => alpha), second.map(({ alpha }) => alpha));
    renderer.destroy();
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
  }
});

test("signal mode keeps the color strip visible under a transparent glyph layer", () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  let fillTextCalls = 0;
  let fillRectCalls = 0;
  const context = {
    setTransform() {}, clearRect() {}, fillRect() { fillRectCalls += 1; }, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
    fillText() { fillTextCalls += 1; },
    set fillStyle(_) {}, set globalAlpha(_) {}, set font(_) {}, set textBaseline(_) {}, set lineWidth(_) {},
  };
  globalThis.document = { hidden: false, addEventListener() {}, removeEventListener() {} };
  globalThis.window = { devicePixelRatio: 1, innerWidth: 1440, matchMedia: () => ({ matches: true }) };
  try {
    const renderer = createParticleRenderer({ clientWidth: 640, clientHeight: 34, getContext: () => context }, {
      palette: ["#1769AA", "#2CB7A5", "#F5C451"], background: "transparent", count: 720, seed: 41,
      talentWords: ["语言", "逻辑", "空间"], mode: "signal",
    });
    assert.equal(renderer.play({ mode: "signal", highlightWords: ["语言", "逻辑", "空间"] }), true);
    assert.ok(fillTextCalls >= 300);
    assert.equal(fillRectCalls, 0);
    renderer.destroy();
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
  }
});

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
  assert.deepEqual([0, 0.1, 0.5, 0.9, 1].map((value) => brightnessToGlyph(value)), [".", ":", "+", "%", "@"]);
});

test("relative luminance applies the specified decoded channel weights", () => {
  const expected = 0.2126 * srgbToLinear(0.25) + 0.7152 * srgbToLinear(0.5) + 0.0722 * srgbToLinear(0.75);
  assert.equal(relativeLuminance(0.25, 0.5, 0.75), expected);
});

test("linear color mixing stays opaque after blending with its background", () => {
  assert.match(mixLinearColor("#2CB7A5", "#142A43", 0.5), /^rgba\(\d+, \d+, \d+, 1\)$/);
});

test("glyph grid stays within the responsive density bands", () => {
  const desktopGrid = calculateGlyphGrid(560, 360, 1440);
  assert.ok(desktopGrid.columns >= 96 && desktopGrid.columns <= 120);
  assert.ok(desktopGrid.rows >= 56 && desktopGrid.rows <= 72);

  const mobileGrid = calculateGlyphGrid(320, 260, 320);
  assert.ok(mobileGrid.columns >= 52 && mobileGrid.columns <= 72);
  assert.ok(mobileGrid.rows >= 32 && mobileGrid.rows <= 46);
});

test("renderer safely falls back without browser APIs", async () => {
  const renderer = createGlyphRenderer(null);
  assert.equal(renderer.fallback, true);
  assert.equal(await renderer.load("missing"), "missing");
  renderer.renderStatic({}); renderer.play({ mode: "assembly" }); renderer.pause(); renderer.destroy();
});

test("renderer observes resize and removes lifecycle listeners on destroy", () => {
  const originalDocument = globalThis.document;
  const originalResizeObserver = globalThis.ResizeObserver;
  let observed = 0;
  let disconnected = 0;
  let added = 0;
  let removed = 0;
  const context = { setTransform() {}, clearRect() {}, fillRect() {}, fillText() {} };
  const samplingContext = { drawImage() {}, getImageData: () => ({ data: new Uint8ClampedArray([255, 255, 255, 255]) }) };
  globalThis.ResizeObserver = class {
    constructor() {}
    observe() { observed += 1; }
    disconnect() { disconnected += 1; }
  };
  globalThis.document = {
    hidden: false,
    createElement: () => ({ getContext: () => samplingContext }),
    addEventListener: () => { added += 1; },
    removeEventListener: () => { removed += 1; },
  };
  try {
    const canvas = { clientWidth: 10, clientHeight: 10, getContext: () => context };
    const renderer = createGlyphRenderer(canvas);
    assert.equal(observed, 1);
    assert.equal(added, 1);
    renderer.destroy();
    assert.equal(disconnected, 1);
    assert.equal(removed, 1);
  } finally {
    globalThis.document = originalDocument;
    globalThis.ResizeObserver = originalResizeObserver;
  }
});

test("renderer does not schedule assembly frames when reduced motion is preferred", () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const originalResizeObserver = globalThis.ResizeObserver;
  const originalRaf = globalThis.requestAnimationFrame;
  let scheduled = 0;
  const context = { setTransform() {}, clearRect() {}, fillRect() {}, fillText() {} };
  const samplingContext = { drawImage() {}, getImageData: () => ({ data: new Uint8ClampedArray([255, 255, 255, 255]) }) };
  globalThis.ResizeObserver = undefined;
  globalThis.window = { devicePixelRatio: 1, matchMedia: () => ({ matches: true }) };
  globalThis.requestAnimationFrame = () => { scheduled += 1; return 1; };
  globalThis.document = {
    hidden: false,
    createElement: () => ({ getContext: () => samplingContext }),
    addEventListener() {},
    removeEventListener() {},
  };
  try {
    const renderer = createGlyphRenderer({ clientWidth: 320, clientHeight: 260, getContext: () => context });
    renderer.play({ source: { width: 1, height: 1 }, mode: "assembly", duration: 2600 });
    assert.equal(scheduled, 0);
    renderer.destroy();
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
    globalThis.ResizeObserver = originalResizeObserver;
    globalThis.requestAnimationFrame = originalRaf;
  }
});

test("renderer reports sampling failures so the image fallback remains visible", () => {
  const originalDocument = globalThis.document;
  const originalResizeObserver = globalThis.ResizeObserver;
  const context = { setTransform() {}, clearRect() {}, fillRect() {}, fillText() {} };
  const samplingContext = { drawImage() {}, getImageData: () => { throw new Error("tainted canvas"); } };
  globalThis.ResizeObserver = undefined;
  globalThis.document = {
    hidden: false,
    createElement: () => ({ getContext: () => samplingContext }),
    addEventListener() {},
    removeEventListener() {},
  };
  try {
    const renderer = createGlyphRenderer({ clientWidth: 320, clientHeight: 260, getContext: () => context });
    assert.equal(renderer.renderStatic({ source: { width: 1, height: 1 } }), false);
    renderer.destroy();
  } finally {
    globalThis.document = originalDocument;
    globalThis.ResizeObserver = originalResizeObserver;
  }
});
