# Security Policy

## Supported Versions

Only the latest published version of Skillex receives security fixes.

| Version | Supported |
| ------- | --------- |
| 0.2.x   | ✅        |
| < 0.2   | ❌        |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

To report a vulnerability privately:

1. Go to the [Security Advisories](https://github.com/lgili/skillex/security/advisories) page.
2. Click **"Report a vulnerability"**.
3. Fill in the details: affected versions, steps to reproduce, potential impact, and any suggested mitigations.

You will receive a response within **5 business days**. If the vulnerability is confirmed, we will work with you on a coordinated disclosure timeline and credit you in the release notes.

## Scope

The following are considered in-scope:

- Remote code execution via skill content or catalog payloads
- Path traversal in skill file downloads (`assertSafeRelativePath` bypass)
- Credential leakage (e.g., `GITHUB_TOKEN` logged or written to disk unintentionally)
- Symlink attacks during skill installation

The following are **out of scope**:

- Vulnerabilities in skills published by third parties in the catalog
- Social engineering attacks
- Denial of service via GitHub API rate limiting (this is expected behaviour and mitigated by `GITHUB_TOKEN`)

## Security Considerations for Users

- **Skill content is executed or injected into your AI agent's context.** Only install skills from catalogs and authors you trust.
- Set `GITHUB_TOKEN` via environment variable rather than storing it in `~/.askillrc.json` when operating in shared environments.
- The `.agent-skills/.cache/` directory contains cached catalog data. It is excluded from version control by the auto-generated `.gitignore` but review your VCS configuration if you have concerns about leaking catalog metadata.
