import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const html = fs.readFileSync(new URL("./index.html", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("./style.css", import.meta.url), "utf8") + fs.readFileSync(new URL("./enhancements.css", import.meta.url), "utf8");
const app = fs.readFileSync(new URL("./app.js", import.meta.url), "utf8");

test("页面具备授权、答题、四轴报告和操作区契约", () => {
  for (const id of ["home-screen", "quiz-screen", "loading-screen", "result-screen", "access-code", "result-type", "axis-list", "attraction-ranking", "deep-insights", "advice-list", "reminder", "poster-modal", "cashback-modal"]) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /mbti-ideal-type/); assert.match(app, /\/api\/verify-code/); assert.match(app, /product-qrs\/mbti-ideal-type\.png/);
  assert.match(html, /本测试用于恋爱与长期关系中的偏好探索/); assert.match(app, /async function createPosterImage/); assert.match(html, /member-auth\.js/);
});

test("移动端答案和弹窗有稳定约束", () => { assert.match(css, /min-height:58px/); assert.match(css, /@media/); assert.match(css, /overflow:auto/); });

test("首页使用用户能理解的关系维度介绍", () => {
  assert.doesNotMatch(html, /把恋爱里的“心动”拆成四条偏好轴|4 条 MBTI 偏好轴/);
  assert.match(html, /相处方式、沟通习惯、生活节奏和长期价值观/);
  assert.match(html, /四个关系维度/);
});

test("结果页解释十六型排行的分数边界", () => {
  assert.match(html, /16 种 MBTI 吸引力排行/);
  assert.match(html, /相对偏好匹配/);
  assert.match(html, /不代表现实关系中的绝对匹配度/);
});

test("结果页提供四个详细关系解读板块", () => {
  assert.match(app, /insight\.title/);
  assert.match(html, /深入解读你的理想伴侣/);
  assert.match(app, /deep-insights/);
  assert.match(app, /insight\.body/);
});
