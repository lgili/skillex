/**
 * Tiny text-highlight helper for the catalog search query.
 *
 * Returns the input text broken into segments so the renderer can wrap
 * matches in a `<mark>` element without relying on `v-html`. This avoids
 * any XSS risk from skill names / descriptions and keeps the highlight
 * logic plain TypeScript (no DOM string parsing).
 */
export interface HighlightSegment {
  text: string;
  match: boolean;
}

/**
 * Splits `text` into segments around every case-insensitive occurrence of
 * `query`. Returns a single non-match segment when the query is empty or
 * absent from the text.
 *
 * @param text - The plain text to scan.
 * @param query - The user-typed search query (may be empty).
 * @returns Array of segments, each flagged `match: true|false`.
 */
export function highlightSegments(text: string, query: string): HighlightSegment[] {
  if (!text) return [{ text: "", match: false }];
  const trimmed = query.trim();
  if (!trimmed) return [{ text, match: false }];

  const lowerText = text.toLowerCase();
  const lowerQuery = trimmed.toLowerCase();
  const segments: HighlightSegment[] = [];
  let cursor = 0;
  let next = lowerText.indexOf(lowerQuery, cursor);

  while (next !== -1) {
    if (next > cursor) {
      segments.push({ text: text.slice(cursor, next), match: false });
    }
    segments.push({ text: text.slice(next, next + lowerQuery.length), match: true });
    cursor = next + lowerQuery.length;
    next = lowerText.indexOf(lowerQuery, cursor);
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), match: false });
  }

  return segments.length === 0 ? [{ text, match: false }] : segments;
}
