# Issue 16 completion evidence

- Issue: [#16 — Implement contribution budget and lifecycle policy state machine](https://github.com/Collaboration95/rewind-v1/issues/16)
- Branch: `codex/16-contribution-policy`
- Implementation commit: [eec0016](https://github.com/Collaboration95/rewind-v1/commit/eec0016e880a99244fabd9c440b0a2829d9b09e3)

## Scope delivered

Added a framework-free contribution policy under `packages/domain/src/policy/`.
Capture validation enforces local membership, collecting-cycle state, photo
three-second duration, video 1–15-second duration, five active slots, and a
30-second per-member/cycle budget. Deleted contributions no longer consume
quota, allowing the one permitted retake.

Processing transitions are explicit (`captured → processing → locked`), with a
bounded single retry, failure state, idempotent duplicate starts/completions,
and no operation that creates a second locked contribution. Deletion requires
the contributing member, is blocked after reveal, and accepts a normalized
simulated-week key from the time adapter. Accepted delete audit metadata can be
rehydrated after relaunch; policy rejections always include a user-safe reason
and an audit event.

Pre-reveal summaries are sorted deterministic metadata views and omit local
URI, thumbnail, player-source, and other media locators.

## Verification

- `npm --prefix packages/domain test` — PASS (7 direct domain tests).
- `npm --prefix packages/domain run typecheck` — PASS.
- `make check` — PASS (workflow validation, formatting, lint, app/domain typechecks, 16 Node contract tests, and one Jest/RNTL smoke test).
- `npm --prefix apps/mobile run build:web` — PASS (Expo web export).
- `git diff --check` — PASS.

Relevant output:

```text
ℹ tests 7
ℹ pass 7
ℹ fail 0
```

The policy tests cover the 1-second and 15-second video boundaries, fixed
photo duration, fifth-slot and 30-second boundaries, membership and duplicate
rejections, quota restoration, same-week delete rejection without mutation,
retry exhaustion, idempotent lock behavior, audit-event rehydration, and
pre-reveal locator privacy.

## Device and product-decision limitations

This ticket is pure domain logic and intentionally adds no route or device
operation, so no simulator screenshot or camera/permission claim is made. The
week key is supplied by a future clock/time adapter rather than inferred here;
this keeps timezone and DST policy explicit for the simulation ticket. All test
data is synthetic and local-first.
