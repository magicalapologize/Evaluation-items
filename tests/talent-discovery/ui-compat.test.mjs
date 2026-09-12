import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const root = new URL("./", import.meta.url);
const html = readFileSync(new URL("index.html", root), "utf8");
const css = readFileSync(new URL("style.css", root), "utf8");
const app = readFileSync(new URL("app.js", root), "utf8");
const renderer = readFileSync(new URL("glyph-renderer.js", root), "utf8");
test("talent discovery page keeps its public UI contract", () => {
  assert.match(html, /talent-discovery/);
  for (const label of ["语言表达天赋", "逻辑推演天赋", "空间想象天赋", "身体实践天赋", "音乐节奏天赋", "人际感知天赋", "内在觉察天赋", "自然观察天赋"]) assert.match(readFileSync(new URL("data.mjs", root), "utf8"), new RegExp(label));
  for (const heading of ["你的最佳天赋评估", "8 项天赋综合解读", "4 项活跃天赋深入分析", "解锁隐藏天赋潜能", "规避潜在发展瓶颈", "锁定优势职业赛道", "掌握天赋拓展策略", "定位个人竞争力", "获取进阶成长方案"]) assert.match(html, new RegExp(heading));
  assert.match(html, /多元智能理论/); assert.match(html, /\/api\/verify-code/); assert.match(app, /product-qrs\/talent-discovery\.png/); assert.match(html, /HistoryReplay|history-replay/);
  assert.match(html, /id="cashback-modal"[\s\S]*wechat-qr\.webp/); assert.doesNotMatch(html, /id="cashback-modal"[\s\S]*product-qrs\/talent-discovery\.png/);
});
test("visual contract includes palette, mobile layout and isolated selected state", () => {
  for (const color of ["#142A43", "#2CB7A5", "#FF8A65", "#F5C451", "#F5F8F6", "#FFFFFF", "#DDE7E4"]) assert.match(css, new RegExp(color, "i"));
  assert.match(css, /@media[^}]*max-width/); assert.match(css, /\.answer-btn\{[^}]*min-height:68px/); assert.doesNotMatch(css, /\.answer-btn:hover,\s*\.answer-btn\.selected/);
});

test("particle backgrounds mount while the quiz header stays lightweight", () => {
  for (const id of ["home-particle-canvas", "loading-glyph-canvas", "result-particle-canvas"]) {
    assert.match(html, new RegExp(`<canvas[^>]+id=["']${id}["'][^>]*aria-hidden=["']true["']`));
  }
  assert.equal((html.match(/data-glyph-fallback/g) || []).length, 0);
  assert.match(html, /home-particle-canvas[\s\S]*home-hero\.png/);
  assert.match(html, /result-particle-canvas[\s\S]*language\.png/);
  assert.doesNotMatch(html, /id="quiz-particle-canvas"/);
  assert.match(css, /prefers-reduced-motion\s*:\s*reduce/);
  assert.doesNotMatch(html, /quiz-signal-(?:band|canvas|block)/);
  assert.doesNotMatch(css, /quiz-signal-(?:band|canvas|block)/);
});

test("data field stays behind the original artwork", () => {
  assert.match(css, /--data-field-bg\s*:\s*#05070B/i);
  assert.match(css, /\.particle-background[^}]*z-index\s*:\s*0/);
  assert.match(css, /\.glyph-surface canvas[^}]*z-index\s*:\s*1/);
  assert.match(css, /\.glyph-surface img:not\(\.glyph-fallback\)[^}]*z-index\s*:\s*2/);
  assert.match(html, /id="result-visual-image"[^>]+src="language\.png"/);
  assert.doesNotMatch(html, /id="result-visual-image"[^>]+hidden/);
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

test("home and result fields receive talent words and dark data-field settings", () => {
  assert.match(app, /talentWords\s*:/);
  assert.match(app, /bestKey\s*:/);
  assert.match(app, /background:\s*["']#05070B["']/);
  assert.match(app, /count:\s*(?:3\d{3}|[12]\d{3})/);
  assert.match(app, /homeParticleRenderer\?\.destroy\(\)/);
});

test("result title keeps the colored talent name together on its own line", () => {
  assert.match(css, /\.report-hero h1 strong\s*\{[^}]*display\s*:\s*block/);
  assert.match(css, /\.report-hero h1 strong\s*\{[^}]*white-space\s*:\s*nowrap/);
});

test("result sections use subdued Roman indices and modular shells", () => {
  assert.equal((html.match(/class="report-section-index"/g) || []).length, 9);
  assert.match(html, /class="report-section-index" aria-hidden="true">I<\/span>/);
  assert.match(html, /class="report-section-index" aria-hidden="true">IX<\/span>/);
  assert.match(css, /\.report-section\s*\{[^}]*border:\s*1px[^}]*border-radius/);
  assert.match(css, /\.report-section-index\s*\{[^}]*opacity:/);
  assert.match(css, /\.report-section h2\s*\{[^}]*display:\s*flex/);
  assert.match(css, /@media\s*\(max-width:760px\)[\s\S]*\.report-section\s*\{/);
  assert.doesNotMatch(html, /<h2>0[1-9]｜/);
});

test("radar labels are bold and ranked dimensions use short names with level hints", () => {
  assert.match(app, /font-size="11" font-weight="800" fill="\$\{dimension\.color\}"/);
  assert.match(app, /talentLevel\(score\)/);
  assert.match(app, /dimension-level-\$\{level\.key\}/);
  assert.match(app, /esc\(dimension\.short\)/);
  assert.match(css, /\.dimension-item\s*\{[^}]*grid-template-columns:[^}]*78px/);
  assert.match(css, /\.dimension-level\s*\{[^}]*white-space:\s*nowrap/);
});

test("growth reminder is presented as a highlighted closing card", () => {
  assert.match(html, /<blockquote id="result-reminder"><\/blockquote>/);
  assert.match(css, /#result-reminder\s*\{[^}]*background:[^;]+/);
  assert.doesNotMatch(css, /#result-reminder::before/);
});

test("loading particle field preserves the three-second finish contract", () => {
  const finishStart = app.indexOf("function finish()");
  const finishSource = app.slice(finishStart, app.indexOf('$("start-btn")', finishStart));
  assert.match(finishSource, /loading-glyph-canvas|renderLoadingParticles/);
  assert.match(app, /play\(\{[^}]*mode:\s*["']loading["'][^}]*highlightWords/);
  assert.match(finishSource, /setTimeout\(\(\)\s*=>[\s\S]*?\},\s*1000\)/);
  assert.match(finishSource, /setTimeout\(\(\)\s*=>[\s\S]*?\},\s*2200\)/);
  assert.match(finishSource, /setTimeout\(\(\)\s*=>[\s\S]*?calculateProfile\(state\.answers\)[\s\S]*?\},\s*3000\)/);
  assert.equal((finishSource.match(/calculateProfile\(state\.answers\)/g) || []).length, 1);
  assert.ok(finishSource.indexOf("calculateProfile(state.answers)") > finishSource.indexOf("}, 2200)"));
  assert.doesNotMatch(css, /\.signal-map\b/);
});

test("loading particle field uses the dark data field and talent fragments", () => {
  assert.match(app, /function renderLoadingParticles[\s\S]*talentWords/);
  assert.match(app, /function renderLoadingParticles[\s\S]*background:\s*["']#05070B["']/);
  assert.match(app, /highlightWords:\s*\["天赋"\]/);
  assert.doesNotMatch(app, /shape:\s*["']talent-map["']/);
  assert.match(renderer, /RAINBOW_COLORS\s*=\s*\[/);
  assert.doesNotMatch(html, /data-glyph-fallback/);
  assert.doesNotMatch(app, /renderer\.load\("home-hero\.png"\)/);
});

test("quiz screen uses the clean navy header and pale reading surface", () => {
  assert.doesNotMatch(html, /id="quiz-particle-canvas"/);
  assert.doesNotMatch(app, /renderQuizParticles|quizParticleRenderer|renderQuizSignal|quizSignalRenderer/);
  assert.match(css, /\.quiz-screen\s*\{[^}]*background:\s*#05070B/i);
  assert.match(css, /\.quiz-card\s*\{[^}]*max-width:\s*1180px/);
  assert.match(css, /\.quiz-head\s*\{[^}]*background:\s*#142A43/);
  assert.doesNotMatch(css, /\.quiz-particle-background\s*\{/);
  assert.match(css, /\.question-block\s*\{[^}]*background:\s*#fff/);
});

test("quiz answer interactions are touch-safe and isolate hover to fine pointers", () => {
  assert.match(css, /@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*\{[\s\S]*\.answer-btn:hover/);
  assert.doesNotMatch(css, /\.answer-btn:hover\s*,\s*\.answer-btn\.selected/);
  assert.match(css, /\.answer-btn\s*\{[^}]*touch-action:\s*manipulation/);
  assert.match(app, /activeElement\s*&&\s*\$\("answer-list"\)\.contains\(activeElement\)\)\s*activeElement\.blur\(\)/);
  assert.match(app, /button\.classList\.add\("selected"\);\s*button\.blur\(\)/);
  assert.match(app, /setTimeout\(\(\)\s*=>\s*\{[\s\S]*?renderQuestion\(\)[\s\S]*?\},\s*80\)/);
});

test("particle renderers stop when their screen is left", () => {
  assert.match(app, /function stopRenderer\(rendererName\)/);
  assert.match(app, /homeParticleRenderer\?\.destroy\(\)/);
  assert.match(app, /loadingParticleRenderer\?\.destroy\(\)/);
  assert.match(app, /resultParticleRenderer\?\.destroy\(\)/);
  assert.match(app, /if \(id !== "home-screen"\)/);
  assert.match(app, /if \(id !== "result-screen"\)/);
});

test("talent discovery shares access codes and exposes the member path", () => {
  assert.match(html, /id="member-unlock"[^>]*class="member-unlock"[\s\S]*id="member-plan-label"/);
  assert.match(html, /天赋职业评估与天赋挖掘测试使用同一个测试码/);
  assert.match(app, /function applyMemberAccess\(member\)/);
  assert.match(app, /globalThis\.YunduMember\?\.getMember/);
  assert.match(app, /if \(!activeMember\)/);
  assert.match(app, /member-access-active/);
  assert.match(app, /member-access-hidden/);
});
