import assert from "node:assert/strict";
import test from "node:test";
import { formatAnswerOption, formatMbtiType } from "./view.mjs";

test("选项字母按当前显示顺序生成", () => {
  assert.equal(formatAnswerOption(0, "第一个显示选项"), "A. 第一个显示选项");
  assert.equal(formatAnswerOption(3, "第四个显示选项"), "D. 第四个显示选项");
});

test("结果类型同时显示代码和常见人格称谓", () => {
  assert.equal(formatMbtiType({ code: "INTJ", mbtiName: "建筑师" }), "INTJ · 建筑师");
});
