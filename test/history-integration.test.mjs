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

test("独立历史页自动识别已登录会员", () => {
  const script = read("assets/js/history-page.js");
  assert.match(script, /YunduMember\.getMember\(\)/);
  assert.match(script, /memberMode\s*=\s*Boolean\(member\?\.authenticated\)/);
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

test("会员中心只预览最新两条测试记录", async () => {
  function element() {
    return {
      children: [], className: "", textContent: "", hidden: false,
      append(...children) { this.children.push(...children); },
      removeChild(child) { this.children.splice(this.children.indexOf(child), 1); },
      addEventListener() {},
      get firstChild() { return this.children[0] || null; }
    };
  }

  const section = element();
  const list = element();
  const message = element();
  let onMember;
  const document = {
    getElementById(id) {
      return { "test-history": section, "member-history-list": list, "member-history-message": message }[id];
    },
    createElement: element,
    addEventListener(type, listener) {
      if (type === "yundu:member") onMember = listener;
    }
  };
  const records = [1, 2, 3, 4].map((value) => ({
    id: `record-${value}`,
    productId: "seven-sins",
    productTitle: `测试 ${value}`,
    resultName: `结果 ${value}`,
    createdAt: `2026-08-0${9 - value}T12:00:00.000Z`
  }));
  const fetch = async () => ({
    ok: true,
    headers: { get: () => "application/json" },
    json: async () => ({ success: true, records })
  });
  const YunduHistory = {
    syncPending: async () => {},
    historyResultHref: (record) => `/tests/${record.productId}/?history=${record.id}&source=member`
  };

  new Script(read("assets/js/member-history.js")).runInNewContext({
    document, fetch, YunduHistory, window: { confirm: () => true }, Date, encodeURIComponent
  });
  await onMember({ detail: { authenticated: true } });

  assert.equal(list.children.length, 2);
  assert.deepEqual(list.children.map((item) => item.children[0].children[1].textContent), ["结果 1", "结果 2"]);
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
  const css = read("assets/css/preview.css");
  assert.match(html, /id="history-entry"/);
  assert.match(html, /class="nav-label-full">我的测试结果</);
  assert.match(html, /class="nav-label-short">记录</);
  assert.doesNotMatch(html, /historyEntry\.href\s*=\s*"history\/\?member=1"/);
  assert.doesNotMatch(html, /<script\s+defer\s+src="assets\/js\/member-auth\.js/);
  assert.match(css, /\.top-nav > a:not\(#history-entry\):not\(\.nav-cta\)\s*\{\s*display:\s*none;/);
  assert.match(css, /\.top-nav #history-entry\s*\{\s*display:\s*inline-flex;/);
});

test("会员中心明确提供独立历史记录入口", () => {
  const html = read("member/index.html");
  assert.match(html, /href="\.\.\/history\/\?member=1"[^>]*>查看全部记录/);
});

test("七宗罪历史入口使用居中的小按钮样式", () => {
  const html = read("tests/seven-sins/index.html");
  const css = read("tests/seven-sins/style.css");
  assert.match(html, /test-member\.css/);
  assert.match(css, /\.history-link-row\s*\{[^}]*text-align:\s*center/s);
  assert.match(css, /\.history-link\s*\{[^}]*border:/s);
});

test("七宗罪历史回放与测试模块共享结果数据", () => {
  const html = read("tests/seven-sins/index.html");
  const moduleScript = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)]
    .find(([, attrs]) => attrs.includes('type="module"'))?.[2] || "";
  assert.match(moduleScript, /import\s*\{[^}]*RESULTS[^}]*\}\s*from\s*"\.\/data\.mjs"/s);
  assert.match(moduleScript, /YunduHistoryReplay\.init\("seven-sins"/);
});

test("历史回放使用各产品完整雷达图数据结构", () => {
  const cultivation = read("tests/cultivation-protagonist/index.html");
  const solo = read("tests/solo-business/index.html");
  const heroines = read("tests/historical-heroines/index.html");
  const cultivationReplay = cultivation.slice(cultivation.lastIndexOf('YunduHistoryReplay.init("cultivation-protagonist"'));
  const soloReplay = solo.slice(solo.lastIndexOf('YunduHistoryReplay.init("solo-business"'));
  const heroinesReplay = heroines.slice(heroines.lastIndexOf('YunduHistoryReplay.init("historical-heroines"'));

  assert.match(cultivationReplay, /renderRadarChart\(dimensions\.map\(\(\[name, value\]\)\s*=>\s*\[name, value\]\)\)/);
  assert.match(soloReplay, /renderRadar\(result\.metrics\)/);
  assert.match(heroinesReplay, /renderRadarChart\(dimensions\)/);
});

test("七宗罪历史文案保留序号和正文两列结构", () => {
  const html = read("tests/seven-sins/index.html");
  const replay = html.slice(html.lastIndexOf('YunduHistoryReplay.init("seven-sins"'));
  assert.match(html, /function renderNumberedRows\(/);
  assert.match(replay, /renderNumberedRows\(\$\("trigger-list"\)/);
  assert.match(replay, /renderNumberedRows\(\$\("advice-list"\)/);
  assert.doesNotMatch(replay, /YunduHistoryReplay\.renderItems\([^\n]*"(?:trigger|advice)-row"/);
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
