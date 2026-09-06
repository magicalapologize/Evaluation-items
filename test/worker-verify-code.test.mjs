import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../worker.js", import.meta.url), "utf8");
const worker = (await import("data:text/javascript," + encodeURIComponent(source))).default;

class VerifyD1 {
  constructor(rows) { this.rows = rows; }
  prepare(sql) {
    const db = this;
    return { bind(...values) { return { async first() {
      if (!sql.includes("FROM daily_codes")) return null;
      const code = values.at(-1); const products = values.slice(0, -1);
      return db.rows.some((row) => products.includes(row.product_id) && row.code.toUpperCase() === code && row.enabled === 1) ? { ok: 1 } : null;
    } }; } };
  }
}

function request(body) { return new Request("https://site.test/api/verify-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); }
function env(rows) { return { DB: new VerifyD1(rows), ASSETS: { fetch: () => new Response("asset") } }; }

test("天赋职业评估测试码可以授权天赋挖掘测试", async () => {
  const response = await worker.fetch(request({ productId: "talent-discovery", code: "CAREER-01" }), env([{ product_id: "talent-career", code: "CAREER-01", enabled: 1 }]));
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { success: true });
});

test("天赋挖掘测试不接受其他产品测试码或停用码", async () => {
  const database = [{ product_id: "love-personality", code: "LOVE-01", enabled: 1 }, { product_id: "talent-career", code: "OLD-01", enabled: 0 }];
  for (const code of ["LOVE-01", "OLD-01"]) {
    const response = await worker.fetch(request({ productId: "talent-discovery", code }), env(database));
    assert.equal(response.status, 403);
  }
});

test("未知产品仍被拒绝", async () => {
  const response = await worker.fetch(request({ productId: "unknown", code: "CAREER-01" }), env([]));
  assert.equal(response.status, 400);
});
