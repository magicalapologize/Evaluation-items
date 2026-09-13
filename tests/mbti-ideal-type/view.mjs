export function formatAnswerOption(displayIndex, text) {
  return `${String.fromCharCode(65 + displayIndex)}. ${text}`;
}

export function formatMbtiType(result) {
  return `${result.code} · ${result.mbtiName}`;
}
