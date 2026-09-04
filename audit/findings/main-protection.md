# P2 — Main can bypass the required quality workflow

**Tracking issue:** [#65](https://github.com/Collaboration95/rewind-v1/issues/65)

The `Mobile quality` workflow successfully runs locked install, formatting,
lint, type checking, tests, and web export. However, the GitHub branch
protection endpoint for `main` returned `404 Branch not protected`. This permits
direct changes or merges without the repository's intended quality gate.

Add an appropriate ruleset/branch-protection rule requiring the existing
`Mobile static checks` job and preventing force pushes/deletion. Preserve a
documented owner/admin exception only where necessary.
