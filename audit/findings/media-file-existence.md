# P1 — Missing local media can be submitted and locked

**Tracking issue:** [#67](https://github.com/Collaboration95/rewind-v1/issues/67)

`LocalContributionReviewStore.startProcessing` validates policy with a stored
URI but never calls its injected `LocalMediaFilePort.exists`; the `load` view
also derives `fileStatus` solely from whether the URI string is non-empty. The
pure policy intentionally checks only URI presence because it cannot depend on
a device API. Consequently, an app-managed file removed after capture can be
shown as stored and locked, consuming quota even though no playable file
remains.

Evidence: `apps/mobile/features/capture/local-contribution-review-store.ts`
lines 223–234, 258–302, and 398–409; compare the capture-time existence check
in `apps/mobile/features/capture/local-media-capture-store.ts` lines 92–105.

Remediation belongs in the review application layer, with deterministic
photo/video tests for missing and unreadable files. Do not move the file-system
check into the pure domain package or expose a URI in pre-reveal UI.
