import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PLANS = {
  monthly: { marker: "M", label: "月度会员", durationDays: 30 },
  quarterly: { marker: "Q", label: "季度会员", durationDays: 90 },
  annual: { marker: "Y", label: "年度会员", durationDays: 365 },
  lifetime: { marker: "L", label: "终身会员", durationDays: null }
};

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const args = Object.fromEntries(process.argv.slice(2).map((item, index, all) => {
  if (!item.startsWith("--")) return [item, true];
  const key = item.slice(2);
  const next = all[index + 1];
  return [key, next && !next.startsWith("--") ? next : true];
}));

const planKey = String(args.plan || "annual");
const count = Number(args.count || 10);
const plan = PLANS[planKey];

if (!plan) {
  throw new Error(`不支持的会员类型：${planKey}。可选 monthly、quarterly、annual、lifetime。`);
}
if (!Number.isInteger(count) || count < 1 || count > 1000) {
  throw new Error("--count 必须是 1 到 1000 之间的整数。");
}

function randomGroup() {
  const bytes = randomBytes(4);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function makeCode() {
  return `YD-${plan.marker}-${randomGroup()}-${randomGroup()}-${randomGroup()}-${randomGroup()}`;
}

function hashCode(code) {
  return createHash("sha256").update(code).digest("hex");
}

function sqlValue(value) {
  if (value === null) return "NULL";
  return `'${String(value).replaceAll("'", "''")}'`;
}

const createdAt = new Date().toISOString();
const codes = new Set();
while (codes.size < count) codes.add(makeCode());

const records = Array.from(codes, (code) => ({
  id: randomUUID(),
  code,
  codeHash: hashCode(code),
  codeHint: code.slice(-4)
}));

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(scriptDir, "..");
const outputDir = resolve(projectDir, "..", "Evaluation-items-private", "member-codes");
await mkdir(outputDir, { recursive: true });

const timestamp = createdAt.replaceAll(":", "-").replace(".", "-");
const baseName = `${timestamp}-${planKey}-${count}`;
const csvPath = resolve(outputDir, `${baseName}.csv`);
const sqlPath = resolve(outputDir, `${baseName}.sql`);

const csv = [
  "plan,label,activation_code,status",
  ...records.map((record) => `${planKey},${plan.label},${record.code},unused`)
].join("\n");

const sql = records.map((record) => `INSERT INTO member_activation_codes
  (id, code_hash, code_hint, plan_type, duration_days, status, created_at)
VALUES
  (${sqlValue(record.id)}, ${sqlValue(record.codeHash)}, ${sqlValue(record.codeHint)}, ${sqlValue(planKey)}, ${sqlValue(plan.durationDays)}, 'unused', ${sqlValue(createdAt)});`).join("\n\n");

await Promise.all([
  writeFile(csvPath, `${csv}\n`, "utf8"),
  writeFile(sqlPath, `${sql}\n`, "utf8")
]);

console.log(`已生成 ${count} 个${plan.label}激活码。`);
console.log(`发货清单：${csvPath}`);
console.log(`D1 导入：${sqlPath}`);
console.log("原始激活码保存在网站项目外部，请勿上传到 GitHub 或 Cloudflare 静态资源。");
