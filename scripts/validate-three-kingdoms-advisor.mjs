import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const pagePath = new URL("../tests/three-kingdoms-advisor/index.html", import.meta.url);
const source = readFileSync(pagePath, "utf8");

function extractInitializer(name) {
  const marker = `const ${name} =`;
  const markerIndex = source.indexOf(marker);
  assert.notEqual(markerIndex, -1, `Missing ${name}`);

  const initializerOffset = source.slice(markerIndex + marker.length).search(/[\[{]/u);
  assert.notEqual(initializerOffset, -1, `Missing initializer for ${name}`);
  const start = markerIndex + marker.length + initializerOffset;
  const opening = source[start];
  const closing = opening === "[" ? "]" : "}";
  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      continue;
    }
    if (character === opening) depth += 1;
    if (character === closing) depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }

  throw new Error(`Unclosed initializer for ${name}`);
}

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `Missing function ${name}`);
  const bodyStart = source.indexOf("{", start);
  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let index = bodyStart; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      continue;
    }
    if (character === "{") depth += 1;
    if (character === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }

  throw new Error(`Unclosed function ${name}`);
}

const context = vm.createContext({});
assert.ok(/const ANSWER_SCORES =\s*\[/u.test(source), "ANSWER_SCORES must be an explicit per-question array");
for (const name of ["QUESTIONS", "ANSWER_SCORES", "TYPES", "EXTRA_TYPES"]) {
  context[name] = vm.runInContext(`(${extractInitializer(name)})`, context);
}
context.ALL_TYPES = { ...context.TYPES, ...context.EXTRA_TYPES };
for (const name of ["calculateScores", "resultKey"]) {
  vm.runInContext(`this.${name} = ${extractFunction(name)}`, context);
}
context.state = { answers: [] };

const dimensions = ["strategist", "tactician", "commander", "diplomat", "innovator", "analyst"];
const expectedStages = { "识局": 5, "用人": 5, "出谋": 5, "处世": 5, "破局": 5 };

assert.equal(context.QUESTIONS.length, 25, "Question count must be exactly 25");
assert.equal(context.ANSWER_SCORES.length, 25, "Score rows must align with questions");
assert.ok(context.QUESTIONS.every((question) => question[3].length === 4), "Every question must have four answers");
assert.ok(context.ANSWER_SCORES.every((scores) => scores.length === 4), "Every question must have four score maps");

const stageCounts = Object.fromEntries(Object.keys(expectedStages).map((stage) => [stage, 0]));
for (const [stage] of context.QUESTIONS) {
  assert.ok(stage in stageCounts, `Unknown stage: ${stage}`);
  stageCounts[stage] += 1;
}
assert.deepEqual(stageCounts, expectedStages, "Each stage must contain five questions");

const bannedPhrases = ["长期价值", "整体布局", "共同目标", "判断框架", "低成本版本", "快速验证", "高杠杆", "最小下注", "共享资源", "胜利标准"];
const questionCopy = context.QUESTIONS.flatMap((question) => [question[2], ...question[3]]).join("\n");
for (const phrase of bannedPhrases) {
  assert.ok(!questionCopy.includes(phrase), `Question copy still contains templated phrase: ${phrase}`);
}

const primaryTotals = Object.fromEntries(dimensions.map((dimension) => [dimension, 0]));
const primaryByPosition = Object.fromEntries(dimensions.map((dimension) => [dimension, [0, 0, 0, 0]]));
for (const scoreRow of context.ANSWER_SCORES) {
  for (const [position, score] of scoreRow.entries()) {
    const entries = Object.entries(score).sort((a, b) => b[1] - a[1]);
    assert.ok(entries.length >= 1 && entries.length <= 2, "Each answer must score one or two dimensions");
    assert.equal(entries[0][1], 4, "Each answer must have one primary dimension worth four points");
    assert.ok(entries.every(([dimension]) => dimensions.includes(dimension)), "Every scored dimension must be known");
    primaryTotals[entries[0][0]] += 1;
    primaryByPosition[entries[0][0]][position] += 1;
  }
}
for (const [dimension, total] of Object.entries(primaryTotals)) {
  assert.ok(total >= 16 && total <= 17, `${dimension} must be a primary dimension 16 or 17 times, got ${total}`);
  assert.ok(Math.max(...primaryByPosition[dimension]) <= 5, `${dimension} is too concentrated in one answer position`);
}

function evaluate(answers) {
  context.state.answers = [...answers];
  const scores = context.calculateScores();
  return { key: context.resultKey(scores), scores };
}

const fixedResults = [0, 1, 2, 3].map((answer) => evaluate(Array(25).fill(answer)).key);
assert.equal(new Set(fixedResults).size, 4, "All-A/B/C/D must produce four distinct results");

let randomState = 0x5f3759df;
function nextAnswer() {
  randomState ^= randomState << 13;
  randomState ^= randomState >>> 17;
  randomState ^= randomState << 5;
  return (randomState >>> 0) % 4;
}

const sampleSize = 100_000;
const resultCounts = Object.fromEntries(Object.keys(context.ALL_TYPES).map((key) => [key, 0]));
for (let sample = 0; sample < sampleSize; sample += 1) {
  const answers = Array.from({ length: 25 }, nextAnswer);
  resultCounts[evaluate(answers).key] += 1;
}

const distribution = Object.entries(resultCounts).map(([key, count]) => ({ key, count, rate: count / sampleSize }));
console.log(JSON.stringify({ questions: context.QUESTIONS.length, stageCounts, primaryTotals, primaryByPosition, fixedResults, distribution: distribution.map(({ key, count, rate }) => ({ key, count, rate: `${(rate * 100).toFixed(3)}%` })) }, null, 2));

for (const item of distribution) {
  assert.ok(item.rate >= 0.02, `${item.key} is below 2%: ${(item.rate * 100).toFixed(3)}%`);
  assert.ok(item.rate <= 0.18, `${item.key} is above 18%: ${(item.rate * 100).toFixed(3)}%`);
}
