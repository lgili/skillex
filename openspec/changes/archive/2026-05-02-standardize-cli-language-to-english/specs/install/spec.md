## ADDED Requirements

### Requirement: English Direct-Install Messages

The direct-install code path in `src/install.ts` MUST emit its warnings, prompts, and cancellation messages in English. User cancellation MUST raise an `INSTALL_CANCELLED` error code that the CLI translates into a friendly exit (no `Failed to install skills:` prefix).

#### Scenario: Direct-install warning is in English

- **WHEN** the user runs `skillex install owner/repo/path@ref` without `--trust`
- **THEN** the printed warning text is in English and clearly explains the trust implication

#### Scenario: Direct-install cancellation produces a clean exit

- **WHEN** the user answers "n" to the trust prompt
- **THEN** the CLI prints an English cancellation notice
- **AND** the exit message does NOT contain the prefix `Failed to install skills:`
- **AND** the underlying error code is `INSTALL_CANCELLED`
