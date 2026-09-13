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

test("十六种结果带有常见中文人格称谓", () => {
  const expectedNames = {
    ISTJ: "物流师", ISFJ: "守卫者", INFJ: "提倡者", INTJ: "建筑师",
    ISTP: "鉴赏家", ISFP: "探险家", INFP: "调停者", INTP: "逻辑学家",
    ESTP: "企业家", ESFP: "表演者", ENFP: "竞选者", ENTP: "辩论家",
    ESTJ: "总经理", ESFJ: "执政官", ENFJ: "主人公", ENTJ: "指挥官"
  };
  assert.deepEqual(Object.fromEntries(RESULTS.map((result) => [result.code, result.mbtiName])), expectedNames);
});

test("每种结果都有四个独立的深度关系解读板块", () => {
  const expectedKeys = ["desireDecode", "coreAttraction", "relationshipScene", "realityWarning"];
  for (const result of RESULTS) {
    assert.deepEqual(result.insights.map((insight) => insight.key), expectedKeys, `${result.code} 解读板块不完整`);
    assert.equal(new Set(result.insights.map((insight) => insight.body)).size, 4, `${result.code} 解读内容重复`);
    for (const insight of result.insights) {
      assert.ok(insight.title && insight.body, `${result.code} 缺少 ${insight.key}`);
      assert.ok(insight.body.length >= 100, `${result.code}/${insight.key} 内容过短`);
    }
  }
  assert.equal(new Set(RESULTS.flatMap((result) => result.insights.map((insight) => insight.body))).size, 64);
});

test("深度解读保持关系偏好边界，不伪装成诊断或匹配保证", () => {
  const copy = JSON.stringify(RESULTS.map((result) => result.insights));
  assert.doesNotMatch(copy, /绝对适合|天生一对|注定|保证匹配|诊断为|你就是/);
});

test("核心吸引力使用用户能读懂的关系语言", () => {
  const copy = JSON.stringify(RESULTS.map((result) => result.insights.find((insight) => insight.key === "coreAttraction")?.body));
  assert.doesNotMatch(copy, /常见功能模型|功能描述|\b(?:Ni|Ne|Si|Se|Ti|Te|Fi|Fe)\b/);
});

test("相处建议不复用统一免责声明尾句", () => {
  const boundaries = RESULTS.flatMap((result) => result.advices.map((advice) => advice.boundary).filter(Boolean));
  assert.ok(boundaries.length === 0 || new Set(boundaries).size > 1, "建议不应全部以同一条尾句结尾");
});
