# ADR-0001: Begin with a cloud-free local prototype

**Status:** Accepted  
**Date:** 2026-08-29

## Context

The selected Rewind proposal includes OIDC, private object storage, a worker,
notifications, and Terraform. The owner wants to rebuild React Native and cloud
fluency through fast, agent-driven incremental work, starting with genuine phone
operations rather than a prematurely deployed backend.

## Decision

V1 is a local-first Expo prototype. It stores synthetic profiles, group state,
metadata, chat, policy events, and reminder preferences on the device, persists
accepted videos in the application document directory, and uses only local
notifications. It simulates remote processing, multi-member behaviour, and
scheduled reveal through explicit local adapters and a developer clock.

All feature code depends on ports/interfaces so a later milestone can replace
the local repository and capability adapters. V1 does not import or configure
cloud services.

## Consequences

- Device permissions, recording, file persistence, playback, local reminder,
  and share-sheet learning happen immediately and without credentials/cost.
- The group workflow is demonstrable but only on one device; it must never be
  described as authenticated, synchronized, encrypted, or production-private.
- A V1 capsule is an ordered local playlist, not a merged server-produced film.
- Future cloud work remains visible in the repository and GitHub backlog, but
  stays Blocked until the local definition of done passes.

See [`../v1-prototype-spec.md`](../v1-prototype-spec.md) for exact scope.
