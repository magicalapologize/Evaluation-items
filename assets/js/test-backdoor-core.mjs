export const BACKDOOR_CODE = "YUNDU-RESULT-2026";

export function normalizeCode(value) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
}

export function isBackdoorCode(value) {
  return normalizeCode(value) === BACKDOOR_CODE;
}

export function findAnswerSet({ questionCount, optionCount = 4, getResultKey, target, attempts = 6000 }) {
  if (!Number.isInteger(questionCount) || questionCount < 1 || typeof getResultKey !== "function") return null;
  let seed = 2166136261;
  const next = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
  const candidates = [0, 1, 2, 3].map((value) => Array.from({ length: questionCount }, () => value));
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    candidates.push(Array.from({ length: questionCount }, () => Math.floor(next() * optionCount)));
  }
  return candidates.find((answers) => getResultKey(answers) === target) || null;
}
