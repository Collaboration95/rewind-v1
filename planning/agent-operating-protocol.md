# Incremental local-agent programme

This is the longer operating playbook behind the concise root
[`AGENTS.md`](../AGENTS.md). It is the contract for an agent asked to “take the
next Rewind ticket”.

## The loop

```text
GitHub Project + issue + Git history
             │
             ▼
        select one Ready ticket
             │
             ▼
  inspect baseline → branch → start comment/status
             │
             ▼
  implement smallest vertical slice + tests + device proof
             │
             ▼
  commit → evidence files → PR → issue completion comment → Review
```

The loop is intentionally serial per agent. An agent must not “front-run” a
later ticket whose dependency is unmerged: apparent speed creates integration
work and destroys the meaningful Git history this workspace is meant to teach.

## Start-of-work query

From the repository root, inspect the local and remote baseline before choosing
work. Commands may be adapted to the current tooling, but the evidence intent
may not be skipped.

```bash
git status --short
git log --oneline -12
gh issue list --repo Collaboration95/rewind-v1 --state open --limit 100
gh project item-list <project-number> --owner Collaboration95 --limit 100
```

Read the selected issue in full and then its parent epic, linked decisions, and
its listed prerequisite issues. A ticket is selectable only if its Project
status is `Ready`. If the Project has no Ready work, comment on the most useful
blocked issue with the exact missing condition and stop.

## Ticket execution checklist

1. State the acceptance criteria in the issue start comment and name the
   expected files. Set the Project item to `In progress`.
2. Create `codex/<issue-number>-<slug>` and retain unrelated user changes.
3. Work within the issue's explicit in/out-of-scope boundary. If a requirement
   needs another decision, open no replacement ticket—add an escalation comment
   and leave it blocked.
4. Add or update policy/component tests with the implementation. Add stable
   `testID` and accessibility labels to new interactive UI.
5. For visual/device work, test an Android emulator or iOS simulator as well as
   the real device capability named by the ticket. Do not claim a simulator
   mock proves camera, microphone, notification, haptic, or share-sheet
   behaviour.
6. Keep screenshots in `evidence/issues/<issue-number>/`. Use only synthetic
   names and clips. Capture before/after evidence where it proves an error path.
7. Run the requested checks. Report an unavailable tool/device as an explicit
   limitation rather than replacing it with a no-op.
8. Make focused conventional commits. Push and create one PR. Do not merge,
   close, or self-approve without human authorization.

## Required completion comment

Post this compact Markdown structure to the GitHub issue after pushing:

```md
## Completion evidence

- Commit: <full GitHub commit URL>
- PR: <PR URL or `not opened: <reason>`>
- Scope delivered: <one paragraph mapped to acceptance criteria>
- Verification:
  - `<command>` — PASS
  - `<manual/device path>` — PASS on <device/emulator and OS>
- Evidence: [completion note](<GitHub blob URL>)
  ![Key state](<GitHub raw/blob screenshot URL>)
- Limitations/follow-up: <none, or precise remaining boundary>
```

The completion note in the repository must use the same facts. Move the item to
`Review`; leave the issue open. A maintainer makes the review/merge/Done
transition so the project board retains an honest audit trail.

## Status meanings

| Status | Who may set it | Meaning |
| --- | --- | --- |
| Backlog | planner/maintainer | Specified work with unmet prerequisites or not yet selected. |
| Ready | planner/maintainer | Dependency-free, bounded, and verifiable; an agent may select it. |
| In progress | executing agent | One agent has declared an active branch and acceptance focus. |
| Review | executing agent/maintainer | Code/evidence exist and await review; not automatically complete. |
| Blocked | any agent | A concrete dependency, decision, permission, or device condition prevents safe progress. |
| Done | maintainer | Reviewed/merged and evidence is accepted. |

## Handoff prompts

Use a focused prompt such as: “Read `AGENTS.md`, select the highest-priority
dependency-free **Ready** issue in GitHub Project *Rewind V1 — local prototype*,
implement only that issue, run its verification, commit, add synthetic evidence
under `evidence/issues/<number>/`, and post the completion template without
closing the issue.”

Never tell an agent simply to “build Rewind” or “finish all tickets”; that
removes the bounded review and learning cycle.
