import test from "node:test";
import assert from "node:assert/strict";
import { DIMENSIONS, QUESTIONS, RESULTS, SCENES } from "./data.mjs";

const KEYS = DIMENSIONS.map(({ key }) => key);

test("天赋挖掘题库是40道四选项题、8项天赋和8个最佳天赋结果", () => {
  assert.equal(QUESTIONS.length, 40);
  assert.equal(DIMENSIONS.length, 8);
  assert.equal(RESULTS.length, 8);
  assert.deepEqual(SCENES.map((scene) => scene.questionCount), [8, 8, 8, 8, 8]);
  assert.deepEqual(SCENES.map((scene) => QUESTIONS.filter((q) => q.scene === scene.name).length), [8, 8, 8, 8, 8]);
  for (const question of QUESTIONS) {
    assert.ok(question.id && question.scene && question.text);
    assert.equal(question.options.length, 4);
    for (const option of question.options) {
      assert.ok(option.text);
      assert.deepEqual(Object.keys(option.scores).sort(), [...KEYS].sort());
      assert.ok(Object.values(option.scores).filter((value) => value > 0).length <= 2);
    }
  }
});

test("八个结果包含深度报告字段且提醒独立", () => {
  const reminders = RESULTS.map((result) => result.reminder);
  assert.equal(new Set(reminders).size, RESULTS.length);
  for (const result of RESULTS) {
    assert.ok(result.name && result.bestTalent && result.summary && result.portrait);
    assert.ok(result.hiddenPotential === undefined || result.hiddenPotential);
    assert.ok(result.bottleneck && result.edge && result.growth);
    assert.ok(result.strength && result.risk && result.bestScene);
    assert.equal(result.tags.length, 3);
    assert.equal(result.advices.length, 3);
    assert.deepEqual(Object.keys(result.activeTalentCopy).sort(), [...KEYS].sort());
  }
  for (const dimension of DIMENSIONS) {
    const sceneReadings = RESULTS.map((result) => result.activeTalentCopy[dimension.key].scene);
    assert.equal(new Set(sceneReadings).size, RESULTS.length);
  }
});

test("结果评估文案和八项天赋分析按维度独立编写", () => {
  const assessments = RESULTS.map((result) => result.assessment);
  assert.equal(new Set(assessments).size, RESULTS.length);
  for (const result of RESULTS) {
    const copies = Object.values(result.activeTalentCopy);
    assert.equal(copies.length, DIMENSIONS.length);
    assert.equal(new Set(copies.map((copy) => `${copy.scene}|${copy.strength}|${copy.boundary}|${copy.action}`)).size, DIMENSIONS.length);
    assert.ok(copies.every((copy) => Object.values(copy).every((text) => text && text.length >= 20)));
  }
});

test("用户可见维度不使用智能或某某者命名", () => {
  const visible = [...DIMENSIONS.map((item) => item.name), ...RESULTS.map((item) => item.name)];
  assert.ok(visible.every((text) => !text.includes("智能")));
  assert.ok(visible.every((text) => !/者$/.test(text)));
});

test("题目和选项文本没有重复或过长模板", () => {
  const questions = QUESTIONS.map((question) => question.text);
  const options = QUESTIONS.flatMap((question) => question.options.map((option) => option.text));
  assert.equal(new Set(questions).size, questions.length);
  assert.equal(new Set(options).size, options.length);
  assert.ok(Math.max(...questions.map((text) => text.length)) <= 40);
  assert.ok(Math.max(...options.map((text) => text.length)) <= 42);
  assert.ok(options.every((text) => !/不仅|而不是|根据.+决定/.test(text)));
});
