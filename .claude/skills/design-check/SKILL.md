---
name: design-check
description: Use before building or changing any UI in apps/web or packages/ui (a new screen, block, sheet, list, button row, card) and again before showing the result to the owner — checks the design against the owner's approved and rejected patterns in docs/design/patterns.md. Also use when the owner rejects or praises a design, to record it.
---

# Design check

The owner spends a lot of time explaining what not to do. This skill makes sure every rule they already gave is applied without being asked again.

## Before writing UI

1. Read `docs/design/README.md` (philosophy, which rule wins) and `docs/design/patterns.md` in full.
2. For each part you are about to build, name the existing component it will use (`@awaisa/ui/*`, `shared/ui/*`, entity UI). Create local markup only if nothing fits, and say why.
3. If the request is about size or space, plan spacing changes only, and ask before redesigning a component.

## Before showing the result

Take screenshots (phone 375px and desktop; dark theme too if colours changed) and go through this checklist. Fix every «no» before showing.

- [ ] Looks like it belongs with `docs/design/references/good/`, not with `references/bad/`.
- [ ] Nothing duplicates an existing component with local markup (the worst offence).
- [ ] Harmony: neighbours share height, radius, fill shade and type size; all rows in a group are the same height. Measure it (`getBoundingClientRect` in the browser), never judge by eye.
- [ ] Edges: left and right edges of stacked blocks line up; centred things sit on the column's axis. Measure it.
- [ ] Order: one left edge (or strict centre), even gaps on the 4px grid, no floating islands; related rows are one inset group.
- [ ] No backgrounds or cards around a lone text or a lone control.
- [ ] No layout defects: no wrapped button labels, no clipped captions, equal segments, nothing drawn for zero values.
- [ ] Pixel perfect, measured: the right edges of figures in lists line up with the blocks around; a row's hover fill spills evenly on both sides and is not cut by a scroll box; one line between rows (no meter track beside a hairline); no page scroll sideways at 375px (`scrollWidth === clientWidth`).
- [ ] A long list in a group is `ScrollArea` (its own height from its rows, «Ещё N ⌄» on the fade; scrolls inside only with a mouse, opens in place on phones), never a box that scrolls a few pixels, catches the wheel or scrolls inside on a phone.
- [ ] On phones a section's tools (period switch, glyphs) float in a `FloatingToolbar` at the window's foot; the section's header is one line.
- [ ] Charts, sparklines and data maps can be explored (pointer, tap, arrows) and read out in place, not a native `title` tooltip; a focus ring shows only for the keyboard (`:focus-visible`), never after a click.
- [ ] There is a way back to where the person came from, through the shared pattern (`CabinetBar` `back`, `Breadcrumbs`, the sheet's bar), never a lone link.
- [ ] One primary action on screen; secondary actions are thin glyphs in one `GlyphGroup` capsule or in a `Menu`, not a row of equal buttons.
- [ ] Every choice from a list is the kit `Select` / `Menu` list.
- [ ] Tabs are `TextTabs`, toggles are `SegmentedControl`, captions are `SectionCaption`, empty places are `EmptyState`, long lists are `MoreFade` (or `ScrollArea` when the list scrolls inside a group).
- [ ] Picture shelves keep 3:4 picture cards; text on photos uses `--card-scrim`.
- [ ] No borders around cards, no banners, no avatar rings, no glow, no decorative icons, no initials.
- [ ] A row that opens something is clickable as a whole and ends in its action or a chevron; glyphs sit bare in their colour, never on a tinted disc; no hover fill that crosses the row's lines.
- [ ] Only token colours and type sizes; secondary text is still readable.
- [ ] Text says only what decides the next tap; content is shown as the person will see it (no raw URLs).
- [ ] Nothing looks cut, broken or like something it is not (a preview that reads as a booking, a button that seems to do nothing).
- [ ] Nothing outside what the owner asked for was changed.
- [ ] It passes «простота, удобство, современность» at a glance: if it looks like a generic template, it is not done.

In the summary to the owner, list the components used and any rule you had to bend and why.

## When the owner rejects or praises something

Add a row to the right section of `docs/design/patterns.md` in the same turn: ✅ what to do (with the component), ❌ what was rejected, and the owner's words in quotes. Keep it one line per rule.
