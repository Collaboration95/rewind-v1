---
version: alpha
name: "Rewind V1"
description: "A camera-first local time capsule composed like a darkroom contact sheet."
colors:
  primary: "#D7F45B"
  ink: "#0B1114"
  surface: "#121A1D"
  line: "#29373B"
  paper: "#F4EFE6"
  muted: "#A6B0AC"
  acid: "#D7F45B"
  flash: "#FF7A4D"
  focus: "#F4EFE6"
typography:
  display:
    fontFamily: "System, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "48px"
    lineHeight: "49px"
  title:
    fontFamily: "System, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "30px"
    lineHeight: "34px"
  body:
    fontFamily: "System, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "17px"
    lineHeight: "25px"
  utility:
    fontFamily: "System, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "11px"
    lineHeight: "14px"
rounded:
  DEFAULT: "0px"
  control: "6px"
  pill: "999px"
spacing:
  hairline: "1px"
  micro: "6px"
  compact: "10px"
  control: "14px"
  inset: "16px"
  screen: "24px"
  section: "32px"
  hero: "48px"
components:
  screen:
    backgroundColor: "{colors.ink}"
    padding: "{spacing.screen}"
  tabBar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.paper}"
    padding: "{spacing.inset}"
  frameCard:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.paper}"
    rounded: "{rounded.DEFAULT}"
  tabGlyph:
    textColor: "{colors.muted}"
    size: "22px"
  tabGlyph-active:
    textColor: "{colors.acid}"
    height: "{spacing.compact}"
  frame-separator:
    backgroundColor: "{colors.line}"
    height: "{spacing.hairline}"
  capture-accent:
    backgroundColor: "{colors.flash}"
    textColor: "{colors.ink}"
  focus-ring:
    textColor: "{colors.focus}"
---

# Rewind V1 Design System

## Overview

### Creative North Star

Rewind is a darkroom contact sheet for a private week: charcoal stock, warm
paper labels, a lime registration mark, and one coral flash of capture. Each
screen should feel like another frame from the same small reel, not a separate
app surface. The reference is a physical contact sheet pinned under a dim
enlarger, not a social-media feed or a camera-filter catalogue.

### Product context and register

- **Audience and primary job:** A small group of friends uses one local device
  prototype to understand the future ritual of capturing a moment now and
  holding it for a later reveal.
- **Target market(s) and evidence:** V1 is a local learning prototype with no
  market claim. The product brief and V1 prototype specification define the
  private group time-capsule workflow.
- **Locale(s) and language policy:** English-only synthetic copy for V1. Keep
  labels short, concrete, and compatible with later Dynamic Type expansion.
- **Usage scene:** A portrait phone held casually, often one-handed, with quick
  glances between capture moments. Content must remain legible in dark indoor
  conditions and at compact widths.
- **Register:** Product-first with a restrained brand signature. Navigation and
  labels should be immediately familiar; the contact-sheet frame treatment is
  the expressive layer.
- **Memorable signature:** A geometric frame mark repeats in the tab glyphs and
  in the active tab's thin lime registration line.
- **Restraint:** Keep the route shell quiet: no gradients, ornamental noise,
  decorative cards, or animation that competes with capture and reveal states.
- **Anti-references:** Do not resemble Instagram, Dazz Cam, Lapse, 1SE, a
  generic neon dashboard, or a VHS-themed template. Rewind's distinction is
  delayed private group memory, not a copied feed or a large filter library.
- **Token ownership/runtime mapping:** Model B applies for this React Native
  prototype: `apps/mobile/components/tokens.ts` is the runtime token owner;
  this file mirrors the accepted values and rationale. Shared route components
  consume the runtime tokens, and future token changes must update both files
  in the same changeset.

## Colors

`ink` is the full-screen background and `surface` is the single raised tonal
layer. `line` supplies hairline separation without introducing card clutter.
`paper` is the primary text color and `muted` is reserved for supporting copy;
both are tested against `ink` rather than relying on opacity. `acid` marks
active navigation and local status, while `flash` identifies capture energy and
never carries the only meaning of a state. `focus` uses paper so focus remains
visible even when the active accent is already present. There is one dark theme
in V1; semantic roles must remain recognizable if a light/high-contrast adapter
is added later.

## Typography

The runtime uses the platform system sans stack so the prototype has no
unlicensed font dependency and remains legible on iOS and Android. `display`
is an oversized, heavy headline used only for the Home thesis. `title` names a
route or a state. `body` carries explanations at a comfortable mobile measure.
`utility` handles compact all-caps labels, tab labels, and status marks with
tracking. Do not use italic as a substitute for hierarchy. If another script is
added, preserve the system fallback and increase line height rather than
shrinking text to fit.

## Layout

Portrait screens use a 24px horizontal inset, a top safe area, and a stable
bottom tab rail with visible labels. Shared route content scrolls naturally;
the tab rail owns its bottom safe-area padding. The rhythm is intentionally
asymmetric: a 48px hero gap gives the Home thesis breathing room, while 6–16px
insets keep route metadata compact. A screen can be sparse, but every tab must
retain the same header/status vocabulary and frame the current state with text.

## Elevation & Depth

Hierarchy comes from tonal contrast and 1px `line` rules, not drop shadows or
blur. `surface` is reserved for a frame card or the tab rail. Static content
should sit flat on `ink`; the only depth cue is a surface change plus a border.

## Shapes

Frame cards are square (`DEFAULT: 0px`) to echo paper edges. Interactive
controls may use the small 6px control radius to clarify touch affordances; a
pill is reserved for compact status marks. Tab glyphs are hand-built geometric
strokes with a consistent 22px box, so Rewind owns an original icon language
without importing a reference application's assets.

## Components

### Foundational visual states

Shared screens use `ink` at rest, `surface` for framed information, and `line`
for separation. Tabs expose an active lime registration line, a paper label,
and a geometric glyph; inactive tabs use muted text and stroke. Pressed states
use the platform press feedback without changing layout. Labels and glyph shape
both communicate selection, so color is never the only state cue. Disabled,
busy, error, and success treatments belong to later feature components and
must keep this same semantic palette.

### Buttons and actions

The route shell has no product action buttons yet. Future primary actions should
use acid on ink/surface with a paper label and a visible pressed/focus state;
capture actions may use flash when the action is specifically recording. A
destructive action must be explicit in text and visually separated from the
primary capture path.

### Navigation and data display

The four-tab shell is the canonical navigation owner: Home, Camera, Chat, and
Archive. Every tab has a visible text label, a stable testID, and an accessible
label. The current route stays selected after switching tabs. Settings and the
simulation console remain secondary routes and are not added to the bottom rail.

### Forms and overlays

No forms or overlays ship in this shell. Later fields, dialogs, and toasts must
use shared primitives and the product's local-only error/recovery vocabulary;
they must not introduce screen-specific token values.

### Iconography

Tab icons are original geometric frame marks rendered from React Native `View`
strokes: a notched frame for Home, a lens ring for Camera, a speech frame for
Chat, and stacked frames for Archive. They are decorative companions to text,
never a replacement for accessible labels.

### Motion

The shell uses no custom route animation. Native tab press feedback is enough
for the current static slice. Future reveal/capture transitions may animate a
state change, but must remain interruptible, short, and disabled or reduced
when the platform requests reduced motion.

### Content and data visualization

Copy is plain, short, and grounded in the user's ritual: “capture,” “hold,”
“reveal,” and “local.” Avoid cloud, follower, feed, or security-certification
claims. Later quantities should use text labels alongside any color or glyph;
the shell contains no charts.

## Do's and Don'ts

- **Do:** Treat every route as a frame from the same private weekly reel.
- **Do:** Pair every visual state cue with a label or geometric difference.
- **Don't:** Copy another app's tab icons, camera controls, words, assets, or
  filter treatment.
- **Don't:** Add gradients, shadows, decorative noise, or extra navigation
  chrome unless a later product state earns it.
