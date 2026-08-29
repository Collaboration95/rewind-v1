# Rewind coding-agent operating contract

This repository is a product workspace, not a single mobile-app directory. Read
[`planning/README.md`](planning/README.md) and the active GitHub issue before
changing any file.

## Mission and boundaries

- Build the smallest independently verifiable slice of the active GitHub issue.
- Treat the GitHub Project, issue acceptance criteria, and Git history as the
  current execution truth. Planning documents explain intent; they do not
  override a more recent approved issue comment or decision record.
- V1 is local-first: no cloud SDKs, remote auth, remote database, object store,
  analytics, or production push service unless an explicitly approved later
  issue changes that boundary.
- Use original visual treatments only. "Instagram-like" means familiar feed and
  tab interaction patterns, never copied assets, UI, text, or source code.
- Do not add secrets, private recordings, personal data, build output, or
  credential files to Git.

## Mandatory start-of-ticket procedure

1. Read the root README, relevant `planning/` documents, and every acceptance
   criterion in the selected issue.
2. Run `git status --short`, `git log --oneline -12`, and inspect the current
   GitHub Project/issue state. Resolve any dirty-file overlap before editing.
3. Select exactly one issue in **Ready**. Never begin a Backlog, Blocked,
   Review, or Done issue. If no issue is Ready, report that condition rather
   than inventing work.
4. Re-check dependencies in the issue body. Stop if a required issue is not
   Done or if the ticket is missing a credible verification path.
5. Create a short-lived branch named `codex/<issue-number>-<slug>` unless the
   human owner explicitly directs work on another branch.
6. Post a brief start comment on the issue: branch, intended files, and
   acceptance criteria being exercised. Move the project item to **In progress**.

## Implementation rules

- Keep one issue, one coherent change set, and one reviewable pull request.
- Preserve the repository topology: applications live in `apps/`, reusable
  code in `packages/`, docs/ADRs in `planning/` or `docs/`, infrastructure in
  `infra/`, and proof in `evidence/`.
- Put product policy/state transitions in the domain boundary, not in screens.
  UI and device APIs must depend on interfaces/ports so V1 local adapters can
  later be replaced by cloud adapters.
- Make behaviour observable. Add stable `testID` and accessibility labels to
  every interactive control needed by a test or evidence flow.
- Do not silently downgrade an acceptance criterion. If a phone capability is
  unavailable on the active device/emulator, capture the failure and escalate
  in the issue instead of faking success.
- Do not change package versions opportunistically. Use `npx expo install` for
  Expo-native packages and document any intentional compatibility choice.

## Verification and evidence

Run the issue's requested checks plus every relevant existing baseline command.
Once the app exists, the normal minimum is:

```text
npm run lint
npm run typecheck
npm run test -- --runInBand
```

Run a device/emulator flow for UI or device-capability tickets. Store evidence
under `evidence/issues/<issue-number>/`:

- `completion.md` — issue URL, commit SHA, commands/results, device or emulator,
  and any limitation;
- one or more screenshots named for the observable state; and
- a short screen recording only when a static screenshot cannot prove the flow.

Never commit user/private media. Use the fixture or synthetic recording named in
the active issue. Screenshots must redact identifiers that are not synthetic.

## Completion protocol

1. Re-read all acceptance criteria and verify them against the final tree.
2. Commit focused changes using the repository's conventional-commit format.
3. Push the branch and open a PR referencing `Closes #<issue-number>` only when
   the issue is genuinely review-ready.
4. Comment on the issue with: summary, commit/PR URL, commands and outcomes,
   evidence links, and residual limitations. Embed the committed screenshot via
   a stable GitHub raw/blob URL when GitHub rendering permits it; otherwise link
   the evidence directory.
5. Move the project item to **Review**. Do not close the issue, merge the PR,
   or mark it Done unless the human owner explicitly authorizes that action.

## Stop and escalate

Stop and add a concise issue comment when requirements conflict, a dependency is
incomplete, a product/privacy decision is needed, device permissions fail for
an environment-specific reason, a security concern appears, or the work expands
beyond one focused ticket. Include the exact command/error or screenshot and a
recommended next decision.
