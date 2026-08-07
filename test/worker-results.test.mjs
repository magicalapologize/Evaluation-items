import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workerSource = await readFile(new URL("../worker.js", import.meta.url), "utf8");
const workerModule = await import("data:text/javascript," + encodeURIComponent(workerSource));
const worker = workerModule.default;

const TOKEN = "member-session-token";

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function validSnapshot(attemptId = "attempt-a") {
  return {
    schemaVersion: 1,
    attemptId,
    productId: "love-personality",
    productTitle: "恋爱相处人格测试",
    result: { name: "结果一", subtitle: "副标题", quote: "金句", icon: "♡", image: "" },
    tags: [],
    overview: [],
    dimensions: [],
    sections: [{ title: "完整报告", body: "报告正文", items: [] }],
    disclaimer: "仅供娱乐",
    createdAt: "2026-08-07T00:00:00.000Z"
  };
}

class MemoryD1 {
  constructor({ memberId = null, expired = false, records = [], raceOnInsert = false, failResults = false } = {}) {
    this.memberId = memberId;
    this.member = memberId ? {
      id: memberId,
      username: "测试账号",
      code_hint: "ABCD",
      plan_type: "annual",
      status: "active",
      activated_at: "2026-01-01T00:00:00.000Z",
      expires_at: expired ? "2020-01-01T00:00:00.000Z" : "2099-01-01T00:00:00.000Z"
    } : null;
    this.sessions = memberId ? [{ id: "session-1", member_id: memberId, token_hash: null, revoked_at: null, expires_at: "2099-01-01T00:00:00.000Z" }] : [];
    this.records = records.map((record) => ({ ...record }));
    this.raceOnInsert = raceOnInsert;
    this.failResults = failResults;
    this.authAttempts = [];
  }

  prepare(sql) {
    const db = this;
    return {
      bind(...values) {
        return {
          async first() {
            if (sql.includes("FROM member_sessions")) {
              const [tokenHash] = values;
              const session = db.sessions.find((item) => item.token_hash === tokenHash && !item.revoked_at);
              if (!session || !db.member) return null;
              return { ...db.member, session_id: session.id };
            }
            if (sql.includes("WHERE member_id = ? AND attempt_id = ?")) {
              const [memberId, attemptId] = values;
              return db.records.find((item) => item.member_id === memberId && item.attempt_id === attemptId) || null;
            }
            if (sql.includes("WHERE id = ? AND member_id = ?")) {
              const [id, memberId] = values;
              const row = db.records.find((item) => item.id === id && item.member_id === memberId);
              return row || null;
            }
            return null;
          },
          async all() {
            if (sql.includes("FROM test_results")) {
              if (db.failResults) throw new Error("D1_ERROR: no such table: test_results");
              const [memberId] = values;
              return { results: db.records.filter((item) => item.member_id === memberId).sort((a, b) => b.created_at.localeCompare(a.created_at)) };
            }
            return { results: [] };
          },
          async run() {
            if (sql.includes("UPDATE member_sessions")) return { meta: { changes: 1 } };
            if (sql.includes("INSERT INTO test_results")) {
              const [id, memberId, attemptId, productId, snapshotJson, createdAt] = values;
              const existing = db.records.find((item) => item.member_id === memberId && item.attempt_id === attemptId);
              if (existing) return { meta: { changes: 0 } };
              if (db.raceOnInsert) {
                db.raceOnInsert = false;
                db.records.push({ id: "raced-record", member_id: memberId, attempt_id: attemptId, product_id: productId, snapshot_json: snapshotJson, created_at: createdAt });
                throw new Error("D1_ERROR: UNIQUE constraint failed: test_results.member_id, test_results.attempt_id");
              }
              db.records.push({ id, member_id: memberId, attempt_id: attemptId, product_id: productId, snapshot_json: snapshotJson, created_at: createdAt });
              return { meta: { changes: 1 } };
            }
            if (sql.includes("DELETE FROM test_results")) {
              const [id, memberId] = values;
              const before = db.records.length;
              db.records = db.records.filter((item) => !(item.id === id && item.member_id === memberId));
              return { meta: { changes: before - db.records.length } };
            }
            return { meta: { changes: 0 } };
          }
        };
      }
    };
  }

  async batch(statements) {
    const results = [];
    for (const statement of statements) results.push(await statement.run());
    return results;
  }
}

async function envFor(memberId = null, options = {}) {
  const db = new MemoryD1({
    memberId,
    expired: options.expired,
    records: options.records || [],
    raceOnInsert: options.raceOnInsert || false,
    failResults: options.failResults || false
  });
  if (memberId) db.sessions[0].token_hash = await sha256(TOKEN);
  return { DB: db, ASSETS: { fetch: () => new Response("asset") } };
}

function request(path, options = {}, authenticated = true) {
  const headers = new Headers(options.headers || {});
  if (authenticated) headers.set("Cookie", "yundu_member_session=" + TOKEN);
  return new Request("https://site.test" + path, { ...options, headers });
}

async function createResult(env, snapshot, authenticated = true) {
  return worker.fetch(request("/api/member/results", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ snapshot })
  }, authenticated), env);
}

test("未登录不能读取会员记录", async () => {
  const response = await worker.fetch(request("/api/member/results", {}, false), await envFor());
  assert.equal(response.status, 401);
});

test("同一会员同一 attemptId 重试只保存一次", async () => {
  const env = await envFor("member-a");
  const first = await createResult(env, validSnapshot());
  const second = await createResult(env, validSnapshot());
  assert.equal(first.status, 201);
  assert.equal(second.status, 200);
  assert.equal(env.DB.records.length, 1);
});

test("并发重复保存命中唯一约束后返回已有记录", async () => {
  const env = await envFor("member-a", { raceOnInsert: true });
  const response = await createResult(env, validSnapshot());
  assert.equal(response.status, 200);
  assert.equal(env.DB.records.length, 1);
});

test("会员不能读取或删除其他会员记录", async () => {
  const env = await envFor("member-a", { records: [{ id: "record-b", member_id: "member-b", attempt_id: "attempt-b", product_id: "love-personality", snapshot_json: JSON.stringify(validSnapshot("attempt-b")), created_at: "2026-08-07T00:00:00.000Z" }] });
  const getResponse = await worker.fetch(request("/api/member/results/record-b"), env);
  const deleteResponse = await worker.fetch(request("/api/member/results/record-b", { method: "DELETE" }), env);
  assert.equal(getResponse.status, 404);
  assert.equal(deleteResponse.status, 404);
});

test("过期但会话有效的账号可以读取历史", async () => {
  const env = await envFor("member-a", { expired: true, records: [{ id: "record-a", member_id: "member-a", attempt_id: "attempt-a", product_id: "love-personality", snapshot_json: JSON.stringify(validSnapshot()), created_at: "2026-08-07T00:00:00.000Z" }] });
  const response = await worker.fetch(request("/api/member/results"), env);
  assert.equal(response.status, 200);
});

test("历史表异常时 API 仍返回 JSON", async () => {
  const env = await envFor("member-a", { failResults: true });
  const originalConsoleError = console.error;
  console.error = () => {};
  let response;
  try {
    response = await worker.fetch(request("/api/member/results"), env);
  } finally {
    console.error = originalConsoleError;
  }
  assert.equal(response.status, 503);
  assert.match(response.headers.get("content-type") || "", /application\/json/);
  const payload = await response.json();
  assert.equal(payload.success, false);
});
