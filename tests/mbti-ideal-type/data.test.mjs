import assert from "node:assert/strict";
import test from "node:test";
import { AXES, DISCLAIMER, QUESTIONS, RELATIONSHIP_STAGES, RESULTS } from "./data.mjs";

test("题库包含32道四选项题，四轴和四阶段均衡覆盖", () => {
  assert.equal(AXES.length, 4);
  assert.equal(RELATIONSHIP_STAGES.length, 4);
  assert.equal(QUESTIONS.length, 32);
  assert.equal(RESULTS.length, 16);
  for (const axis of AXES) assert.equal(QUESTIONS.filter((question) => question.axis === axis.key).length, 8);
  for (const stage of RELATIONSHIP_STAGES) assert.equal(QUESTIONS.filter((question) => question.stage === stage.key).length, 8);
  for (const question of QUESTIONS) {
    assert.equal(question.options.length, 4);
    assert.deepEqual(question.options.map((option) => option.score).sort((a, b) => a - b), [-2, -1, 1, 2]);
  }
});

test("每个关系阶段均含四轴各两题", () => {
  for (const stage of RELATIONSHIP_STAGES) for (const axis of AXES) assert.equal(QUESTIONS.filter((question) => question.stage === stage.key && question.axis === axis.key).length, 2);
});

test("选项位置有打散且结果字段完整", () => {
  for (const axis of AXES) {
    const positions = QUESTIONS.filter((question) => question.axis === axis.key).flatMap((question) => question.options.map((option, index) => option.score < 0 ? index : -1).filter((index) => index >= 0));
    assert.ok(new Set(positions).size >= 3);
  }
  const expected = ["ISTJ", "ISFJ", "INFJ", "INTJ", "ISTP", "ISFP", "INFP", "INTP", "ESTP", "ESFP", "ENFP", "ENTP", "ESTJ", "ESFJ", "ENFJ", "ENTJ"];
  assert.deepEqual(RESULTS.map((result) => result.code).sort(), expected.sort());
  assert.equal(new Set(RESULTS.map((result) => result.reminder)).size, 16);
  assert.match(DISCLAIMER, /不构成官方 MBTI/);
});
