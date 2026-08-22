import { DIMENSIONS, DIMENSION_STATUS_COPY, QUESTIONS, RESULTS } from "../tests/socialization-degree/data.mjs";
import { calculateProfile, getSignalBounds, simulateDistribution } from "../tests/socialization-degree/model.mjs";

const sampleCount = 100000;
const distribution = simulateDistribution(sampleCount, 20260822);
const patterns = [0, 1, 2, 3].map((answer) => calculateProfile(Array(QUESTIONS.length).fill(answer)));

for (const [key, count] of Object.entries(distribution)) {
  const rate = count / sampleCount;
  if (rate < 0.03 || rate > 0.15) throw new Error(`${key} 命中率 ${rate} 不在 3%-15%`);
}

if (new Set(patterns.map((profile) => profile.result.key)).size < 3) {
  throw new Error("全选 A/B/C/D 未覆盖至少三种结果");
}

for (const result of RESULTS) {
  const profile = calculateProfile(Array.from({ length: QUESTIONS.length }, (_, index) => index % 4));
  if (!result.behaviorPattern || RESULTS.filter((item) => item.behaviorPattern === result.behaviorPattern).length !== 1) {
    throw new Error(`${result.key} 缺少独立行为模式`);
  }
  if (!result.reminder || RESULTS.filter((item) => item.reminder === result.reminder).length !== 1) {
    throw new Error(`${result.key} 缺少独立提醒`);
  }
  if (Object.keys(result.dimensionProfiles).length !== DIMENSIONS.length) {
    throw new Error(`${result.key} 缺少维度解析`);
  }
  const dimensionCopy = Object.values(result.dimensionProfiles).flatMap((profile) => [profile.focus, profile.blindSpot, profile.action]);
  if (dimensionCopy.length !== DIMENSIONS.length * 3 || new Set(dimensionCopy).size !== dimensionCopy.length) {
    throw new Error(`${result.key} 的维度解析存在重复或缺失`);
  }
  if (!result.overallReading || !Array.isArray(result.toolbox) || result.toolbox.length !== 4 || new Set(result.toolbox).size !== result.toolbox.length) {
    throw new Error(`${result.key} 缺少独立综合评价或工具箱`);
  }
  if (!profile.displayScores || Object.keys(profile.displayScores).length !== DIMENSIONS.length) {
    throw new Error("展示分维度数量不正确");
  }
}

const statusCopy = Object.values(DIMENSION_STATUS_COPY).flatMap((levels) => Object.values(levels));
if (statusCopy.length !== DIMENSIONS.length * 3 || new Set(statusCopy).size !== statusCopy.length || statusCopy.some((text) => text.includes("压力上来时容易波动"))) {
  throw new Error("分数状态提示仍存在缺失、重复或固定模板");
}

const bounds = getSignalBounds();
console.log(JSON.stringify({
  questions: QUESTIONS.length,
  dimensions: DIMENSIONS.length,
  results: RESULTS.length,
  signalBounds: bounds,
  fixedPatterns: patterns.map((profile) => profile.result.key),
  distribution
}, null, 2));
