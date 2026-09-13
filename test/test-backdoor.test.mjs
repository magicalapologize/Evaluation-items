import test from "node:test";
import assert from "node:assert/strict";
import { BACKDOOR_CODE, findAnswerSet, isBackdoorCode, normalizeCode } from "../assets/js/test-backdoor-core.mjs";

test("accepts the shared backdoor code with harmless formatting differences", () => {
  assert.equal(isBackdoorCode(BACKDOOR_CODE), true);
  assert.equal(isBackdoorCode(` ${BACKDOOR_CODE.toLowerCase()} `), true);
  assert.equal(isBackdoorCode("another-code"), false);
  assert.equal(normalizeCode(" a b-c "), "AB-C");
});

test("finds a deterministic answer set for a requested legal result", () => {
  const answers = findAnswerSet({
    questionCount: 3,
    optionCount: 2,
    target: "B",
    getResultKey: (values) => values.every((value) => value === 1) ? "B" : "A",
    attempts: 20
  });
  assert.deepEqual(answers, [1, 1, 1]);
});
