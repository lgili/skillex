## 1. Schema-driven flag parser

- [ ] 1.1 Define a per-command flag schema (`{ name, alias?, type: "string" | "boolean" | "stringArray", description, hidden? }`) co-located with each handler in `src/cli.ts`.
- [ ] 1.2 Rewrite `parseArgs` to consume the schema, returning a typed flag bag plus `positional` and `positionalAfter` arrays.
- [ ] 1.3 Reject unknown flags with `CliError` code `UNKNOWN_FLAG`; include the closest matching flag name (Levenshtein distance ≤ 2) in the message.
- [ ] 1.4 Detect missing values: if a flag declared `type: "string"` is consumed without a following value (or the next token starts with `-`), raise `MISSING_FLAG_VALUE` naming the flag.
- [ ] 1.5 Honor the `--` sentinel; pass remaining tokens as `positionalAfter` to handlers.

## 2. Parser tests

- [ ] 2.1 Add `test/cli-parser.test.ts` covering: known flags, unknown flag with suggestion, missing value, mixed `--flag=value` and `--flag value`, repeated flags (last-wins or stringArray), the `--` sentinel.
- [ ] 2.2 Snapshot the error messages so future changes to wording are intentional.

## 3. Improved error messages

- [ ] 3.1 Rewrite `parseBooleanFlag` (`src/cli.ts:1095`) to include the flag name and accepted values; example: `Invalid value "maybe" for --auto-sync. Use true, false, yes, no, 1, or 0.`
- [ ] 3.2 Rewrite `INSTALL_NO_TARGETS` (`src/install.ts:174`) to include a 3-line usage hint inline.
- [ ] 3.3 Add unknown-command detection to the dispatch loop; suggest the closest command using the same `suggestClosest` helper.

## 4. Doctor error differentiation

- [ ] 4.1 In `src/cli.ts:728-734`, branch on `error.cause?.code` (or string match on `EAI_AGAIN`, `ECONNREFUSED`, `ECONNRESET`, etc.) and emit one of: `DNS lookup failed`, `Connection refused`, `TLS handshake failed`, `Server error (5xx)`, `Other network error`.
- [ ] 4.2 Always include the underlying `error.message` for diagnostics.
- [ ] 4.3 Update doctor output spec scenarios.

## 5. Dry-run exit code

- [ ] 5.1 Add `--exit-code` flag to `sync` command schema.
- [ ] 5.2 In `handleSync`, when the flag is set and `result.changed` is true for any adapter, set `process.exitCode = 1`.
- [ ] 5.3 Update `README.md` `sync` section with a CI-usage example.

## 6. Output utility

- [ ] 6.1 Add `suggestClosest(actual, candidates, threshold = 2)` to `src/output.ts`, using a small Levenshtein implementation.
- [ ] 6.2 Add a unit test covering exact match, near match, no match, and ties.

## 7. Documentation

- [ ] 7.1 Update README's "Global Flags" and per-command tables: now that unknown flags error, contributors must keep the schema in sync with docs.
- [ ] 7.2 Add a CHANGELOG `[Unreleased]` entry summarizing the parser hardening.
