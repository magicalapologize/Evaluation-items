import { AXES, QUESTIONS, RESULTS } from "./data.mjs";

const QUESTION_BY_ID = new Map(QUESTIONS.map((question) => [question.id, question]));

function hashAnswers(answers, salt = "") {
  let hash = 2166136261;
  for (const value of `${salt}:${answers.join(",")}`) {
    hash ^= value.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function selectedScore(questionId, answers) {
  const questionIndex = QUESTIONS.findIndex((question) => question.id === questionId);
  const optionIndex = Number(answers[questionIndex]);
  return QUESTION_BY_ID.get(questionId)?.options[optionIndex]?.score || 0;
}

function deterministicBit(answers, axisKey) {
  return hashAnswers(answers, axisKey) % 2;
}

function getDisplayValue(rawScore) {
  const strength = Math.min(1, Math.abs(rawScore) / 16);
  return Math.round(50 + strength * 45);
}

function getMatchScore(profile, letter) {
  const sameDirection = letter === profile.direction;
  const confidence = Math.min(1, Math.abs(Number(profile.displayValue) - 50) / 45);
  return sameDirection ? 90 + confidence * 8 : 10 - confidence * 8;
}

export function rankAttractions(axisProfiles) {
  if (!Array.isArray(axisProfiles) || axisProfiles.length !== AXES.length) throw new Error("需要四条关系偏好轴");
  const preferredCode = axisProfiles.map((profile) => profile.direction).join("");
  const ranking = RESULTS.map((result) => {
    const axisScores = result.code.split("").map((letter, index) => {
      const profile = axisProfiles[index];
      return getMatchScore(profile, letter);
    });
    const exactScore = axisScores.reduce((sum, score) => sum + score, 0) / axisScores.length;
    return { code: result.code, mbtiName: result.mbtiName, name: result.name, score: Math.round(exactScore), exactScore };
  }).sort((left, right) => right.exactScore - left.exactScore || (right.code === preferredCode ? 1 : 0) - (left.code === preferredCode ? 1 : 0) || left.code.localeCompare(right.code));
  return ranking.map((item, index) => ({ rank: index + 1, code: item.code, mbtiName: item.mbtiName, name: item.name, score: item.score }));
}

export function resolveAxis(axis, answers) {
  const questions = QUESTIONS.filter((question) => question.axis === axis.key);
  let rawScore = 0;
  const strongCount = { left: 0, right: 0 };
  for (const question of questions) {
    const option = question.options[Number(answers[QUESTIONS.indexOf(question)])];
    if (!option) throw new Error(`第 ${QUESTIONS.indexOf(question) + 1} 题答案无效`);
    rawScore += option.score;
    if (Math.abs(option.score) === 2) strongCount[option.score < 0 ? "left" : "right"] += 1;
  }
  let direction;
  let tieBreak = "raw-score";
  if (rawScore < 0) direction = axis.left;
  else if (rawScore > 0) direction = axis.right;
  else if (strongCount.left !== strongCount.right) {
    direction = strongCount.left > strongCount.right ? axis.left : axis.right;
    tieBreak = "strong-count";
  } else {
    const anchorSum = axis.anchorQuestionIds.reduce((sum, id) => sum + selectedScore(id, answers), 0);
    if (anchorSum < 0) direction = axis.left;
    else if (anchorSum > 0) direction = axis.right;
    else {
      direction = deterministicBit(answers, axis.key) === 0 ? axis.left : axis.right;
      tieBreak = "fingerprint";
    }
    if (anchorSum !== 0) tieBreak = "anchor";
  }
  const status = Math.abs(rawScore) >= 8 ? "明显偏好" : Math.abs(rawScore) >= 3 ? "温和偏好" : "偏好接近均衡";
  return { key: axis.key, direction, rawScore, strongCount, status, displayValue: getDisplayValue(rawScore), label: direction === axis.left ? `${axis.left}｜${axis.leftLabel}` : `${axis.right}｜${axis.rightLabel}`, tieBreak };
}

export function getAxisQuestionCounts() {
  return Object.fromEntries(AXES.map((axis) => [axis.key, QUESTIONS.filter((question) => question.axis === axis.key).length]));
}

export function calculateIdealType(answerIndexes) {
  if (!Array.isArray(answerIndexes) || answerIndexes.length !== QUESTIONS.length) throw new Error(`需要 ${QUESTIONS.length} 个答案`);
  answerIndexes.forEach((answerIndex, questionIndex) => {
    if (!QUESTIONS[questionIndex].options[Number(answerIndex)]) throw new Error(`第 ${questionIndex + 1} 题答案无效`);
  });
  const axisProfiles = AXES.map((axis) => resolveAxis(axis, answerIndexes));
  const code = axisProfiles.map((profile) => profile.direction).join("");
  return { code, result: RESULTS.find((result) => result.code === code), axisProfiles, attractionRanking: rankAttractions(axisProfiles), fingerprint: hashAnswers(answerIndexes).toString(16) };
}

export function simulateDistribution(sampleCount = 100000, seed = 20260913) {
  let state = seed >>> 0;
  const counts = Object.fromEntries(RESULTS.map((result) => [result.code, 0]));
  for (let sample = 0; sample < sampleCount; sample += 1) {
    const answers = Array.from({ length: QUESTIONS.length }, () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return (state >>> 28) % 4;
    });
    counts[calculateIdealType(answers).code] += 1;
  }
  return counts;
}
