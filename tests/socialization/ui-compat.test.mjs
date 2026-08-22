import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("./style.css", import.meta.url), "utf8");

test("社会化页面接入唯一产品ID和真实题库模型", () => {
  assert.match(html, /const PRODUCT_ID = "socialization-degree"/);
  assert.match(html, /import \{ DIMENSIONS, QUESTIONS \} from "\.\/data\.mjs"/);
  assert.match(html, /import \{ calculateProfile \} from "\.\/model\.mjs"/);
  assert.match(html, /QUESTIONS\.length/);
});

test("页面包含完整测试流程和结果操作", () => {
  for (const id of ["home-screen", "quiz-screen", "loading-screen", "result-screen", "poster-modal", "cashback-modal"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  for (const id of ["start-btn", "prev-btn", "save-poster-btn", "copy-btn", "restart-btn", "cashback-btn", "radar-svg", "dimension-list"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
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
