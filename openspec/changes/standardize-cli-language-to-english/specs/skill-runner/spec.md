## ADDED Requirements

### Requirement: English Skill-Runner Errors

The `skillex run` command MUST emit every error, prompt, and confirmation message in English, with each error including the suggested remedy flag (`--yes`, `--timeout`, etc.) inline.

#### Scenario: Invalid script id is in English

- **WHEN** the user runs `skillex run` without the `skill-id:command` format
- **THEN** the error message is in English and shows the expected format

#### Scenario: Non-TTY without --yes

- **WHEN** the user runs `skillex run x:cmd` from a non-TTY environment without `--yes`
- **THEN** the error message is in English and explicitly mentions `--yes` as the bypass flag
