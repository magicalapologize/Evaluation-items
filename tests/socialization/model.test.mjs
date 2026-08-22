import test from "node:test";
import assert from "node:assert/strict";
import { DIMENSIONS, QUESTIONS, RESULTS, STAGES } from "./data.mjs";
import {
  calculateProfile,
  getSignalBounds,
  simulateDistribution,
  getStageForScore
} from "./model.mjs";

const KEYS = DIMENSIONS.map(({ key }) => key);

function makeAnswers(seed = 0) {
  return Array.from({ length: QUESTIONS.length }, (_, index) => (index + seed) % 4);
}

test("社会化测试包含40道四选项题、6个维度和8个结果", () => {
  assert.equal(QUESTIONS.length, 40);
  assert.equal(DIMENSIONS.length, 6);
  assert.equal(RESULTS.length, 8);
  assert.equal(STAGES.length, 5);

  for (const question of QUESTIONS) {
    assert.ok(question.id);
    assert.ok(question.scene);
    assert.ok(question.text);
    assert.equal(question.options.length, 4);
    for (const option of question.options) {
      assert.ok(option.text);
      assert.deepEqual(Object.keys(option.scores).sort(), [...KEYS].sort());
      for (const value of Object.values(option.scores)) {
        assert.equal(typeof value, "number");
      }
    }
  }
});

test("每个结果包含完整画像、六维解析、三条建议和独立提醒", () => {
  const reminders = RESULTS.map((result) => result.reminder);
  assert.equal(new Set(reminders).size, RESULTS.length);

  for (const result of RESULTS) {
    assert.ok(result.name);
    assert.ok(result.alias);
    assert.equal(result.keywords.length, 3);
    assert.equal(Object.keys(result.dimensionProfiles).sort().join(","), [...KEYS].sort().join(","));
    assert.equal(result.advices.length, 3);
    assert.ok(result.portrait);
    assert.ok(result.strength);
    assert.ok(result.risk);
    assert.ok(result.fit);
    assert.ok(result.reminder);
  }
});

test("阶段边界按综合分确定且没有空档", () => {
  assert.equal(getStageForScore(0).key, "self-protection");
  assert.equal(getStageForScore(39).key, "self-protection");
  assert.equal(getStageForScore(40).key, "basic-passage");
  assert.equal(getStageForScore(54).key, "basic-passage");
  assert.equal(getStageForScore(55).key, "steady-response");
  assert.equal(getStageForScore(69).key, "steady-response");
  assert.equal(getStageForScore(70).key, "active-cultivation");
  assert.equal(getStageForScore(84).key, "active-cultivation");
  assert.equal(getStageForScore(85).key, "flexible-navigation");
  assert.equal(getStageForScore(100).key, "flexible-navigation");
  assert.throws(() => getStageForScore(-1), /0-100/);
  assert.throws(() => getStageForScore(101), /0-100/);
});

test("相同答案序列每次返回完全一致的结果", () => {
  const answers = makeAnswers(2);
  assert.deepEqual(calculateProfile(answers), calculateProfile(answers));
});

test("固定选择模式至少覆盖三种人格结果", () => {
  const resultKeys = [0, 1, 2, 3].map((answer) =>
    calculateProfile(Array(QUESTIONS.length).fill(answer)).result.key
  );
  assert.ok(new Set(resultKeys).size >= 3, resultKeys.join(", "));
});

test("每个维度使用独立校准范围，展示分不会全部偏低", () => {
  const bounds = getSignalBounds();
  for (const key of KEYS) {
    assert.ok(bounds[key].max > bounds[key].min);
  }

  const profile = calculateProfile(makeAnswers());
  assert.ok(Object.values(profile.displayScores).every((value) => value >= 35 && value <= 95));
  assert.ok(Math.max(...Object.values(profile.displayScores)) >= 80);
  assert.ok(Math.max(...Object.values(profile.displayScores)) - Math.min(...Object.values(profile.displayScores)) >= 25);
  assert.ok(profile.total >= 0 && profile.total <= 100);
  assert.ok(profile.stage && profile.stage.name);
});

test("随机十万份答卷覆盖全部结果且单项命中率保持在3%-15%", () => {
  const distribution = simulateDistribution(100000, 20260822);
  assert.deepEqual(Object.keys(distribution).sort(), RESULTS.map(({ key }) => key).sort());
  for (const count of Object.values(distribution)) {
    const rate = count / 100000;
    assert.ok(rate >= 0.03, `命中率 ${rate} 低于 3%`);
    assert.ok(rate <= 0.15, `命中率 ${rate} 高于 15%`);
  }
});

test("无效答案长度或选项会被拒绝", () => {
  assert.throws(() => calculateProfile([]), /需要 40 个答案/);
  assert.throws(() => calculateProfile([...makeAnswers(), 0]), /需要 40 个答案/);
  const invalid = makeAnswers();
  invalid[3] = 4;
  assert.throws(() => calculateProfile(invalid), /第 4 题答案无效/);
});
