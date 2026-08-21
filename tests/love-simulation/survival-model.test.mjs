import test from "node:test";
import assert from "node:assert/strict";
import { DIMENSIONS, ROLES, SURVIVAL_CONFIG, SURVIVAL_COPY } from "./data.js";
import { calculateSurvivalResult, settleSurvivalAnswer, shouldEndSurvival } from "./model.js";

const option = (points, primary = "empathy", secondary = "expression") => ({ points, primary, secondary, text: `${points}分选项` });

test("四个角色各配置 12 个唯一且有效的生存题索引", () => {
  assert.deepEqual(Object.keys(SURVIVAL_CONFIG).sort(), Object.keys(ROLES).sort());
  for (const [roleKey, indexes] of Object.entries(SURVIVAL_CONFIG)) {
    assert.equal(indexes.length, 12, roleKey);
    assert.equal(new Set(indexes).size, 12, roleKey);
    indexes.forEach((index) => assert.ok(Number.isInteger(index) && index >= 0 && index < ROLES[roleKey].questions.length));
  }
});

test("生存结算按分值更新连续翻车和累计危险", () => {
  assert.deepEqual(settleSurvivalAnswer({ failStreak: 2, totalDanger: 4 }, option(5)), { failStreak: 0, totalDanger: 4 });
  assert.deepEqual(settleSurvivalAnswer({ failStreak: 2, totalDanger: 4 }, option(3)), { failStreak: 1, totalDanger: 4 });
  assert.deepEqual(settleSurvivalAnswer({ failStreak: 1, totalDanger: 4 }, option(1)), { failStreak: 2, totalDanger: 5 });
  assert.deepEqual(settleSurvivalAnswer({ failStreak: 1, totalDanger: 4 }, option(0)), { failStreak: 2, totalDanger: 6 });
});

test("前三关保护，第 4 关最早出局", () => {
  const danger = { failStreak: 3, totalDanger: 6 };
  assert.equal(shouldEndSurvival(danger, 1), false);
  assert.equal(shouldEndSurvival(danger, 3), false);
  assert.equal(shouldEndSurvival(danger, 4, 1), true);
});

test("第 4 关抢救选 3/5 分可继续，但危险值保留到下一关", () => {
  const danger = { failStreak: 1, totalDanger: 6 };
  assert.equal(shouldEndSurvival(danger, 4, 3), false);
  assert.equal(shouldEndSurvival(danger, 4, 5), false);
  assert.equal(shouldEndSurvival(danger, 5, 3), true);
});

test("连续 3 次翻车或危险值 6 均会结束", () => {
  assert.equal(shouldEndSurvival({ failStreak: 3, totalDanger: 2 }, 5), true);
  assert.equal(shouldEndSurvival({ failStreak: 1, totalDanger: 6 }, 5), true);
  assert.equal(shouldEndSurvival({ failStreak: 2, totalDanger: 5 }, 5), false);
});

test("生存结果稳定计算温度、死因、致命选择和六维数据", () => {
  const role = ROLES.guyan;
  const indexes = SURVIVAL_CONFIG.guyan.slice(0, 4);
  const points = [5, 1, 0, 3];
  const history = indexes.map((questionIndex, index) => {
    const question = role.questions[questionIndex];
    const answerIndex = question.options.findIndex((item) => item.points === points[index]);
    return { questionIndex, answerIndex, option: question.options[answerIndex] };
  });
  const first = calculateSurvivalResult(role, history);
  const second = calculateSurvivalResult(role, history);
  assert.deepEqual(first, second);
  assert.equal(first.temperature, 44);
  assert.equal(first.cleared, false);
  assert.equal(first.survivedCount, 4);
  assert.ok(first.causeText.length > 0);
  assert.equal(first.deadliest.questionIndex, history[2].questionIndex);
  assert.equal(first.dimensions.length, DIMENSIONS.length);
  first.dimensions.forEach(({ value }) => assert.ok(value >= 18 && value <= 95));
});

test("零危险完成 12 关得到隐藏结局且没有明显死因", () => {
  const role = ROLES.zhouye;
  const history = SURVIVAL_CONFIG.zhouye.map((questionIndex) => {
    const question = role.questions[questionIndex];
    const answerIndex = question.options.findIndex((item) => item.points === 5);
    return { questionIndex, answerIndex, option: question.options[answerIndex] };
  });
  const result = calculateSurvivalResult(role, history);
  assert.equal(result.cleared, true);
  assert.equal(result.title, "隐藏结局·天选攻略者");
  assert.equal(result.causeText, "本局没有明显致命选择");
  assert.equal(result.temperature, 100);
});

test("四角色六档均有独立结局，共 24 条且不重复", () => {
  const endings = Object.values(SURVIVAL_COPY.roleEndings).flat();
  assert.equal(endings.length, 24);
  assert.equal(new Set(endings).size, 24);
  endings.forEach((ending) => assert.ok(ending.length >= 18));
});
