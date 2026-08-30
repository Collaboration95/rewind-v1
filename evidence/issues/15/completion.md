# Issue 15 completion evidence

- Issue: [#15 — Implement SQLite migrations, seed fixtures, and resettable local repository](https://github.com/Collaboration95/rewind-v1/issues/15)
- Branch: `codex/15-local-sqlite-seed-repository`
- Implementation commit: [ebb0ef1](https://github.com/Collaboration95/rewind-v1/commit/ebb0ef14e71d094e3852e73748964354eef91863)

## Scope delivered

Added a versioned Expo SQLite schema and migration runner, a deterministic
five-member `The Sunday Room` seed, an atomic reset-to-seed command, and a
SQLite-backed adapter implementing the framework-free domain repository ports.
The adapter persists group/profile/cycle/contribution/chat/reaction/capsule,
reminder, and audit metadata. Contribution rows contain only local media URIs;
the schema has no media blobs, cloud credentials, or remote media locators.

The mobile Metro config explicitly resolves only `packages/domain/`, which lets
the app reuse the shared fixture without turning the repository root into an
Expo workspace. Repository updates use conflict clauses rather than replace
operations, so updating a cycle or message cannot cascade-delete related rows.

## Verification

- `make check` — PASS (workflow YAML validation, Prettier, ESLint, app and domain TypeScript checks, 12 Node contract tests, and one Jest/RNTL smoke test).
- `npm run test:database` from `apps/mobile/` — PASS (two real SQLite tests).
- `npm run build:web` from `apps/mobile/` — PASS (Expo web export).
- Temporary Metro resolution probe — PASS: importing the shared domain fixture from a route bundled successfully; the probe import was removed before the implementation commit.
- `git diff --check` — PASS.

The SQLite test uses a temporary on-disk database, verifies schema version and
foreign-key enforcement, seeds exact table counts, closes and reopens the same
file, confirms local records survive relaunch, and verifies that the atomic
reset restores the deterministic seed.

Relevant output:

```text
✔ migrations, seed, repository reads, relaunch, and reset use real SQLite
✔ schema has no blob, credential, or remote-media columns
ℹ tests 2
ℹ pass 2
ℹ fail 0
```

## Device and privacy limitations

This ticket is a data-layer slice and does not add a visible route consumer, so
no simulator screenshot or device persistence claim is made. The on-disk SQLite
verification uses only synthetic names and `file:///synthetic/` URIs. A later
profile/capture route will exercise the Expo adapter on a simulator or supported
device; no personal media, network service, cloud credential, or build output
was used.
