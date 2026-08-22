import { DIMENSIONS, QUESTIONS, RESULTS, STAGES } from "./data.mjs";

const KEYS = DIMENSIONS.map(({ key }) => key);

const SIGNAL_STATS = Object.fromEntries(KEYS.map((key) => [key, QUESTIONS.reduce((stats, question) => {
  const values = question.options.map((option) => option.scores[key]);
  return {
    min: stats.min + Math.min(...values),
    max: stats.max + Math.max(...values)
  };
}, { min: 0, max: 0 })]));

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
  return Object.fromEntries(KEYS.map((key) => {
    const range = SIGNAL_STATS[key].max - SIGNAL_STATS[key].min;
    return [key, range ? clamp((raw[key] - SIGNAL_STATS[key].min) / range, 0, 1) : 0.5];
  }));
}

function matchScale(signals) {
  return Object.fromEntries(KEYS.map((key) => [key, signals[key]]));
}

function displayScale(signals, result) {
  const displayPrototype = result.displayPrototype || result.prototype;
  return Object.fromEntries(KEYS.map((key) => {
    const blended = displayPrototype[key] * 0.72 + signals[key] * 0.28;
    return [key, Math.round(clamp(blended * 100, 35, 95))];
  }));
}

function distance(left, right) {
  return Math.sqrt(KEYS.reduce((sum, key) => sum + (left[key] - right[key]) ** 2, 0));
}

function chooseResult(signals, answers) {
  const matches = RESULTS.map((result) => ({ result, distance: distance(signals, result.prototype) }));
  const nearestDistance = Math.min(...matches.map(({ distance: value }) => value));
  const nearest = matches.filter(({ distance: value }) => Math.abs(value - nearestDistance) < 1e-12);
  const selected = nearest[hashAnswers(answers) % nearest.length];
  return { result: selected.result, nearestDistance, topKeys: nearest.map(({ result }) => result.key) };
}

export function getStageForScore(score) {
  if (!Number.isFinite(score) || score < 0 || score > 100) throw new Error("阶段分数必须在0-100");
  return STAGES.find((stage) => score >= stage.min && score <= stage.max);
}

export function getSignalBounds() {
  return Object.fromEntries(KEYS.map((key) => [key, { ...SIGNAL_STATS[key] }]));
}

export function calculateProfile(answerIndexes) {
  if (!Array.isArray(answerIndexes) || answerIndexes.length !== QUESTIONS.length) {
    throw new Error(`需要 ${QUESTIONS.length} 个答案`);
  }

  const raw = Object.fromEntries(KEYS.map((key) => [key, 0]));
  answerIndexes.forEach((answerIndex, questionIndex) => {
    const option = QUESTIONS[questionIndex].options[Number(answerIndex)];
    if (!option) throw new Error(`第 ${questionIndex + 1} 题答案无效`);
    for (const key of KEYS) raw[key] += option.scores[key];
  });

  const signals = normalizeSignals(raw);
  const matchSignals = matchScale(signals);
  const { result, topKeys } = chooseResult(matchSignals, answerIndexes);
  const displayScores = displayScale(signals, result);
  const ranking = [...KEYS].sort((left, right) => displayScores[right] - displayScores[left]);
  const total = Math.round(Object.values(displayScores).reduce((sum, value) => sum + value, 0) / KEYS.length);
  const stage = getStageForScore(total);

  return {
    result,
    stage,
    raw,
    signals,
    matchSignals,
    displayScores,
    ranking,
    topKeys,
    secondKey: ranking[1],
    total,
    fingerprint: hashAnswers(answerIndexes).toString(16)
  };
}

export function simulateDistribution(sampleCount = 100000, seed = 20260822) {
  let state = seed >>> 0;
  const counts = Object.fromEntries(RESULTS.map((result) => [result.key, 0]));
  for (let sample = 0; sample < sampleCount; sample += 1) {
    const answers = Array.from({ length: QUESTIONS.length }, () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return (state >>> 28) % 4;
    });
    counts[calculateProfile(answers).result.key] += 1;
  }
  return counts;
}
