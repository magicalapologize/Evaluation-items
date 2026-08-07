import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Script } from "node:vm";

const read = (path) => readFileSync(path, "utf8");

function pageSource(product) {
  const html = read("tests/" + product + "/index.html");
  const localScripts = [...html.matchAll(/<script([^>]*)\ssrc="([^"]+)"[^>]*>/g)]
    .map(([, , src]) => src.split("?")[0])
    .filter((src) => !src.startsWith("/") && !/^[a-z][a-z0-9+.-]*:/i.test(src))
    .map((src) => read("tests/" + product + "/" + src.replace(/^\.\//, "").replace(/^\.\.\//, "../")))
    .join("\n");
  return html + "\n" + localScripts;
}

test("历史页加载公共模块并提供记录列表", () => {
  const html = read("history/index.html");
  assert.match(html, /test-history\.css/);
  assert.match(html, /test-history\.js/);
  assert.match(html, /history-page\.js/);
  assert.match(html, /id="history-list"/);
  assert.doesNotMatch(html, /id="history-detail"/);
});

test("快照内容不通过 innerHTML 渲染", () => {
  const script = read("assets/js/history-page.js");
  assert.doesNotMatch(script, /\.innerHTML\s*=/);
  assert.match(script, /textContent/);
});

test("历史页不会把 HTML 错误页当作 JSON 解析", () => {
  assert.match(read("assets/js/history-page.js"), /content-type/);
  assert.match(read("assets/js/member-history.js"), /content-type/);
});

test("独立历史页加载会员认证模块", () => {
  const html = read("history/index.html");
  assert.match(html, /member-auth\.js/);
});

test("会员中心包含历史记录区域", () => {
  const html = read("member/index.html");
  assert.match(html, /id="test-history"/);
  assert.match(html, /id="member-history-list"/);
  assert.match(html, /member-history\.js/);
});

test("本地预览明确拒绝会员历史接口", () => {
  const script = read("scripts/local-preview.mjs");
  assert.match(script, /api\/member\/results/);
  assert.match(script, /401/);
});

test("历史列表和会员中心直接跳转原结果页", () => {
  assert.match(read("assets/js/history-page.js"), /historyResultHref\(record, memberMode \? "member" : "local"\)/);
  assert.match(read("assets/js/member-history.js"), /historyResultHref\(record, "member"\)/);
  assert.doesNotMatch(read("assets/js/history-page.js"), /renderSnapshot/);
});

test("会员独立历史页先同步待上传记录", () => {
  const script = read("assets/js/history-page.js");
  assert.match(script, /await YunduHistory\.syncPending\(\);[\s\S]*requestJson\("\/api\/member\/results"\)/);
});

test("首页提供我的测试结果入口", () => {
  const html = read("index.html");
  assert.match(html, /id="history-entry"/);
  assert.match(html, />我的测试结果</);
  assert.match(html, /historyEntry\.href\s*=\s*"history\/\?member=1"/);
});

test("七宗罪历史入口使用居中的小按钮样式", () => {
  const html = read("tests/seven-sins/index.html");
  const css = read("tests/seven-sins/style.css");
  assert.match(html, /test-member\.css/);
  assert.match(css, /\.history-link-row\s*\{[^}]*text-align:\s*center/s);
  assert.match(css, /\.history-link\s*\{[^}]*border:/s);
});

const products = [
  "solo-business", "cultivation-protagonist", "love-personality",
  "workplace-madness", "three-kingdoms-advisor", "historical-emperor",
  "historical-heroines", "talent-career", "love-simulation", "seven-sins"
];

test("全部测试页的脚本结构可解析", () => {
  for (const product of products) {
    const html = read("tests/" + product + "/index.html");
    const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)]
      .filter(([, attrs]) => !attrs.includes("src=") && !attrs.includes("application/ld+json") && !attrs.includes("type=\"module\""));
    const localScriptRefs = [...html.matchAll(/<script[^>]*\ssrc="([^\"]+)"[^>]*>/g)]
      .map(([, src]) => src.split("?")[0])
      .filter((src) => !src.startsWith("/") && !/^[a-z][a-z0-9+.-]*:/i.test(src));
    assert.ok(scripts.length > 0 || localScriptRefs.length > 0, product + " 应包含内嵌或本地脚本");
    for (const [, , source] of scripts) {
      assert.doesNotThrow(() => new Script(source), product + " 内嵌脚本语法错误");
    }
  }
});

for (const product of products) {
  test(product + " 接入测试历史", () => {
    const html = pageSource(product);
    assert.match(html, /test-history\.js/);
    assert.match(html, /history-replay\.js/);
    assert.match(html, /YunduHistoryReplay\.init/);
    assert.match(html, /data-history-link/);
    assert.match(html, /YunduHistory\.saveResult/);
    assert.match(html, /schemaVersion:\s*1/);
    assert.match(html, /sections:/);
    assert.match(html, /dimensions:/);
  });
}
