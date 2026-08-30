# ADR-0003: Keep photo/video contributions local with metadata-only vignettes

**Status:** Accepted  
**Date:** 2026-08-30  
**Issue:** [#45](https://github.com/Collaboration95/rewind-v1/issues/45)

## Context

The original V1 specification described video capture while later local feature
planning introduced still-image capture and vignette treatments. Without one
shared contract, quota accounting, domain state, archive ordering, and the
pre-reveal privacy gate could diverge between photo and video paths.

## Decision

V1 treats photos and videos as local contributions with a shared lifecycle:

- `mediaKind` is `photo` or `video`; either kind consumes one of five weekly
  contribution slots.
- Videos use their measured 1–15 second duration. Photos use a fixed three
  second display duration for quota accounting and deterministic playlist
  ordering. This is display metadata, not generated video.
- `vignetteTreatment` is one of `flash`, `ccd`, `home-movie`, or `tape`. The
  treatment is an original preview/frame-overlay selection stored as metadata;
  V1 does not edit pixels, transcode, filter, or normalize audio.
- Camera still capture is allowed; gallery import, image editing, public export,
  cloud sync/storage, and personal media remain out of scope.
- Accepted files may move from cache to app-managed local storage. Until reveal,
  normal UI may show only safe aggregate metadata and status; it must not expose
  a URI, thumbnail, image, player, or share action.

Both kinds follow `captured → processing → locked → revealed → archived`, with
the existing bounded failure/retry and one-delete policy.

## Consequences

- Domain policy can validate one duration/quota contract for both media kinds
  without importing Expo or a storage implementation.
- SQLite and capture adapters can persist the media kind, fixed/measured
  duration, treatment metadata, and local URI without storing media blobs.
- Archive can order local contributions consistently without pretending to
  render a compiled film.
- Device work must provide separate permission/file evidence for photo and video
  capture, while tests can use synthetic fixtures without camera access.

This decision amends the V1 scope where it previously listed image posts as out
of scope; source-material copies remain immutable. The authoritative scope is
[`v1-prototype-spec.md`](../v1-prototype-spec.md).
