import test from "node:test";
import assert from "node:assert/strict";
import { DIMENSIONS, QUESTIONS } from "./data.mjs";
import { calculateProfile, getSignalBounds, simulateDistribution } from "./model.mjs";

test("答案长度和索引无效时拒绝计算", () => {
  assert.throws(() => calculateProfile([]), /需要 40 个答案/);
  const answers = Array(40).fill(0);
  answers[7] = 4;
  assert.throws(() => calculateProfile(answers), /第 8 题答案无效/);
});

test("相同答案序列返回相同主辅天赋和画像", () => {
  const answers = Array.from({ length: 40 }, (_, index) => index % 4);
  assert.deepEqual(calculateProfile(answers), calculateProfile(answers));
});

test("固定选项至少覆盖三种最佳天赋", () => {
  const keys = [0, 1, 2, 3].map((answer) => calculateProfile(Array(QUESTIONS.length).fill(answer)).bestKey);
  assert.ok(new Set(keys).size >= 3, keys.join(","));
});

test("每项天赋使用独立校准范围，展示分处于相对刻度", () => {
  const bounds = getSignalBounds();
  assert.deepEqual(Object.keys(bounds).sort(), DIMENSIONS.map(({ key }) => key).sort());
  for (const range of Object.values(bounds)) assert.ok(range.max > range.min);
  const profile = calculateProfile(Array.from({ length: QUESTIONS.length }, (_, index) => index % 4));
  assert.ok(Object.values(profile.displayScores).every((value) => value >= 38 && value <= 95));
  assert.equal(profile.activeKeys.length, 4);
  assert.ok(profile.awakeningKey);
  assert.ok(profile.careerTracks.length >= 3);
});

test("十万份随机答卷覆盖八项天赋且单项不垄断", () => {
  const distribution = simulateDistribution(100000, 20260907);
  assert.deepEqual(Object.keys(distribution).sort(), DIMENSIONS.map(({ key }) => key).sort());
  for (const count of Object.values(distribution)) {
    const rate = count / 100000;
    assert.ok(rate >= 0.03 && rate <= 0.20, `命中率 ${rate} 超出范围`);
  }
});
