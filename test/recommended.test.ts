import test from "node:test";
import assert from "node:assert/strict";

import { RECOMMENDED_SKILL_IDS, getRecommendedSkillIds } from "../src/recommended.js";

test("RECOMMENDED_SKILL_IDS is the canonical curated starter pack", () => {
  // Snapshot the list so changes are intentional. Update this assertion when
  // RECOMMENDED_SKILL_IDS changes; the test exists to make additions/removals
  // explicit in code review.
  assert.deepEqual(
    [...RECOMMENDED_SKILL_IDS],
    ["commit-craft", "code-review", "secure-defaults", "error-handling", "test-discipline"],
  );
});

test("getRecommendedSkillIds returns a fresh mutable copy", () => {
  const a = getRecommendedSkillIds();
  const b = getRecommendedSkillIds();
  assert.notEqual(a, b, "expected separate array instances");
  assert.deepEqual(a, b);
  // Mutating the copy must not affect the source of truth.
  a.push("invented-skill");
  assert.equal(getRecommendedSkillIds().length, RECOMMENDED_SKILL_IDS.length);
});
