import test from "node:test";
import assert from "node:assert/strict";
import { ROLES } from "./data.js";

const forbiddenTemplatePhrases = ["先……再……", "绝不", "必须告诉", "真正爱你就", "谁先联系谁就输了"];
const dramaticLowSignals = ["马上说分手", "当场讽刺回去", "要求她放弃", "把门反锁", "以后都不让", "立刻删除"];

test("四个角色仍保留完整 20 题结构和四档分值", () => {
  for (const role of Object.values(ROLES)) {
    assert.equal(role.questions.length, 20, role.name);
    for (const question of role.questions) {
      assert.equal(question.options.length, 4, `${role.name}/${question.scene}`);
      assert.equal(new Set(question.options.map((option) => option.text)).size, 4, `${role.name}/${question.scene}`);
      assert.deepEqual(new Set(question.options.map((option) => option.points)), new Set([0, 1, 3, 5]), `${role.name}/${question.scene}`);
    }
  }
});

test("题库不再大面积使用模板化句式和戏剧化低分词", () => {
  const allText = Object.values(ROLES).flatMap((role) => role.questions.flatMap((question) => [question.prompt, ...question.options.map((option) => option.text)])).join("\n");
  forbiddenTemplatePhrases.forEach((phrase) => assert.equal(allText.includes(phrase), false, phrase));
  dramaticLowSignals.forEach((phrase) => assert.equal(allText.includes(phrase), false, phrase));
});

test("每个角色至少有 6 个不是 5 分的可诱惑选项", () => {
  for (const role of Object.values(ROLES)) {
    const plausible = role.questions.flatMap((question) => question.options.filter((option) => option.points < 5 && option.points > 0));
    assert.ok(plausible.length >= 6, `${role.name} plausible distractors: ${plausible.length}`);
  }
});

test("四档分值在 A/B/C/D 的位置分布不过度集中", () => {
  for (const role of Object.values(ROLES)) {
    const counts = Array.from({ length: 4 }, () => Object.fromEntries([0, 1, 3, 5].map((points) => [points, 0])));
    role.questions.forEach((question) => question.options.forEach((option, index) => { counts[index][option.points] += 1; }));
    for (const points of [0, 1, 3, 5]) {
      const values = counts.map((item) => item[points]);
      assert.ok(Math.max(...values) - Math.min(...values) <= 4, `${role.name} / ${points}: ${values.join(",")}`);
    }
  }
});

test("全选最长选项不能成为高分捷径", () => {
  for (const role of Object.values(ROLES)) {
    const longestChoices = role.questions.map((question) => question.options.reduce((longest, option) => option.text.length > longest.text.length ? option : longest));
    const totalScore = longestChoices.reduce((sum, option) => sum + option.points, 0);
    const highScoreCount = longestChoices.filter((option) => option.points === 5).length;
    assert.ok(totalScore <= 64, `${role.name} longest score: ${totalScore}`);
    assert.ok(highScoreCount <= 10, `${role.name} longest 5-point choices: ${highScoreCount}`);
  }
});

test("选项字数和分值不应存在明显正相关", () => {
  for (const role of Object.values(ROLES)) {
    const samples = role.questions.flatMap((question) => question.options.map((option) => ({ length: option.text.length, points: option.points })));
    const average = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
    const lengthMean = average(samples.map((sample) => sample.length));
    const pointsMean = average(samples.map((sample) => sample.points));
    const covariance = average(samples.map((sample) => (sample.length - lengthMean) * (sample.points - pointsMean)));
    const lengthDeviation = Math.sqrt(average(samples.map((sample) => (sample.length - lengthMean) ** 2)));
    const pointsDeviation = Math.sqrt(average(samples.map((sample) => (sample.points - pointsMean) ** 2)));
    const correlation = covariance / lengthDeviation / pointsDeviation;
    assert.ok(correlation <= 0.35, `${role.name} length-score correlation: ${correlation.toFixed(3)}`);
  }
});
