import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const html = fs.readFileSync(new URL("./index.html", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("./style.css", import.meta.url), "utf8");
const app = fs.readFileSync(new URL("./app.js", import.meta.url), "utf8");

test("页面具备授权、答题、四轴报告和操作区契约", () => {
  for (const id of ["home-screen", "quiz-screen", "loading-screen", "result-screen", "access-code", "axis-list", "advice-list", "reminder", "poster-modal", "cashback-modal"]) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /mbti-ideal-type/); assert.match(app, /\/api\/verify-code/); assert.match(app, /product-qrs\/mbti-ideal-type\.png/);
  assert.match(html, /本测试用于恋爱与长期关系中的偏好探索/); assert.match(app, /async function createPosterImage/); assert.match(html, /member-auth\.js/);
});

test("移动端答案和弹窗有稳定约束", () => { assert.match(css, /min-height:58px/); assert.match(css, /@media/); assert.match(css, /overflow:auto/); });
