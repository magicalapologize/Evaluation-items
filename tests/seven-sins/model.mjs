import { DIMENSIONS, QUESTIONS, RESULTS } from "./data.mjs";

const KEYS = DIMENSIONS.map(({ key }) => key);

const SIGNAL_STATS = Object.fromEntries(KEYS.map((key) => [key, QUESTIONS.reduce((stats, question) => {
  const values = question.options.map((option) => option.scores[key]);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return {
    min: stats.min + Math.min(...values),
    max: stats.max + Math.max(...values),
    variance: stats.variance + variance
  };
}, { min: 0, max: 0, variance: 0 })]));

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
  return Object.fromEntries(KEYS.map((key) => [
    key,
    clamp(0.5 + raw[key] / (4 * Math.sqrt(SIGNAL_STATS[key].variance)), 0, 1)
  ]));
}

function displayScale(signals) {
  return Object.fromEntries(KEYS.map((key) => [key, Math.round(signals[key] * 100)]));
}

export function getSignalBounds() {
  return Object.fromEntries(KEYS.map((key) => [key, {
    min: SIGNAL_STATS[key].min,
    max: SIGNAL_STATS[key].max
  }]));
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
  const ranking = [...KEYS].sort((left, right) => signals[right] - signals[left]);
  const maxSignal = Math.max(...Object.values(signals));
  const topKeys = KEYS.filter((key) => Math.abs(signals[key] - maxSignal) <= Number.EPSILON * 8);
  const resultKey = topKeys[hashAnswers(answerIndexes) % topKeys.length];
  const result = RESULTS.find((item) => item.key === resultKey);
  const displayScores = displayScale(signals);
  const total = Math.round(Object.values(displayScores).reduce((sum, value) => sum + value, 0) / KEYS.length);

  return {
    result,
    raw,
    signals,
    displayScores,
    ranking,
    topKeys,
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
