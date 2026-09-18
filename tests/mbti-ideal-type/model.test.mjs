import assert from "node:assert/strict";
import test from "node:test";
import { AXES, QUESTIONS } from "./data.mjs";
import { calculateIdealType, getAxisQuestionCounts, rankAttractions, resolveAxis, simulateDistribution } from "./model.mjs";

test("非法答案长度和索引不可计算", () => {
  assert.throws(() => calculateIdealType([]), /需要 32 个答案/);
  const answers = Array(32).fill(0); answers[3] = 4;
  assert.throws(() => calculateIdealType(answers), /第 4 题答案无效/);
});

test("模型的四轴题量与题库一致", () => assert.deepEqual(getAxisQuestionCounts(), { ei: 8, sn: 8, tf: 8, jp: 8 }));

function answersFor(axisKey, score) {
  return QUESTIONS.map((question) => question.axis === axisKey ? question.options.findIndex((option) => option.score === score) : question.options.findIndex((option) => option.score === -1));
}

test("每条轴按语义分数形成可解释方向", () => {
  for (const axis of AXES) {
    assert.equal(resolveAxis(axis, answersFor(axis.key, -2)).direction, axis.left);
    assert.equal(resolveAxis(axis, answersFor(axis.key, 2)).direction, axis.right);
  }
});

test("相同答案序列稳定，固定模式至少产生三种类型", () => {
  const answers = Array.from({ length: 32 }, (_, index) => index % 4);
  assert.deepEqual(calculateIdealType(answers), calculateIdealType(answers));
  const codes = [0, 1, 2, 3].map((answer) => calculateIdealType(Array(32).fill(answer)).code);
  assert.ok(new Set(codes).size >= 3, codes.join(","));
});

test("十万份随机答卷覆盖十六型且单型命中率在范围内", () => {
  const counts = simulateDistribution(100000, 20260913);
  assert.equal(Object.keys(counts).length, 16);
  for (const [code, count] of Object.entries(counts)) {
    const rate = count / 100000;
    assert.ok(rate >= 0.03 && rate <= 0.15, `${code}: ${rate}`);
  }
});

test("十六型吸引力排行完整、稳定且理想型居首", () => {
  const answers = QUESTIONS.map((question) => question.options.findIndex((option) => option.score === -2));
  const profile = calculateIdealType(answers);
  const ranking = rankAttractions(profile.axisProfiles);
  assert.equal(ranking.length, 16);
  assert.equal(new Set(ranking.map((item) => item.code)).size, 16);
  assert.equal(ranking[0].code, profile.code);
  assert.equal(ranking[0].score, 98);
  assert.equal(ranking.at(-1).score, 2);
  assert.ok(ranking.every((item, index) => item.rank === index + 1 && item.score >= 0 && item.score <= 100));
  assert.deepEqual(ranking, rankAttractions(profile.axisProfiles));
  assert.deepEqual(profile.attractionRanking, ranking);
});

test("四条偏好方向一致时，理想型匹配分不应被弱偏好压低", () => {
  const answers = QUESTIONS.map((question) => question.options.findIndex((option) => option.score === -1));
  const profile = calculateIdealType(answers);
  assert.equal(profile.attractionRanking[0].code, profile.code);
  assert.ok(profile.attractionRanking[0].score >= 90, `理想型分数过低：${profile.attractionRanking[0].score}`);
});

test("排行榜保留连续差异，不应因四轴平均造成大面积并列", () => {
  let seed = 20260917;
  const uniqueCounts = [];
  for (let sample = 0; sample < 12; sample += 1) {
    const answers = Array.from({ length: QUESTIONS.length }, () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return (seed >>> 28) % 4;
    });
    const ranking = calculateIdealType(answers).attractionRanking;
    uniqueCounts.push(new Set(ranking.map((item) => item.score)).size);
  }
  assert.ok(Math.min(...uniqueCounts) >= 12, `排行榜有效分值过少：${uniqueCounts.join(",")}`);
});
