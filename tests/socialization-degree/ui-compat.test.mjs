import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("./style.css", import.meta.url), "utf8");

test("社会化页面接入唯一产品ID和真实题库模型", () => {
  assert.match(html, /const PRODUCT_ID = "socialization-degree"/);
  assert.match(html, /import \{ DIMENSIONS, QUESTIONS, RESULTS, STAGES \} from "\.\/data\.mjs"/);
  assert.match(html, /import \{ calculateProfile \} from "\.\/model\.mjs"/);
  assert.match(html, /QUESTIONS\.length/);
});

test("页面包含完整测试流程和结果操作", () => {
  for (const id of ["home-screen", "quiz-screen", "loading-screen", "result-screen", "poster-modal", "cashback-modal"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  for (const id of ["start-btn", "prev-btn", "save-poster-btn", "copy-btn", "restart-btn", "cashback-btn", "radar-svg", "dimension-list", "behavior-pattern-text"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
});

test("历史回放恢复快照并使用公共回放模块显示结果", () => {
  assert.match(html, /YunduHistoryReplay\.init\(PRODUCT_ID, renderHistorySnapshot, \(\) => showScreen\("result-screen"\)\)/);
  assert.match(html, /function renderHistorySnapshot\(snapshot\)/);
  assert.match(html, /snapshot\.dimensions\.map/);
});

test("结果页在综合评价前提供行为模式板块", () => {
  assert.match(html, /BEHAVIOR PATTERN/);
  assert.match(html, /你的行为模式/);
  assert.match(html, /behavior-pattern-text/);
  assert.match(html, /title: "行为模式"/);
});

test("结果先确认优势，再给出下一步练习方向", () => {
  assert.match(html, /你已经在使用的优势是/);
  assert.match(html, /这是可以继续依靠的优势/);
  assert.match(html, /下一步优先练习/);
  assert.match(html, /阶段表示当前常见场景的应对稳定度，不是好坏评级/);
});

test("页面不把测试码写死，海报使用本产品独立二维码", () => {
  assert.doesNotMatch(html, /ACCESS_CODE\s*=|validCode\s*:/);
  assert.match(html, /fetch\("\/api\/verify-code"/);
  assert.match(html, /product-qrs\/socialization-degree\.png/);
});

test("移动端布局限制横向溢出并保持答题选项可点击高度", () => {
  assert.match(css, /min-width:\s*320px/);
  assert.match(css, /\.answer-btn\s*\{[^}]*min-height:\s*64px/s);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /\.answer-btn\s*\{\s*min-height:\s*58px/s);
});

test("页面支持浅色主题切换并记住用户选择", () => {
  assert.match(html, /id="theme-toggle"/);
  assert.match(html, /aria-pressed="false"/);
  assert.match(html, /socialization-degree-theme/);
  assert.match(html, /localStorage\.setItem\(THEME_KEY, nextTheme\)/);
  assert.match(css, /html\[data-theme="light"\]/);
  for (const variable of ["--page-bg", "--control-bg", "--card-bg", "--highlight-bg", "--track-bg"]) {
    assert.match(css, new RegExp(`${variable}:`));
  }
});
