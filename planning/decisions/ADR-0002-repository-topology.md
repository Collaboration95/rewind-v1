# ADR-0002: Use a multi-layer product workspace from the first commit

**Status:** Accepted  
**Date:** 2026-08-29

## Context

Rewind will eventually include a mobile app, pure product rules, documentation,
evidence, automation, and Terraform. A root-level Expo-only layout would make
future expansion and agent orientation needlessly expensive.

## Decision

Keep this top-level topology:

- `apps/` for runnable products;
- `packages/` for reusable domain/UI code;
- `planning/` for source material, scope, research, decisions, and backlog map;
- `docs/` for implementation-facing documentation;
- `evidence/` for committed issue proof; and
- `infra/terraform/` for a later, intentionally empty IaC boundary.

The root README links only one layer down. Each directory owns a concise README
that explains its immediate contents. `AGENTS.md` defines the cross-cutting
contract and GitHub is the live issue queue.

## Consequences

- The first Expo ticket must scaffold `apps/mobile`, not generate into root.
- Pure domain policies must not depend on Expo/React Native.
- Infrastructure cannot casually leak into application code or source control.
- More folders are visible early, but every one has an explicit responsibility
  and placeholder README to avoid ambiguity.
