# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in CodeGraph, please report it responsibly.

**Please do NOT open a public GitHub issue for security vulnerabilities.**

### Preferred: GitHub Private Vulnerability Reporting

Use [GitHub's private vulnerability reporting](https://github.com/idosams/know-know/security/advisories/new) to submit your report. This ensures the issue is handled confidentially.

### Alternative: Email

If you prefer email, contact the maintainers directly. You can find contact information in the repository's GitHub profile.

## Response Timeline

| Step | Timeline |
|------|----------|
| Acknowledgment | Within 48 hours |
| Initial assessment | Within 1 week |
| Fix or mitigation | Within 30 days |

## Scope

Security issues we are particularly interested in:

- **SQL injection** in the SQLite query engine
- **Path traversal** in file parsing and indexing
- **YAML parsing safety** (prototype pollution, code execution)
- **Denial of service** via malformed annotations or large inputs
- **Information disclosure** through error messages or query results

## Out of Scope

- Issues in dependencies (report these upstream)
- Issues requiring physical access to the machine
- Social engineering attacks

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.2.x   | Yes       |
| 0.1.x   | Yes       |

## Recognition

We appreciate the security research community's efforts in helping keep CodeGraph safe. Contributors who responsibly disclose vulnerabilities will be acknowledged in our CHANGELOG (unless they prefer to remain anonymous).
