/**
 * Curated starter pack installed when the user passes
 * `skillex init --install-recommended`.
 *
 * Keep this list short and broadly useful. Anything specialised (LaTeX,
 * power electronics, ...) belongs in the full catalog.
 */
export const RECOMMENDED_SKILL_IDS = Object.freeze([
  "commit-craft",
  "code-review",
  "secure-defaults",
  "error-handling",
  "test-discipline",
] as const);

/**
 * Returns the recommended skill ids as a mutable string array (suitable for
 * passing to `installSkills`).
 */
export function getRecommendedSkillIds(): string[] {
  return [...RECOMMENDED_SKILL_IDS];
}
