/**
 * Curated starter pack mirroring `src/recommended.ts` on the backend.
 * Kept in sync manually so the Web UI can render the recommended-install
 * affordance without an extra API round-trip.
 */
export const RECOMMENDED_SKILL_IDS = [
  "commit-craft",
  "code-review",
  "secure-defaults",
  "error-handling",
  "test-discipline",
] as const;
