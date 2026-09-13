import { AXES, QUESTIONS, RESULTS } from "../tests/mbti-ideal-type/data.mjs";
import { calculateIdealType, getAxisQuestionCounts, simulateDistribution } from "../tests/mbti-ideal-type/model.mjs";

const counts = getAxisQuestionCounts();
const fixed = [0, 1, 2, 3].map((answer) => calculateIdealType(Array(32).fill(answer)).code);
const distribution = simulateDistribution(100000, 20260913);
if (QUESTIONS.length !== 32 || RESULTS.length !== 16 || Object.values(counts).some((count) => count !== 8)) throw new Error("题库数量或轴覆盖不符合要求");
if (new Set(RESULTS.map((result) => result.reminder)).size !== RESULTS.length) throw new Error("结果提醒不唯一");
if (new Set(fixed).size < 3) throw new Error(`固定模式结果不足三种: ${fixed.join(", ")}`);
for (const [code, count] of Object.entries(distribution)) {
  const rate = count / 100000;
  if (rate < 0.03 || rate > 0.15) throw new Error(`${code} 命中率 ${rate} 超出 3%-15%`);
}
console.log(JSON.stringify({ questionCount: QUESTIONS.length, axisCounts: counts, resultCount: RESULTS.length, fixed, distribution }, null, 2));
