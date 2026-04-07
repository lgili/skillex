## ADDED Requirements

### Requirement: LICENSE File Present
The repository SHALL contain a `LICENSE` file at the root with the full text of the MIT license, satisfying the legal requirements of npm publication, corporate open-source consumption, and automated compliance tooling.

#### Scenario: LICENSE file exists at repo root
- **WHEN** the repository root is inspected
- **THEN** a file named `LICENSE` exists with MIT license text and the project author name

#### Scenario: package.json license field matches LICENSE file
- **WHEN** `package.json` `"license": "MIT"` is compared to the `LICENSE` file
- **THEN** both declare the same license type

### Requirement: CHANGELOG Maintained
The repository SHALL contain a `CHANGELOG.md` file following the Keep a Changelog format, with an entry for every published npm version documenting what changed.

#### Scenario: CHANGELOG contains entry for current version
- **WHEN** `CHANGELOG.md` is read
- **THEN** it contains a section header matching the current `package.json` version
- **AND** that section lists the changes introduced in that release

### Requirement: .npmignore Excludes Development Files
A `.npmignore` file SHALL be present to exclude development-only directories and files from the published npm artifact, keeping the package tarball minimal.

#### Scenario: Published package excludes dev directories
- **WHEN** `npm pack --dry-run` is executed
- **THEN** no files from `test/`, `openspec/`, `skills/`, or `.github/` appear in the output
- **AND** no `*.test.ts` or `.test-dist/` files appear in the output

#### Scenario: Published package contains expected files
- **WHEN** `npm pack --dry-run` is executed
- **THEN** the listed files include `dist/`, `bin/`, `README.md`, `LICENSE`, `CHANGELOG.md`, and `package.json`

### Requirement: CONTRIBUTING Guide Present
The repository SHALL contain a `CONTRIBUTING.md` file at the root with guidelines for opening issues, submitting pull requests, and setting up a local development environment.

#### Scenario: CONTRIBUTING guide is discoverable
- **WHEN** a contributor visits the GitHub repository root
- **THEN** `CONTRIBUTING.md` is present and linked from the repository's contribution guidelines

### Requirement: SECURITY Policy Present
The repository SHALL contain a `SECURITY.md` file with a clear process for privately reporting security vulnerabilities, meeting GitHub's security policy requirements.

#### Scenario: Security policy is discoverable
- **WHEN** a security researcher visits the GitHub repository
- **THEN** `SECURITY.md` is present and describes a contact method or process for responsible disclosure
