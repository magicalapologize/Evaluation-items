import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { sectionMap, dimensionTuples } = require("../assets/js/history-replay.js");

test("报告区块按标题读取且维度转为原页面数据形状", () => {
  const snapshot = {
    sections: [{ title: "核心优势", body: "优势正文", items: [] }],
    dimensions: [{ name: "表达", value: 68, left: "克制", right: "直接" }]
  };
  assert.equal(sectionMap(snapshot).get("核心优势").body, "优势正文");
  assert.deepEqual(dimensionTuples(snapshot), [["表达", 68, "克制", "直接"]]);
});
