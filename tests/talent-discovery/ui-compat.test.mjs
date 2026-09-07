import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const root = new URL("./", import.meta.url);
const html = readFileSync(new URL("index.html", root), "utf8");
const css = readFileSync(new URL("style.css", root), "utf8");
const app = readFileSync(new URL("app.js", root), "utf8");
test("talent discovery page keeps its public UI contract", () => {
  assert.match(html, /talent-discovery/);
  for (const label of ["语言表达天赋", "逻辑推演天赋", "空间想象天赋", "身体实践天赋", "音乐节奏天赋", "人际感知天赋", "内在觉察天赋", "自然观察天赋"]) assert.match(readFileSync(new URL("data.mjs", root), "utf8"), new RegExp(label));
  for (const heading of ["01｜你的最佳天赋评估", "02｜8 项天赋综合解读", "03｜4 项活跃天赋深入分析", "04｜解锁隐藏天赋潜能", "05｜规避潜在发展瓶颈", "06｜锁定优势职业赛道", "07｜掌握天赋拓展策略", "08｜定位个人竞争力", "09｜获取进阶成长方案"]) assert.match(html, new RegExp(heading));
  assert.match(html, /多元智能理论/); assert.match(html, /\/api\/verify-code/); assert.match(app, /product-qrs\/talent-discovery\.png/); assert.match(html, /HistoryReplay|history-replay/);
  assert.match(html, /id="cashback-modal"[\s\S]*wechat-qr\.webp/); assert.doesNotMatch(html, /id="cashback-modal"[\s\S]*product-qrs\/talent-discovery\.png/);
});
test("visual contract includes palette, mobile layout and isolated selected state", () => {
  for (const color of ["#142A43", "#2CB7A5", "#FF8A65", "#F5C451", "#F5F8F6", "#FFFFFF", "#DDE7E4"]) assert.match(css, new RegExp(color, "i"));
  assert.match(css, /@media[^}]*max-width/); assert.match(css, /\.answer-btn\{[^}]*min-height:68px/); assert.doesNotMatch(css, /\.answer-btn:hover,\s*\.answer-btn\.selected/);
});

test("particle background mounts and quiz signal band keep a stable visual contract", () => {
  for (const id of ["home-particle-canvas", "loading-glyph-canvas", "result-particle-canvas"]) {
    assert.match(html, new RegExp(`<canvas[^>]+id=["']${id}["'][^>]*aria-hidden=["']true["']`));
  }
  assert.equal((html.match(/data-glyph-fallback/g) || []).length, 1);
  assert.match(html, /home-particle-canvas[\s\S]*home-hero\.png/);
  assert.match(html, /result-particle-canvas[\s\S]*language\.png/);
  assert.equal((html.match(/class=["'][^"']*quiz-signal-block[^"']*["']/g) || []).length, 8);
  assert.match(css, /@keyframes\s+quiz-signal-drift/);
  assert.match(css, /quiz-signal-block[^}]*transform/);
  assert.match(css, /quiz-signal-block[^}]*opacity/);
  assert.match(css, /prefers-reduced-motion\s*:\s*reduce/);
  assert.match(css, /quiz-signal-band[^}]*pointer-events\s*:\s*none/);
  assert.match(css, /quiz-signal-block[^}]*min-height\s*:\s*\d+px/);
});

test("home and result particle integration keeps explicit assets and renderer lifecycle", () => {
  assert.match(app, /import\s*\{[\s\S]*createParticleRenderer[\s\S]*\}\s*from\s*["']\.\/glyph-renderer\.js["']/);
  assert.match(app, /home-particle-canvas/);
  assert.match(app, /result-particle-canvas/);
  for (const [key, file] of Object.entries({
    language: "language.png",
    logic: "logic.png",
    spatial: "spatial.png",
    body: "body.png",
    music: "music.png",
    interpersonal: "interpersonal.png",
    introspection: "introspection.png",
    nature: "nature.png",
  })) {
    assert.match(app, new RegExp(`${key}\\s*:\\s*["']${file.replace(".", "\\.")}["']`));
  }
  assert.match(app, /resultParticleRenderer\?\.destroy\(\)/);
  assert.match(css, /\.report-hero\s*\{[^}]*position\s*:\s*relative/);
  assert.match(css, /\.particle-background\s*\{[^}]*position\s*:\s*absolute/);
  assert.match(css, /\.result-glyph-surface\s*\{[^}]*width\s*:\s*min\(360px,100%\)[^}]*height\s*:\s*420px/);
  assert.doesNotMatch(html, /result-glyph-surface[^>]*>[\s\S]*result-glyph-canvas/);
});

test("loading glyph assembly preserves the three-second finish contract", () => {
  const finishSource = app.slice(app.indexOf("function finish()"), app.indexOf('$("start-btn")'));
  assert.match(finishSource, /loading-glyph-canvas|renderLoadingGlyph/);
  assert.match(app, /play\(\{[^}]*mode:\s*["']assembly["'][^}]*duration:\s*2600/);
  assert.match(finishSource, /setTimeout\(\(\)\s*=>[\s\S]*?\},\s*1000\)/);
  assert.match(finishSource, /setTimeout\(\(\)\s*=>[\s\S]*?\},\s*2200\)/);
  assert.match(finishSource, /setTimeout\(\(\)\s*=>[\s\S]*?calculateProfile\(state\.answers\)[\s\S]*?\},\s*3000\)/);
  assert.equal((finishSource.match(/calculateProfile\(state\.answers\)/g) || []).length, 1);
  assert.ok(finishSource.indexOf("calculateProfile(state.answers)") > finishSource.indexOf("}, 2200)"));
  assert.doesNotMatch(css, /\.signal-map\b/);
});
