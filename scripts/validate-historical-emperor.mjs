import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const pagePath = new URL("../tests/historical-emperor/index.html", import.meta.url);
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
for (const name of ["QUESTIONS", "OPTION_SIGNALS", "EMPEROR_PROFILES", "DIMENSIONS", "SIGNAL_KEYS"]) {
  context[name] = vm.runInContext(`(${extractInitializer(name)})`, context);
}
for (const name of ["signalScore", "calculateScores", "matchingValues", "normalizeShape", "resultKey"]) {
  vm.runInContext(`this.${name} = ${extractFunction(name)}`, context);
}

context.state = { answers: [] };
context.DIMENSION_MAX_SCORES = Object.fromEntries(context.DIMENSIONS.map(([key]) => [
  key,
  context.OPTION_SIGNALS.reduce((total, options) => (
    total + Math.max(...options.map((signal) => context.signalScore(signal, key)))
  ), 0)
]));

const dimensionBySignal = Object.fromEntries(
  Object.entries(context.SIGNAL_KEYS).map(([signal, dimension]) => [signal, dimension])
);
const dimensionKeys = context.DIMENSIONS.map(([key]) => key);

assert.equal(context.QUESTIONS.length, 30, "Question count must remain 30");
assert.equal(context.OPTION_SIGNALS.length, 30, "Signal rows must align with questions");
assert.ok(context.QUESTIONS.every((question) => question[3].length === 4), "Every question must have four answers");
assert.ok(context.OPTION_SIGNALS.every((signals) => signals.length === 4), "Every question must have four signals");

const primaryTotals = Object.fromEntries(dimensionKeys.map((key) => [key, 0]));
const primaryByPosition = Object.fromEntries(dimensionKeys.map((key) => [key, [0, 0, 0, 0]]));
for (const signals of context.OPTION_SIGNALS) {
  for (const [position, signal] of signals.entries()) {
    const dimension = dimensionBySignal[signal[0]];
    assert.ok(dimension, `Unknown primary signal: ${signal}`);
    primaryTotals[dimension] += 1;
    primaryByPosition[dimension][position] += 1;
  }
}

assert.deepEqual(
  primaryTotals,
  Object.fromEntries(dimensionKeys.map((key) => [key, 20])),
  "Each dimension must appear as the primary signal exactly 20 times"
);
for (const [dimension, counts] of Object.entries(primaryByPosition)) {
  assert.deepEqual(counts, [5, 5, 5, 5], `${dimension} must appear five times in each answer position`);
}

const bannedPhrases = ["快速对齐", "低成本版本", "最小可行", "继续测试"];
const questionCopy = context.QUESTIONS.flatMap((question) => [question[2], ...question[3]]).join("\n");
for (const phrase of bannedPhrases) {
  assert.ok(!questionCopy.includes(phrase), `Question copy still contains templated phrase: ${phrase}`);
}

function evaluate(answers) {
  context.state.answers = [...answers];
  const scores = context.calculateScores();
  return { key: context.resultKey(scores), scores };
}

const fixedResults = [0, 1, 2, 3].map((answer) => evaluate(Array(30).fill(answer)).key);
assert.ok(new Set(fixedResults).size >= 3, "All-A/B/C/D must produce at least three distinct results");

const deterministicAnswers = Array.from({ length: 30 }, (_, index) => (index * 7 + 3) % 4);
assert.equal(
  evaluate(deterministicAnswers).key,
  evaluate(deterministicAnswers).key,
  "The same answers must always produce the same result"
);

let randomState = 0x5f3759df;
function nextAnswer() {
  randomState ^= randomState << 13;
  randomState ^= randomState >>> 17;
  randomState ^= randomState << 5;
  return (randomState >>> 0) % 4;
}

const sampleSize = 100_000;
const resultCounts = Object.fromEntries(Object.keys(context.EMPEROR_PROFILES).map((key) => [key, 0]));
for (let sample = 0; sample < sampleSize; sample += 1) {
  const answers = Array.from({ length: 30 }, nextAnswer);
  resultCounts[evaluate(answers).key] += 1;
}

const distribution = Object.entries(resultCounts).map(([key, count]) => ({
  key,
  count,
  rate: count / sampleSize
}));
for (const item of distribution) {
  assert.ok(item.rate >= 0.03, `${item.key} is below 3%: ${(item.rate * 100).toFixed(3)}%`);
  assert.ok(item.rate <= 0.15, `${item.key} is above 15%: ${(item.rate * 100).toFixed(3)}%`);
}

console.log(JSON.stringify({
  questions: context.QUESTIONS.length,
  answers: context.QUESTIONS.reduce((total, question) => total + question[3].length, 0),
  primaryTotals,
  primaryByPosition,
  fixedResults,
  distribution: distribution.map(({ key, count, rate }) => ({ key, count, rate: `${(rate * 100).toFixed(3)}%` }))
}, null, 2));
