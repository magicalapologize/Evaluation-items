import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createHistoryClient, validateSnapshot } =
  require("../assets/js/test-history.js");

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  };
}

function snapshot(index) {
  return {
    schemaVersion: 1,
    attemptId: "attempt-" + index,
    productId: "love-personality",
    productTitle: "恋爱相处人格测试",
    result: { name: "结果" + index, subtitle: "", quote: "", icon: "", image: "" },
    tags: [],
    overview: [],
    dimensions: [],
    sections: [{ title: "完整报告", body: "正文" + index, items: [] }],
    disclaimer: "仅供娱乐",
    createdAt: new Date(Date.UTC(2026, 7, index)).toISOString()
  };
}

test("临时用户只保留最近 5 条", async () => {
  const client = createHistoryClient({
    storage: memoryStorage(),
    getMember: async () => ({ authenticated: false })
  });
  for (let index = 1; index <= 6; index += 1) {
    await client.saveResult(snapshot(index));
  }
  assert.deepEqual(client.listLocal().map((item) => item.attemptId), [
    "attempt-6", "attempt-5", "attempt-4", "attempt-3", "attempt-2"
  ]);
});

test("临时记录可以逐条删除", async () => {
  const client = createHistoryClient({
    storage: memoryStorage(),
    getMember: async () => ({ authenticated: false })
  });
  const saved = await client.saveResult(snapshot(1));
  assert.equal(client.deleteLocal(saved.id), true);
  assert.equal(client.listLocal().length, 0);
});

test("云端失败进入待同步队列且不占临时记录", async () => {
  const client = createHistoryClient({
    storage: memoryStorage(),
    getMember: async () => ({ authenticated: true }),
    request: async () => { throw new Error("offline"); }
  });
  await client.saveResult(snapshot(1));
  assert.equal(client.listLocal().length, 0);
  assert.equal(client.listPending().length, 1);
});

test("非法资源路径被拒绝", () => {
  const invalid = snapshot(1);
  invalid.result.image = "javascript:alert(1)";
  assert.throws(() => validateSnapshot(invalid), /图片路径/);
});

test("快照拒绝未声明的敏感字段", () => {
  const invalid = snapshot(1);
  invalid.password = "secret";
  invalid.activationCode = "CODE";
  assert.throws(() => validateSnapshot(invalid), /字段/);
});

test("同一 attemptId 不会重复保存本机记录", async () => {
  const client = createHistoryClient({
    storage: memoryStorage(),
    getMember: async () => ({ authenticated: false })
  });
  const first = await client.saveResult(snapshot(1));
  const second = await client.saveResult(snapshot(1));
  assert.equal(client.listLocal().length, 1);
  assert.equal(client.listLocal()[0].id, first.id);
  assert.equal(second.id, first.id);
});

test("待同步记录只归属原会员", async () => {
  const storage = memoryStorage();
  let member = { authenticated: true, id: "member-a" };
  let uploads = 0;
  const client = createHistoryClient({
    storage,
    getMember: async () => member,
    request: async () => { throw new Error("offline"); }
  });
  await client.saveResult(snapshot(1));

  member = { authenticated: true, id: "member-b" };
  const otherClient = createHistoryClient({
    storage,
    getMember: async () => member,
    request: async () => { uploads += 1; }
  });
  await otherClient.syncPending();
  assert.equal(uploads, 0);
  assert.equal(otherClient.listPending().length, 1);
});

test("历史记录链接只使用固定产品路径", () => {
  const client = createHistoryClient({ storage: memoryStorage() });
  assert.equal(client.historyResultHref({ id: "r 1", productId: "love-personality" }, "local"),
    "/tests/love-personality/?history=r%201&source=local");
  assert.throws(() => client.historyResultHref({ id: "r1", productId: "../member" }, "local"), /产品/);
  assert.throws(() => client.historyResultHref({ id: "r1", productId: "love-personality" }, "other"), /来源/);
});

test("本机历史只能在对应产品页读取", async () => {
  const client = createHistoryClient({
    storage: memoryStorage(),
    getMember: async () => ({ authenticated: false })
  });
  const saved = await client.saveResult(snapshot(1));
  const loaded = await client.loadHistoryResult("love-personality", `?history=${saved.id}&source=local`);
  assert.equal(loaded.snapshot.attemptId, "attempt-1");
  assert.equal(loaded.returnHref, "/history/");
  await assert.rejects(
    client.loadHistoryResult("workplace-madness", `?history=${saved.id}&source=local`),
    /不属于当前测试/
  );
});

test("会员历史通过详情接口加载", async () => {
  const client = createHistoryClient({
    storage: memoryStorage(),
    loadRemote: async (id) => ({ snapshot: snapshot(2), id })
  });
  const loaded = await client.loadHistoryResult(
    "love-personality", "?history=remote-2&source=member"
  );
  assert.equal(loaded.snapshot.attemptId, "attempt-2");
  assert.equal(loaded.returnHref, "/member/#test-history");
});

test("无历史参数不进入回放模式", async () => {
  const client = createHistoryClient({
    storage: memoryStorage(),
    getMember: async () => ({ authenticated: false })
  });
  assert.equal(await client.loadHistoryResult("love-personality", ""), null);
});
