import { DIMENSIONS, TIERS, DIMENSION_ADVICE } from "./data.js";

export function tierIndexFor(clearCount) {
  return TIERS.findIndex((tier) => clearCount >= tier.min && clearCount <= tier.max);
}

function stableJitter(seed, max) {
  if (max <= 0) return 0;
  let value = (seed ^ 0x9e3779b9) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 2246822507) >>> 0;
  value = Math.imul(value ^ (value >>> 13), 3266489909) >>> 0;
  return value % (max + 1);
}

function buildContrastScale(raw, answers) {
  const ordered = [...new Set(Object.values(raw))].sort((a, b) => a - b);
  if (ordered.length === 1) return new Map([[ordered[0], 68]]);
  const scale = new Map(ordered.map((value, index) => {
    const position = index / (ordered.length - 1);
    return [value, Math.round(25 + Math.pow(position, 1.05) * 63)];
  }));
  const highestRaw = ordered.at(-1);
  const secondRaw = ordered.at(-2);
  const secondValue = scale.get(secondRaw);
  const topMinimum = Math.min(97, Math.round(85 + Math.max(0, secondValue - 70) * 2 / 3));
  const topValue = topMinimum + stableJitter(answerFingerprint(answers), 100 - topMinimum);
  scale.set(highestRaw, topValue);
  return scale;
}

export function calculateResult(role, answers) {
  if (!role || answers.length !== role.questions.length) throw new Error("答题数据不完整");
  const raw = Object.fromEntries(DIMENSIONS.map(({ key }) => [key, 0]));
  let score = 0;
  let clearCount = 0;
  const misses = [];

  answers.forEach((answerIndex, questionIndex) => {
    const selected = role.questions[questionIndex].options[answerIndex];
    if (!selected) throw new Error(`第 ${questionIndex + 1} 题答案无效`);
    score += selected.points;
    if (selected.points >= 3) clearCount += 1;
    else misses.push({ questionIndex, points: selected.points, stage: role.questions[questionIndex].stage });
    raw[selected.primary] += 3;
    raw[selected.secondary] += 1;
  });

  const contrastScale = buildContrastScale(raw, answers);
  const highestRaw = Math.max(...Object.values(raw));
  const dimensions = DIMENSIONS.map((dimension) => ({
    ...dimension,
    raw: raw[dimension.key],
    value: contrastScale.get(raw[dimension.key]),
    isMax: raw[dimension.key] === highestRaw
  }));
  const sorted = [...dimensions].sort((a, b) => b.raw - a.raw || a.key.localeCompare(b.key));
  const tierIndex = tierIndexFor(clearCount);
  const tier = TIERS[tierIndex];
  const ending = role.endings[tierIndex];
  const advice = [DIMENSION_ADVICE[sorted.at(-1).key], DIMENSION_ADVICE[sorted.at(-2).key], role.specialAdvice];

  return {
    score,
    clearCount,
    tier,
    ending,
    dimensions,
    topDimensions: sorted.slice(0, 2),
    lowDimensions: sorted.slice(-2).reverse(),
    advice,
    misses
  };
}

export function answerFingerprint(answers) {
  return answers.reduce((hash, answer, index) => (hash * 33 + (answer + 1) * (index + 7)) >>> 0, 5381);
}
