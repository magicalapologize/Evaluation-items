import test from "node:test";
import assert from "node:assert/strict";
import { brightnessToGlyph, linearToSrgb, mixLinearColor, relativeLuminance, srgbToLinear, createGlyphRenderer } from "./glyph-renderer.js";

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

test("color mixing returns bounded rgba components", () => {
  assert.match(mixLinearColor("#2CB7A5", "#142A43", 0.5), /^rgba\(\d+, \d+, \d+, 0\.5\)$/);
});

test("renderer safely falls back without browser APIs", async () => {
  const renderer = createGlyphRenderer(null);
  assert.equal(renderer.fallback, true);
  assert.equal(await renderer.load("missing"), "missing");
  renderer.renderStatic({}); renderer.play({ mode: "assembly" }); renderer.pause(); renderer.destroy();
});
