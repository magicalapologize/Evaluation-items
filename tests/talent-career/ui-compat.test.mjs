import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("./", import.meta.url);
const html = readFileSync(new URL("index.html", root), "utf8");
const css = readFileSync(new URL("style.css", root), "utf8");
const app = readFileSync(new URL("app.js", root), "utf8");

test("talent career recommends talent discovery with the shared code", () => {
  assert.match(html, /class="recommended-test"[^>]*aria-label="推荐测试"/);
  assert.match(html, /href="\.\.\/talent-discovery\/"/);
  assert.match(html, /推荐测试/);
  assert.match(html, /天赋挖掘测试｜找到你的天赋领域/);
  assert.match(html, /与本测试使用同一个测试码/);
  assert.match(html, /天赋职业评估与天赋挖掘测试使用同一个测试码/);
  assert.match(css, /\.recommended-test a\s*\{[^}]*display:\s*grid/);
  assert.match(css, /@media\s*\(max-width:\s*640px\)[\s\S]*\.recommended-test a/);
});

test("talent career keeps member access free of code entry", () => {
  assert.match(html, /id="member-plan-label"/);
  assert.match(app, /function applyMemberAccess\(member\)/);
  assert.match(app, /await memberReady/);
  assert.match(app, /if \(!activeMember\) await verifyAccessCode\(code\)/);
});
