import test from "node:test";
import assert from "node:assert/strict";
import { DIMENSIONS, DIMENSION_STATUS_COPY, QUESTIONS, RESULTS, STAGES } from "./data.mjs";
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

test("每个结果包含完整画像、行为模式、六维解析、三条建议和独立提醒", () => {
  const reminders = RESULTS.map((result) => result.reminder);
  const behaviorPatterns = RESULTS.map((result) => result.behaviorPattern);
  assert.equal(new Set(reminders).size, RESULTS.length);
  assert.equal(new Set(behaviorPatterns).size, RESULTS.length);

  for (const result of RESULTS) {
    assert.ok(result.name);
    assert.ok(result.alias);
    assert.equal(result.keywords.length, 3);
    assert.equal(Object.keys(result.dimensionProfiles).sort().join(","), [...KEYS].sort().join(","));
    const dimensionCopy = Object.values(result.dimensionProfiles).flatMap((profile) => [profile.focus, profile.blindSpot, profile.action]);
    assert.equal(dimensionCopy.length, DIMENSIONS.length * 3);
    assert.equal(new Set(dimensionCopy).size, dimensionCopy.length, `${result.key} 的维度解释存在重复`);
    assert.equal(result.advices.length, 3);
    assert.ok(result.portrait);
    assert.ok(result.behaviorPattern);
    assert.ok(result.strength);
    assert.ok(result.risk);
    assert.ok(result.fit);
    assert.ok(result.overallReading);
    assert.equal(result.overallReading.includes("{high}"), true);
    assert.equal(result.overallReading.includes("{low}"), true);
    assert.equal(result.toolbox.length, 4);
    assert.equal(new Set(result.toolbox).size, result.toolbox.length);
    assert.ok(result.reminder);
  }
});

test("分数状态提示按维度分别书写，覆盖低中高三档", () => {
  assert.deepEqual(Object.keys(DIMENSION_STATUS_COPY).sort(), [...KEYS].sort());
  const copy = Object.values(DIMENSION_STATUS_COPY).flatMap((levels) => Object.values(levels));
  assert.equal(copy.length, DIMENSIONS.length * 3);
  assert.equal(new Set(copy).size, copy.length);
  assert.equal(copy.some((text) => text.includes("压力上来时容易波动")), false);
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

test("每个维度使用独立校准范围，展示分只由答题信号决定", () => {
  const bounds = getSignalBounds();
  for (const key of KEYS) {
    assert.ok(bounds[key].max > bounds[key].min);
  }

  const profile = calculateProfile(makeAnswers());
  assert.ok(Object.values(profile.displayScores).every((value) => value >= 0 && value <= 100));
  assert.ok(Math.max(...Object.values(profile.displayScores)) >= 50);
  assert.ok(Math.max(...Object.values(profile.displayScores)) - Math.min(...Object.values(profile.displayScores)) >= 5);
  assert.ok(profile.total >= 0 && profile.total <= 100);
  assert.ok(profile.stage && profile.stage.name);
});

test("题目选项没有重复文本，也不靠超长话术暗示高分", () => {
  const optionTexts = QUESTIONS.flatMap((question) => question.options.map((option) => option.text));
  assert.equal(new Set(optionTexts).size, optionTexts.length);
  assert.ok(Math.max(...optionTexts.map((text) => text.length)) <= 42);
  for (const question of QUESTIONS) {
    assert.equal(new Set(question.options.map((option) => option.text)).size, 4);
    assert.ok(question.text.length <= 40);
  }
});

test("选项不残留策略化套话", () => {
  const optionTexts = QUESTIONS.flatMap((question) => question.options.map((option) => option.text));
  const templatePatterns = [
    /根据.+(?:决定|选择)/,
    /明确.+并.+(?:给出|提出)/,
    /先.+，再.+，/,
    /不把.+(?:理解成|当成)/,
    /而不是/
  ];
  for (const text of optionTexts) {
    assert.equal(templatePatterns.some((pattern) => pattern.test(text)), false, `疑似套话：${text}`);
  }
});

test("低社会化选择应得到低分，随机作答不应默认落在高分段", () => {
  const totalSignal = (option) => Object.values(option.scores).reduce((sum, value) => sum + value, 0);
  const lowAnswers = QUESTIONS.map((question) => question.options.reduce((best, option, index) => {
    return totalSignal(option) < totalSignal(question.options[best]) ? index : best;
  }, 0));
  const lowProfile = calculateProfile(lowAnswers);
  assert.ok(lowProfile.total <= 20, `低分压力测试得到 ${lowProfile.total} 分`);
  const highAnswers = QUESTIONS.map((question) => question.options.reduce((best, option, index) => {
    return totalSignal(option) > totalSignal(question.options[best]) ? index : best;
  }, 0));
  const highProfile = calculateProfile(highAnswers);
  assert.ok(highProfile.total >= 80, `高分压力测试得到 ${highProfile.total} 分`);

  const strongAnswers = QUESTIONS.map((question, index) => {
    const rankedOptions = question.options
      .map((option, optionIndex) => ({ optionIndex, signal: totalSignal(option) }))
      .sort((left, right) => right.signal - left.signal);
    return rankedOptions[index < 28 ? 0 : 1].optionIndex;
  });
  const strongProfile = calculateProfile(strongAnswers);
  assert.ok(strongProfile.total >= 85, `高倾向但非全选答卷得到 ${strongProfile.total} 分`);
  assert.equal(strongProfile.stage.key, "flexible-navigation");

  let seed = 20260822;
  const randomAnswers = Array.from({ length: QUESTIONS.length }, () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return (seed >>> 28) % 4;
  });
  const randomProfile = calculateProfile(randomAnswers);
  assert.ok(randomProfile.total < 65, `随机答卷得到 ${randomProfile.total} 分`);
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
