import { DIMENSIONS, TIERS, DIMENSION_ADVICE, ROLES, SURVIVAL_COPY } from "./data.js";

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

export function settleSurvivalAnswer(state, selected) {
  if (!selected || ![0, 1, 3, 5].includes(selected.points)) throw new Error("生存选项无效");
  if (selected.points === 5) return { failStreak: 0, totalDanger: state.totalDanger };
  if (selected.points === 3) return { failStreak: Math.max(0, state.failStreak - 1), totalDanger: state.totalDanger };
  return {
    failStreak: state.failStreak + 1,
    totalDanger: state.totalDanger + (selected.points === 0 ? 2 : 1)
  };
}

export function shouldEndSurvival(state, questionNumber, points = null) {
  if (questionNumber < 4) return false;
  if (questionNumber === 4 && points >= 3) return false;
  return state.failStreak >= 3 || state.totalDanger >= 6;
}

function survivalTierIndex(survivedCount, totalDanger) {
  if (survivedCount >= 12) return totalDanger === 0 ? 5 : 4;
  if (survivedCount <= 5) return 0;
  if (survivedCount <= 7) return 1;
  if (survivedCount <= 9) return 2;
  return 3;
}

function survivalDanger(history) {
  return history.reduce((sum, item) => sum + (item.option.points === 0 ? 2 : item.option.points === 1 ? 1 : 0), 0);
}

function primaryCause(history) {
  const misses = history.filter((item) => item.option.points <= 1);
  if (!misses.length) return null;
  const weights = Object.fromEntries(DIMENSIONS.map(({ key }) => [key, 0]));
  misses.forEach(({ option }) => { weights[option.primary] += option.points === 0 ? 2 : 1; });
  const maximum = Math.max(...Object.values(weights));
  const candidates = new Set(Object.entries(weights).filter(([, value]) => value === maximum).map(([key]) => key));
  return misses.find(({ option }) => option.points === 0 && candidates.has(option.primary))?.option.primary
    || misses.find(({ option }) => candidates.has(option.primary)).option.primary;
}

function survivalDimensions(history) {
  const values = Object.fromEntries(DIMENSIONS.map(({ key }) => [key, 50]));
  const deltas = { 5: [8, 3], 3: [4, 2], 1: [-5, -2], 0: [-9, -4] };
  history.forEach(({ option }) => {
    const [primary, secondary] = deltas[option.points];
    values[option.primary] += primary;
    values[option.secondary] += secondary;
  });
  const bounded = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, Math.max(18, Math.min(95, value))]));
  const maximum = Math.max(...Object.values(bounded));
  return DIMENSIONS.map((dimension) => ({ ...dimension, raw: bounded[dimension.key], value: bounded[dimension.key], isMax: bounded[dimension.key] === maximum }));
}

export function calculateSurvivalResult(role, history) {
  if (!role || !Array.isArray(history) || history.length < 1 || history.length > 12) throw new Error("生存答题数据不完整");
  const totalDanger = survivalDanger(history);
  const survivedCount = history.length;
  const cleared = survivedCount === 12;
  const tierIndex = survivalTierIndex(survivedCount, totalDanger);
  const roleKey = Object.entries(ROLES).find(([, candidate]) => candidate === role)?.[0];
  if (!roleKey) throw new Error("生存角色无效");
  const causeKey = primaryCause(history);
  const average = history.reduce((sum, item) => sum + item.option.points, 0) / survivedCount;
  const deadliest = history.reduce((worst, item) => !worst || item.option.points < worst.option.points ? item : worst, null);
  return {
    survivedCount,
    cleared,
    totalDanger,
    title: SURVIVAL_COPY.titles[tierIndex],
    ending: SURVIVAL_COPY.roleEndings[roleKey][tierIndex],
    temperature: Math.round(Math.max(5, Math.min(100, 20 + average * 16 - totalDanger * 4))),
    causeKey,
    causeText: causeKey ? SURVIVAL_COPY.causes[causeKey] : "本局没有明显致命选择",
    correction: causeKey ? DIMENSION_ADVICE[causeKey] : "这局没有明显致命伤。继续保持直接表达，也别因为顺利就省略确认和兑现。",
    deadliest,
    dimensions: survivalDimensions(history)
  };
}
