import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("./index.html", import.meta.url), "utf8");
const app = await readFile(new URL("./app.js", import.meta.url), "utf8");

test("页面包含模式选择和生存答题反馈节点", () => {
  ["mode-screen", "full-mode-btn", "survival-mode-btn", "survival-alert", "survival-feedback"].forEach((id) => {
    assert.match(html, new RegExp(`id=["']${id}["']`), id);
  });
});

test("页面包含独立生存结果和四个操作", () => {
  ["survival-result-screen", "survival-retry-btn", "survival-role-btn", "survival-full-btn", "survival-poster-btn"].forEach((id) => {
    assert.match(html, new RegExp(`id=["']${id}["']`), id);
  });
});

test("完整结果提供生存模式入口", () => {
  assert.match(html, /id=["']full-to-survival-btn["']/);
});

test("应用具有模式分流、生存结算和挑战卡生成逻辑", () => {
  assert.match(app, /mode:\s*["']full["']/);
  assert.match(app, /SURVIVAL_CONFIG/);
  assert.match(app, /settleSurvivalAnswer/);
  assert.match(app, /calculateSurvivalResult/);
  assert.match(app, /createSurvivalPosterImage/);
});

test("生存模式明确禁用上一题", () => {
  assert.match(app, /state\.mode\s*===\s*["']survival["']/);
  assert.match(app, /prev-btn/);
});

test("挑战卡使用现有心动副本商品二维码", () => {
  assert.match(app, /product-qrs\/love-simulation\.png/);
});
