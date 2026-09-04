# P3 — Finder metadata prevents a clean macOS worktree

**Tracking issue:** [#64](https://github.com/Collaboration95/rewind-v1/issues/64)

The pre-audit worktree reported untracked `.DS_Store` files at the repository
root and in `.github`, `apps`, `evidence`, `packages`, and `planning`. The
mobile subdirectory ignores this file, but no root ignore rule covers the rest
of the workspace.

Add a repository-level ignore rule and remove only those local OS artifacts.
Do not use the change to hide generated source, evidence, or other meaningful
files.
