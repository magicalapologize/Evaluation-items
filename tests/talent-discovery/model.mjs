import { CAREER_TRACKS, DIMENSIONS, QUESTIONS, RESULTS } from "./data.mjs";

const KEYS = DIMENSIONS.map(({ key }) => key);
const SIGNAL_BOUNDS = Object.fromEntries(KEYS.map((key) => [key, QUESTIONS.reduce((range, question) => {
  const values = question.options.map((option) => option.scores[key] || 0);
  return { min: range.min + Math.min(...values), max: range.max + Math.max(...values) };
}, { min: 0, max: 0 })]));

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

function hashAnswers(answers) {
  let hash = 2166136261;
  for (const answer of answers) {
    hash ^= Number(answer) + 31;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function normalize(raw) {
  return Object.fromEntries(KEYS.map((key) => {
    const bound = SIGNAL_BOUNDS[key];
    const range = bound.max - bound.min || 1;
    return [key, clamp((raw[key] - bound.min) / range, 0, 1)];
  }));
}

function displayScale(signals) {
  const values = Object.values(signals);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min || 1;
  return Object.fromEntries(KEYS.map((key) => [key, Math.round(38 + ((signals[key] - min) / spread) * 57)]));
}

function stableSortKeys(scores, fingerprint) {
  return [...KEYS].sort((left, right) => (scores[right] - scores[left]) ||
    (((fingerprint ^ (right.charCodeAt(0) * 2654435761)) >>> 0) - ((fingerprint ^ (left.charCodeAt(0) * 2654435761)) >>> 0)));
}

function chooseBest(signals, answers) {
  const fingerprint = hashAnswers(answers);
  const ranking = stableSortKeys(signals, fingerprint);
  return { ranking, bestKey: ranking[0], supportKey: ranking[1], fingerprint };
}

export function getSignalBounds() {
  return Object.fromEntries(KEYS.map((key) => [key, { ...SIGNAL_BOUNDS[key] }]));
}

export function getActiveTalents(profile) {
  return profile.ranking.slice(0, 4);
}

export function getAwakeningTalent(profile) {
  const candidates = profile.ranking.slice(4).filter((key) => profile.signals[key] > 0);
  return candidates[0] || profile.ranking[profile.ranking.length - 1];
}

export function rankCareerTracks(profile) {
  return CAREER_TRACKS.map((track) => {
    const overlap = track.dims.reduce((sum, key, index) => sum + profile.signals[key] * (index === 0 ? 1.15 : 0.9), 0);
    return { ...track, fit: Math.round(58 + overlap * 32) };
  }).sort((left, right) => (right.fit - left.fit) || left.name.localeCompare(right.name, "zh-CN"));
}

export function calculateProfile(answerIndexes) {
  if (!Array.isArray(answerIndexes) || answerIndexes.length !== QUESTIONS.length) {
    throw new Error(`需要 ${QUESTIONS.length} 个答案`);
  }
  const raw = Object.fromEntries(KEYS.map((key) => [key, 0]));
  answerIndexes.forEach((answerIndex, questionIndex) => {
    const option = QUESTIONS[questionIndex].options[Number(answerIndex)];
    if (!option) throw new Error(`第 ${questionIndex + 1} 题答案无效`);
    for (const key of KEYS) raw[key] += Number(option.scores[key] || 0);
  });
  const signals = normalize(raw);
  const { ranking, bestKey, supportKey, fingerprint } = chooseBest(signals, answerIndexes);
  const profile = { raw, signals, displayScores: displayScale(signals), ranking, bestKey, supportKey, fingerprint: fingerprint.toString(16) };
  profile.activeKeys = getActiveTalents(profile);
  profile.awakeningKey = getAwakeningTalent(profile);
  profile.result = RESULTS.find((item) => item.key === bestKey);
  profile.careerTracks = rankCareerTracks(profile);
  return profile;
}

export function simulateDistribution(sampleCount = 100000, seed = 20260907) {
  let state = seed >>> 0;
  const counts = Object.fromEntries(KEYS.map((key) => [key, 0]));
  for (let sample = 0; sample < sampleCount; sample += 1) {
    const answers = Array.from({ length: QUESTIONS.length }, () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return (state >>> 28) % 4;
    });
    counts[calculateProfile(answers).bestKey] += 1;
  }
  return counts;
}
