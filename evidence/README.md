# Evidence

Ticket completion proof is committed under `issues/<issue-number>/`. Each
folder contains a concise `completion.md` and the smallest set of artifacts
needed to prove the ticket. Use one or more screenshots for observable UI
states; use a short recording only when a static screenshot cannot prove the
interaction or device capability.

## Required completion note

`completion.md` records the issue URL, commit SHA, exact commands and outcomes,
device or emulator details when applicable, evidence links, and residual
limitations. A passing test command is evidence of the tested contract only;
it is not a claim that an unavailable physical device capability was verified.

Screenshots should use descriptive state names such as
`home-local-only.png`, `permission-denied.png`, or `archive-revealed.png`.
Link committed screenshots from the completion note with stable GitHub blob or
raw URLs when the issue comment is posted.

## Synthetic-only privacy boundary

Evidence may use only synthetic fixtures, seeded demo names, and non-sensitive
test content. Never commit personal recordings, photos, faces, voices, contact
details, device identifiers, credentials, private URLs, build output, or
production data. Do not use a real user's media to make a test or screenshot
look more convincing. Redact any identifier that is not synthetic before
committing an image or recording.

Evidence must remain local-first: no cloud upload, remote storage, analytics,
remote authentication, or production push service is an acceptable substitute
for a local test. If a real device or permission is unavailable, record the
exact limitation in `completion.md` and the issue rather than faking success.

See [`../AGENTS.md`](../AGENTS.md) for the mandatory completion protocol.
