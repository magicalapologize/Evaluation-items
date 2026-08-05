import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const roundedRectSource = html.match(/function roundedRect\([\s\S]+?\n    }\n\n    function wrappedLines/);

assert.ok(roundedRectSource, "应能读取海报圆角绘制函数");

const roundedRect = Function(
  `${roundedRectSource[0].replace(/\n\n    function wrappedLines$/, "")}; return roundedRect;`
)();

test("海报圆角绘制兼容不支持 ctx.roundRect 的旧版浏览器", () => {
  const calls = [];
  const ctx = {
    beginPath: () => calls.push("beginPath"),
    moveTo: () => calls.push("moveTo"),
    lineTo: () => calls.push("lineTo"),
    arcTo: () => calls.push("arcTo"),
    closePath: () => calls.push("closePath"),
    fill: () => calls.push("fill"),
    stroke: () => calls.push("stroke")
  };

  assert.doesNotThrow(() => roundedRect(ctx, 0, 0, 120, 60, 12, "#000"));
  assert.ok(calls.includes("arcTo"), "旧版浏览器应走 arcTo 圆角路径");
  assert.ok(calls.includes("fill"), "圆角区域应正常填充");
});
