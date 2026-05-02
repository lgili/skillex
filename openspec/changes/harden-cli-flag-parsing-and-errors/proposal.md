## Why

The current CLI parser in `src/cli.ts:987-1029` is permissive in ways that
silently produce wrong behavior:

- **Unknown flags are accepted**. `parseArgs` collects every `--flag` into a
  `Record<string, string | boolean>` with no validation. A typo
  (`--scop=global`) is silently ignored and the command runs with default
  values. Users have no signal something is wrong.
- **No `--` end-of-options sentinel**. `skillex run skill:cmd -- --foo` mixes
  `--foo` into the flag bag.
- **Greedy value consumption**. `--flag value` consumes the next token
  unless it starts with `-`, so `skillex install --repo foo --tag` parses
  `--tag` as the repo value.
- **`--repo` without a value silently uses default**. `asOptionalString`
  returns `undefined` when the value is boolean `true`, so `--repo` (no
  argument) is indistinguishable from "user typed nothing".
- **Unknown commands have no suggestion**. `skillex insall git-master`
  prints `Unknown command: insall` with no Levenshtein hint.

Error messages also bleed user trust:

- `INVALID_BOOLEAN_FLAG` (`cli.ts:1095`) prints `Invalid boolean value:
  maybe` without naming the flag or listing accepted values.
- `Provide at least one skill-id, use --all, or pass owner/repo[@ref].`
  (`install.ts:174`) is correct but doesn't show the help block, so users
  scroll for context.
- The `doctor` GitHub check (`cli.ts:728-734`) catches every error and
  reports "GitHub API is unreachable" — DNS errors, TLS errors, and 5xx
  all collapse into one indistinguishable hint.

Finally, the dry-run path of `sync` does not set a non-zero exit when drift
exists, so CI scripts cannot detect "config out of sync".

## What Changes

- The argv parser MUST be schema-driven: each command declares the flags
  it accepts, and unknown flags trigger an error with a Levenshtein
  suggestion ("Did you mean `--scope`?").
- The parser MUST honor the `--` sentinel: tokens after `--` are passed to
  handlers as a separate `positionalAfter` array (used by `run` to forward
  arguments to the underlying script).
- `--flag value` MUST distinguish "value is missing" from "value is the
  next flag". The parser raises `MISSING_FLAG_VALUE` when the next token
  starts with `-` or is absent and the flag was declared as expecting a
  string.
- Unknown commands trigger a Levenshtein-based suggestion across the
  command list, including aliases.
- `INVALID_BOOLEAN_FLAG` is rewritten to include the offending flag name
  and the list of accepted values.
- `INSTALL_NO_TARGETS` is rewritten to include a one-paragraph help block
  inline (not just a hint to `--help`).
- The `doctor` GitHub check is split into separate hints for DNS,
  network, TLS, 4xx, and 5xx; the underlying `error.message` is
  preserved.
- `skillex sync --dry-run` accepts a new `--exit-code` flag (mirroring
  `git diff --exit-code`); when set, the command exits with code `1`
  whenever the dry-run would change at least one file.
- A small "did-you-mean" utility is added to `src/output.ts` for reuse.

## Impact

- Affected specs:
  - `cli` — schema-driven flag parsing, `--` support, missing-value
    detection, unknown-flag suggestions, unknown-command suggestions,
    improved boolean-flag error, dry-run exit-code flag, doctor error
    differentiation
- Affected code:
  - `src/cli.ts` — `parseArgs`, command dispatch, `parseBooleanFlag`,
    `handleSync`, `handleDoctor`, all command handlers (now receive a
    typed flag bag)
  - `src/output.ts` — new `suggestClosest(actual, candidates, threshold)`
    helper
  - `test/cli.test.ts` — full parser behavior coverage
