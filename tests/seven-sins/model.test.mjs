import test from "node:test";
import assert from "node:assert/strict";
import { DIMENSIONS, QUESTIONS, RESULTS } from "./data.mjs";
import * as model from "./model.mjs";

const { calculateProfile, simulateDistribution } = model;
const KEYS = DIMENSIONS.map(({ key }) => key);

test("七宗罪模型包含35道题、7个维度和7个结果", () => {
  assert.equal(QUESTIONS.length, 35);
  assert.equal(DIMENSIONS.length, 7);
  assert.equal(RESULTS.length, 7);
  for (const question of QUESTIONS) {
    assert.equal(question.options.length, 5);
    for (const option of question.options) {
      assert.ok(option.text);
      assert.equal(Object.keys(option.scores).length, 7);
    }
  }
});

test("所有结果都有独立提醒和完整结果资料", () => {
  const reminders = RESULTS.map((result) => result.reminder);
  assert.equal(new Set(reminders).size, RESULTS.length);
  for (const result of RESULTS) {
    assert.ok(result.name);
    assert.ok(result.alias);
    assert.equal(result.keywords.length, 3);
    assert.equal(result.triggers.length, 3);
    assert.equal(result.advices.length, 3);
    assert.ok(result.reminder);
  }
});

test("固定答案模式不会全部落到同一个结果", () => {
  const patterns = [0, 1, 2, 3, 4].map((answer) =>
    calculateProfile(Array(QUESTIONS.length).fill(answer)).result.key
  );
  assert.ok(new Set(patterns).size >= 3);
});

test("同一答案序列每次得到完全一致的结果", () => {
  const answers = Array.from({ length: QUESTIONS.length }, (_, index) => index % 5);
  const first = calculateProfile(answers);
  const second = calculateProfile(answers);
  assert.deepEqual(second, first);
});

test("每个维度使用自己的统计校准", () => {
  assert.equal(typeof model.getSignalBounds, "function");
  const bounds = model.getSignalBounds();
  for (const key of KEYS) {
    assert.ok(bounds[key].max > bounds[key].min);
    assert.equal(bounds[key].min, -bounds[key].max);
  }
  const profile = calculateProfile(Array(QUESTIONS.length).fill(2));
  assert.deepEqual(Object.values(profile.signals), Array(7).fill(0.5));
});

test("最终七宗罪与最高校准维度一致", () => {
  let seed = 20260805;
  for (let sample = 0; sample < 20000; sample += 1) {
    const answers = Array.from({ length: QUESTIONS.length }, () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed % 5;
    });
    const profile = calculateProfile(answers);
    assert.ok(profile.topKeys.includes(profile.result.key));
  }
});

test("真正并列时返回完整的 topKeys 且结果稳定", () => {
  const answers = Array(QUESTIONS.length).fill(2);
  const profile = calculateProfile(answers);
  assert.equal(profile.topKeys.length, 7);
  assert.ok(profile.topKeys.includes(profile.result.key));
  assert.deepEqual(profile, calculateProfile(answers));
});

test("展示分使用 0-100 倾向指数", () => {
  const profile = calculateProfile(Array(QUESTIONS.length).fill(2));
  assert.deepEqual(Object.values(profile.displayScores), Array(7).fill(50));
  const varied = calculateProfile(Array.from({ length: QUESTIONS.length }, (_, index) => index % 5));
  assert.notEqual(Math.max(...Object.values(varied.displayScores)), 95);
  assert.notEqual(Math.min(...Object.values(varied.displayScores)), 35);
});

test("随机答卷能够覆盖全部结果", () => {
  let seed = 20260805;
  const seen = new Set();
  for (let sample = 0; sample < 20000; sample += 1) {
    const answers = Array.from({ length: QUESTIONS.length }, () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed % 5;
    });
    seen.add(calculateProfile(answers).result.key);
  }
  assert.equal(seen.size, RESULTS.length);
});

test("十万份随机答卷的单项命中率保持在3%到15%", () => {
  const distribution = simulateDistribution(100000);
  for (const count of Object.values(distribution)) {
    const rate = count / 100000;
    assert.ok(rate >= 0.03, `命中率 ${rate} 低于 3%`);
    assert.ok(rate <= 0.15, `命中率 ${rate} 高于 15%`);
  }
});
