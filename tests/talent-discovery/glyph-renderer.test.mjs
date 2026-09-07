import test from "node:test";
import assert from "node:assert/strict";
import { brightnessToGlyph, calculateGlyphGrid, linearToSrgb, mixLinearColor, relativeLuminance, srgbToLinear, createGlyphRenderer } from "./glyph-renderer.js";

test("sRGB and linear conversion stays in range", () => {
  for (const value of [0, 0.1, 0.5, 1]) {
    const linear = srgbToLinear(value);
    assert.ok(Number.isFinite(linear) && linear >= 0 && linear <= 1);
    assert.ok(Math.abs(linearToSrgb(linear) - value) < 0.000001);
  }
});

test("relative luminance uses linear channels", () => {
  assert.equal(relativeLuminance(0, 0, 0), 0);
  assert.equal(relativeLuminance(1, 1, 1), 0.357);
  assert.ok(relativeLuminance(1, 1, 1) > relativeLuminance(0.2, 0.2, 0.2));
});

test("brightness mapping is monotonic", () => {
  assert.deepEqual([0, 0.1, 0.5, 0.9, 1].map((value) => brightnessToGlyph(value)), [".", ":", "+", "%", "@"]);
});

test("relative luminance applies the specified decoded channel weights", () => {
  const expected = 0.2126 * srgbToLinear(0.25) + 0.0722 * srgbToLinear(0.5) + 0.0722 * srgbToLinear(0.75);
  assert.equal(relativeLuminance(0.25, 0.5, 0.75), expected);
});

test("color mixing returns bounded rgba components", () => {
  assert.match(mixLinearColor("#2CB7A5", "#142A43", 0.5), /^rgba\(\d+, \d+, \d+, 0\.5\)$/);
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
