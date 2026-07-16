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
const outputDir = resolve(projectDir, "../../..", "产品手册", "云渡超级会员", "会员激活码");
await mkdir(outputDir, { recursive: true });

const date = createdAt.slice(0, 10);
const baseName = `${date}-${plan.label}-${count}个`;
const markdownPath = resolve(outputDir, `${baseName}-发货清单.md`);
const sqlPath = resolve(outputDir, `${baseName}-D1导入.sql`);

const markdown = `# ${plan.label}激活码发货清单

> 生成日期：${date}  
> 会员类型：${plan.label}  
> 有效期：${plan.durationDays === null ? "网站持续运营期间" : `${plan.durationDays}天`}  
> 激活码数量：${count}个  
> 激活地址：https://magicassess.top/member/

## 使用规则

- 每个订单只发放一枚激活码。
- 发货后把“发货状态”改为“已发货”，并填写订单号和发货日期。
- 激活码是客户唯一登录凭证，不要重复发货或公开分享。
- 本文档包含真实激活码，只能保存在私人知识库中。

## 发货清单

| 序号 | 会员激活码 | 发货状态 | 小红书订单号 | 发货日期 | 备注 |
|---:|---|---|---|---|---|
${records.map((record, index) => `| ${index + 1} | \`${record.code}\` | 未发货 |  |  |  |`).join("\n")}

## 标准发货内容

\`\`\`text
云渡超级会员激活码：从上方清单复制一枚未发货激活码

激活地址：
https://magicassess.top/member/

首次输入会自动开通会员，以后仍使用同一枚激活码登录，请妥善保存，不要转发给他人。
\`\`\`
`;

const sql = records.map((record) => `INSERT INTO member_activation_codes
  (id, code_hash, code_hint, plan_type, duration_days, status, created_at)
VALUES
  (${sqlValue(record.id)}, ${sqlValue(record.codeHash)}, ${sqlValue(record.codeHint)}, ${sqlValue(planKey)}, ${sqlValue(plan.durationDays)}, 'unused', ${sqlValue(createdAt)});`).join("\n\n");

await Promise.all([
  writeFile(markdownPath, markdown, "utf8"),
  writeFile(sqlPath, `${sql}\n`, "utf8")
]);

console.log(`已生成 ${count} 个${plan.label}激活码。`);
console.log(`发货清单：${markdownPath}`);
console.log(`D1 导入：${sqlPath}`);
console.log("原始激活码保存在网站项目外部，请勿上传到 GitHub 或 Cloudflare 静态资源。");
