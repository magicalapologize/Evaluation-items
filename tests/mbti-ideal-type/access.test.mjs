import assert from "node:assert/strict";
import test from "node:test";
import { isLocalPreviewLocation } from "./access.mjs";

test("只有指定本地预览地址可以免测试码", () => {
  assert.equal(isLocalPreviewLocation({ hostname: "127.0.0.1", port: "8765" }), true);
  assert.equal(isLocalPreviewLocation({ hostname: "127.0.0.1", port: "3000" }), false);
  assert.equal(isLocalPreviewLocation({ hostname: "localhost", port: "8765" }), false);
  assert.equal(isLocalPreviewLocation({ hostname: "magicassess.top", port: "" }), false);
});
