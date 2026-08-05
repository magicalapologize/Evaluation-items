import { DIMENSIONS, QUESTIONS, RESULTS } from "./data.mjs";

const KEYS = DIMENSIONS.map(({ key }) => key);
const RESULT_BIAS = {
  pride: -0.002,
  greed: 0.003,
  lust: 0.001,
  envy: 0.01,
  wrath: 0.003,
  gluttony: 0.003,
  sloth: 0.006
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hashAnswers(answers) {
  let hash = 2166136261;
  for (const answer of answers) {
    hash ^= Number(answer) + 31;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function normalizeSignals(raw) {
  const bounds = Object.fromEntries(KEYS.map((key) => [key, 0]));
  QUESTIONS.forEach((question) => {
    KEYS.forEach((key) => {
      bounds[key] = Math.max(
        bounds[key],
        ...question.options.map((option) => Math.abs(option.scores[key]))
      );
    });
  });
  return Object.fromEntries(KEYS.map((key) => [
    key,
    clamp(0.5 + raw[key] / (bounds[key] * QUESTIONS.length), 0, 1)
  ]));
}

function distance(left, right) {
  return KEYS.reduce((sum, key) => sum + (left[key] - right[key]) ** 2, 0);
}

function displayScale(signals) {
  const values = Object.values(signals);
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return Object.fromEntries(KEYS.map((key) => [key, 50]));
  return Object.fromEntries(KEYS.map((key) => [
    key,
    Math.round(35 + ((signals[key] - min) / (max - min)) * 60)
  ]));
}

export function calculateProfile(answerIndexes) {
  if (!Array.isArray(answerIndexes) || answerIndexes.length !== QUESTIONS.length) {
    throw new Error(`需要 ${QUESTIONS.length} 个答案`);
  }

  const raw = Object.fromEntries(KEYS.map((key) => [key, 0]));
  answerIndexes.forEach((answerIndex, questionIndex) => {
    const option = QUESTIONS[questionIndex].options[Number(answerIndex)];
    if (!option) throw new Error(`第 ${questionIndex + 1} 题答案无效`);
    KEYS.forEach((key) => { raw[key] += option.scores[key]; });
  });

  const signals = normalizeSignals(raw);
  const ranked = RESULTS.map((result) => ({
    result,
    score: distance(signals, result.prototype) + RESULT_BIAS[result.key]
  }))
    .sort((left, right) => left.score - right.score);
  const bestScore = ranked[0].score;
  const tied = ranked.filter((item) => item.score - bestScore <= 0.015);
  const result = tied[hashAnswers(answerIndexes) % tied.length].result;
  const ranking = [...KEYS].sort((left, right) => signals[right] - signals[left]);
  const displayScores = displayScale(signals);
  const total = Math.round(Object.values(displayScores).reduce((sum, value) => sum + value, 0) / KEYS.length);

  return {
    result,
    raw,
    signals,
    displayScores,
    ranking,
    secondKey: ranking[1],
    total,
    fingerprint: hashAnswers(answerIndexes).toString(16)
  };
}

export function simulateDistribution(sampleCount = 100000, seed = 20260805) {
  let state = seed >>> 0;
  const counts = Object.fromEntries(RESULTS.map((result) => [result.key, 0]));
  for (let sample = 0; sample < sampleCount; sample += 1) {
    const answers = Array.from({ length: QUESTIONS.length }, () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state % 5;
    });
    counts[calculateProfile(answers).result.key] += 1;
  }
  return counts;
}
