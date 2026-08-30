# Issue 17 completion evidence

- Issue: [#17 — Add deterministic simulation clock and local capsule assembler](https://github.com/Collaboration95/rewind-v1/issues/17)
- Branch: `codex/17-simulation-clock-playlist`
- Implementation commit: [e885f04](https://github.com/Collaboration95/rewind-v1/commit/e885f04ecf1992abda4aa4e0ee7e157709efcf5e)

## Scope delivered

Added a framework-free simulation clock with deterministic minute, day, and
four-week-equivalent steps. It advances an injected ISO instant without
sleeping or reading wall time; `real` mode remains unchanged for the simulation
command because a device clock adapter owns that behavior.

Added explicit cycle transitions:

```text
collecting → reveal_pending → premiere → archived
                    │
                    └──────→ delayed → premiere
```

Collection cannot close before its end instant. Premiere requires all active
contributions to be locked, revealed, or already archived; failed processing
must take the delayed path and recover before premiere. Repeated transitions
are idempotent and transition failures carry safe reasons plus audit events.

The capsule assembler is reveal-gated and returns a value explicitly marked
`local-playlist` containing only deterministically capture-time-ordered
contribution IDs. It does not expose media URIs, generate a combined media
file, or choose an unresolved low-contribution filler policy.

## Verification

- `npm --prefix packages/domain test` — PASS (11 direct domain tests).
- `npm --prefix packages/domain run typecheck` — PASS.
- `make check` — PASS (workflow validation, formatting, lint, app/domain typechecks, 20 Node contract tests, and one Jest/RNTL smoke test).
- `npm --prefix apps/mobile run build:web` — PASS (Expo web export).
- `git diff --check` — PASS.

Relevant output:

```text
ℹ tests 11
ℹ pass 11
```

The deterministic test suite covers minute/day/four-week advancement, repeated
steps, invalid negative steps, collection-end gating, all cycle statuses,
delayed processing failure and recovery, deterministic tie ordering, filtering
of ineligible/unrelated contributions, and pre-reveal gating.

## Device and product-decision limitations

This ticket is pure domain logic and intentionally adds no simulation route or
device operation, so no simulator screenshot or native-clock claim is made.
The real-mode clock behavior and timezone/DST week-key normalization remain
owned by future adapters; no wall-clock sleeps, network service, cloud media, or
personal data were used.
