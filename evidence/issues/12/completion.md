# Issue #12 completion evidence

- Issue: https://github.com/Collaboration95/rewind-v1/issues/12
- Branch: `codex/12-visual-route-shell`
- Implementation commit: `5b3abb371cd52b625e4300fc7c21e9e2ef7c9871`

## Acceptance coverage

| Criterion | Evidence |
| --- | --- |
| Four tabs navigate without console errors | Home, Camera, Chat, and Archive route URLs rendered on the iPhone 15 Pro simulator through Expo Go. The warm Metro route loads emitted no application error markers. |
| Original dark nostalgic tokens with accessible text and non-colour cues | [`DESIGN.md`](../../../DESIGN.md), `apps/mobile/components/tokens.ts`, shared primitives, and the visible active registration line in each tab capture. |
| Accessible labels and stable test IDs | `Home tab`, `Camera tab`, `Chat tab`, and `Archive tab` labels plus `tab-home`, `tab-camera`, `tab-chat`, and `tab-archive` are covered by `apps/mobile/tests/routes.test.mjs`. Expo Router supplies the selected state on its tab buttons. |
| No copied branding, assets, or source | Original View-based geometric glyphs only; the route contract test and strict frontend audit found no copied runtime references or unapproved assets. |

## Checks

| Command | Result |
| --- | --- |
| `make check` | PASS — workflow YAML, format check, ESLint, TypeScript, and 6 contract tests |
| `npm run test -- --runInBand` from `apps/mobile` | PASS — 6 tests |
| `npx expo export --platform all --output-dir /tmp/rewind-v1-issue-12-export` from `apps/mobile` | PASS — web, iOS, and Android bundles |
| `npx -p @google/design.md designmd lint DESIGN.md` | PASS — 0 errors, 0 warnings, 1 informational summary |
| `python /Users/speedpowermac/.codex/plugins/cache/openai-curated-remote/frontend-design-premium/1.4.0/skills/frontend-design-premium/scripts/audit_project.py . --mode strict --output evidence/issues/12/premium-audit.json` | PASS — 0 violations, 0 warnings |
| `git diff --check` | PASS |

## Device evidence

- Device: iPhone 15 Pro simulator, iOS 17.5, Expo Go 57.0.9.
- Dev command: `make ios`; Metro served the project on port 8082 because port 8081 was occupied.
- Route captures: [`home-tab-shell.png`](home-tab-shell.png), [`camera-tab-shell.png`](camera-tab-shell.png), [`chat-tab-shell.png`](chat-tab-shell.png), and [`archive-tab-shell.png`](archive-tab-shell.png).
- Each capture is a synthetic 1179×2556 emulator screenshot and shows the matching selected tab, visible label, and active registration line.

## Limitations

- The host Mac was locked, so Computer Use could not perform direct tab taps or inspect the runtime accessibility tree. Route navigation was exercised through Expo deep links, and the static contract covers labels, test IDs, and selected-state ownership.
- Android SDK/ADB is not installed on this host, so there is no Android simulator capture. Cross-platform JavaScript bundling passed for Android.
- The iPhone SE (3rd generation) simulator was booted but does not have Expo Go installed, so compact-width runtime capture was unavailable. The shared header uses wrapping/shrink rules and all content scrolls naturally for compact layouts.

No private recordings, personal media, credentials, or build output were added.
