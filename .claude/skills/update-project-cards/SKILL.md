---
name: update-project-cards
description: Regenerates the #projects section of this repo's GitHub Pages profile (site/src/data/profile.ts + site/src/sections/projects.ts, the light/dark assets/banner*.svg pair, and the animated light/dark assets/card-cycle*.gif pair) from the submodules under ./projects. Use when a project is added, removed, or updated under ./projects, or when the user asks to "update the project cards", "sync the gallery", "refresh the Pages site", "update the gif", or "add a project to the README".
---

# Update Project Cards

This repo (`tianhaoz95/tianhaoz95`) is the GitHub profile repo. `site/` is a
Vite + vanilla TypeScript app that builds the deployed profile page;
`.github/workflows/deploy-pages.yml` runs `npm ci && npm run build` inside
`site/` and uploads its build output (`site/dist`) as the Pages artifact,
on every push touching `site/**` or `assets/**`.

`assets/` holds **only** four static files — `banner.svg`, `banner-dark.svg`,
`card-cycle.gif`, `card-cycle-dark.gif` — plus `.nojekyll`. It is not itself
deployed; `site/vite.config.ts`'s `publicDir` points at `../assets`, so Vite
copies its contents into the build output at build time. `assets/` is also
the source `README.md` links to directly via git-relative paths
(`assets/card-cycle.gif` etc.), independent of the Pages deploy — that
dependency is why these four files must stay at these exact paths
regardless of anything else in `site/`.

`site/` is a full developer-profile app (`site/src/main.ts` renders, in
order: `.site-nav`, `#about`, `#skills`, `#projects`, `#contact`, footer) —
**this skill only owns the `#projects` section**, specifically
`site/src/data/profile.ts`'s `projects` array and `site/src/sections/projects.ts`'s
templating. Don't touch `site/src/sections/{nav,about,skills,contact}.ts`
or `profile.ts`'s `name`/`bio`/`pills`/`skillGroups`/`contactLinks` fields
when running this skill; those are a separate concern (bio, tech-stack
tags, social links) with no per-project data in them. Four artifacts make
up the `#projects` section and must stay in sync:

- `site/src/data/profile.ts`'s `projects: Project[]` array (id, emoji,
  title, description, repoUrl, media, tags — see the `Project` interface
  in that file) and `profile.hero` (the `banner`/`cardCycle` light/dark
  filename + alt-text config). `site/src/sections/projects.ts` renders
  both the `.hero` block (two `<picture>` elements, banner then GIF, each
  with a `(prefers-color-scheme: dark)` `<source>`) and the `.grid` of
  `.card`s from this data — never hand-edit rendered HTML, only the data
  module. Both the hero images and the rest of the page theme-switch on
  the *visitor's OS/browser* preference — independent from `README.md`'s
  switch, which reacts to the *visitor's GitHub UI theme setting* instead
  (see below).
- `assets/banner.svg` (light) and `assets/banner-dark.svg` (dark) — a
  static two-card-per-row preview of every project card, shown in the
  `.hero` block above the GIF.
- `assets/card-cycle.gif` (light) and `assets/card-cycle-dark.gif` (dark) —
  the same looping animation (rendered at 1760×480 pixels — 2x a logical
  880×240 design, for retina sharpness; see "Rendering at 2x" below —
  showing 3 projects side by side, periodically shuffling positions in a
  seamless cyclic rotation, the loop point invisible) rendered twice, once
  per theme. This is what keeps the gallery usable in a small footprint as
  the project count grows — it's the only artifact that scales by *time*
  (shuffling through more cards than fit on screen at once) rather than
  *space* (a grid that keeps getting taller). Generated with the
  `hyperframes` CLI (a `motion-graphics`-style composition) — see
  "Regenerating the GIF" below.

**All four light/dark pairs (`banner.svg`/`banner-dark.svg`,
`card-cycle.gif`/`card-cycle-dark.gif`) must be regenerated together, in
lockstep with each other and with `profile.ts`** — never update one
without the rest, or one surface (the Pages hero or the README) will show
a stale frame in whichever theme/asset wasn't touched.

`site/src/sections/projects.ts` renders the hero as `<picture>` + `<source
media="(prefers-color-scheme: dark)">` directly in the page's own DOM:

```html
<picture>
  <source srcset="banner-dark.svg" media="(prefers-color-scheme: dark)" />
  <img class="hero-banner" src="banner.svg" alt="..." loading="lazy" />
</picture>
<picture>
  <source srcset="card-cycle-dark.gif" media="(prefers-color-scheme: dark)" />
  <img class="hero-gif" src="card-cycle.gif" alt="..." loading="lazy" width="880" height="240" />
</picture>
```

`README.md` embeds both GIFs the same way but wrapped in an `<a>` to the
live Pages site, switching on the visitor's **GitHub UI theme setting**
rather than their OS/browser preference (both happen to use the same
`prefers-color-scheme` media feature under the hood, but GitHub applies it
based on the theme the visitor picked in their GitHub settings, which can
differ from their OS):

```html
<a href="https://tianhaoz95.github.io/tianhaoz95/">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/card-cycle-dark.gif">
    <source media="(prefers-color-scheme: light)" srcset="assets/card-cycle.gif">
    <img alt="Projects" src="assets/card-cycle.gif" width="880" height="240">
  </picture>
</a>
```

Both `srcset`/`src` paths are **relative**, not the deployed
`https://tianhaoz95.github.io/tianhaoz95/...` URL: a relative path
resolves to the committed file the instant it's pushed, with no
dependency on the Pages deploy workflow finishing first — the link
*destination* (which does point at the deployed site) is unaffected
either way. The `<img>`'s `width="880" height="240"` attributes are
required, not decorative — the GIF files are actually 1760×480 (2x, for
retina; see "Rendering at 2x" below), and without an explicit size markdown
renders images at their native pixel dimensions as CSS pixels, which would
make the banner display twice the intended size. `site/`'s `.hero-gif`
doesn't strictly need the width/height attributes since its own CSS
(`max-width: 600px`, in `site/src/theme.css`) already overrides displayed
size, but they're included anyway as a layout-shift-avoidance hint with
the correct 11:3 aspect ratio.

Projects live as git submodules under `./projects/*` (declared in
`.gitmodules`).

## Procedure

1. **Enumerate projects.** Read `.gitmodules` and `ls projects/` to get the
   current set of project directories and their remote repo URLs.

2. **Gather metadata per project**, in this priority order:
   - **Name**: title from the project's `README.md` (first `#` heading), else
     `package.json` `name`, else the directory name. If the project has a
     branded live-site title (check `<title>` on its homepage) that differs
     from the repo name, prefer the brand (e.g. repo `study` → site titled
     "Catpuccino.ai" → card says "Catpuccino.ai").
   - **Description**: the first descriptive paragraph under the README
     title, else `package.json` `description`. Keep it to 1–2 sentences for
     `profile.ts`, and a single short clause (~6 words) for the GIF card,
     since the GIF canvas is small.
   - **Repo URL**: from `.gitmodules`.
   - **Live site URL**: check, in order — a GitHub Pages deploy workflow
     under `<project>/.github/workflows/*pages*` (site is
     `https://tianhaoz95.github.io/<repo>/`, adjusted for any subpath the
     workflow copies, e.g. check what dir it `cp -r`s to `_site`), then
     `firebase.json` `hosting.site` (site is `https://<site>.web.app/`),
     then `package.json` `homepage`. Verify the URL actually resolves
     (`curl -s -o /dev/null -w '%{http_code}'`) before using it.
   - **Image/icon**: prefer hotlinking an image already hosted on the
     project's own live site or repo (a screenshot under its Pages site, or
     a favicon) over copying binaries into this repo. Verify it resolves
     with curl before using it. The GIF card uses a single emoji per
     project (pick one that fits the project, matching what's already used
     in `profile.ts`'s `emoji` field if the project already has a card)
     rather than the hotlinked image — the canvas is too small for a
     screenshot.
   - **Tags**: 2 short tags per project, reused between `profile.ts`'s
     `.grid` card and the GIF card (the `.grid` card may show a 3rd tag if
     there's room; the GIF stays to 2 for space).

3. **Diff against the existing gallery.** Match existing entries in
   `site/src/data/profile.ts`'s `projects` array by `repoUrl`. Add entries
   for new projects, update changed fields (description, links, image,
   tags) for existing ones, and remove entries for projects no longer
   under `./projects`.

4. **Edit `site/src/data/profile.ts`'s `projects` array only.** Leave every
   other field in that file (`name`, `handle`, `avatarUrl`, `bio`, `pills`,
   `skillGroups`, `contactLinks`) and every other `site/src/sections/*.ts`
   file untouched — they hold bio/skills/social content with nothing
   project-specific in them. `profile.hero`'s `banner`/`cardCycle`
   filenames don't change; only their `alt` text needs updating if the
   project list changed (list every project name in the alt text). After
   editing, run `cd site && npx tsc && npm run build` to confirm the
   `Project[]` shape still type-checks and the build succeeds. If a new
   project's tech stack is a real addition to what's already covered in
   `profile.ts`'s `skillGroups`, flag it to the user — this skill doesn't
   edit `skillGroups` itself, but stale skill tags are worth surfacing.

5. **Regenerate `assets/banner.svg` and `assets/banner-dark.svg` together**
   to match the same set of cards in the same compact two-card-per-row
   layout — same content and layout in both, only the color tokens differ
   (see the light/dark table in "Regenerating the GIF"; the SVG `<style>`
   block's `.bg`/`.card`/`.title`/`.desc`/`.tag`/`.tagbg`/`.heading` fill
   and stroke colors are the only thing that should differ between the two
   files). If there are more than 2 projects, wrap to additional rows and
   grow the `viewBox`/`height` accordingly, keeping each card block the
   same width/style as the existing ones, in both files identically.

6. **Regenerate `assets/card-cycle.gif` and `assets/card-cycle-dark.gif`
   together.** Always do a full regenerate (not a patch) so the cycle
   stays internally consistent — see "Regenerating the GIF" below for the
   exact composition. Always rebuild both banner SVGs, both GIFs, and
   `profile.ts` together in the same skill run; never let one update
   without the others, or the hero preview and the full grid will disagree
   on the project list, or the two themes will disagree with each other.

7. **Leave `README.md` alone** unless the "## Projects" section or either
   GIF's path/filename changed — it just embeds `card-cycle.gif` /
   `card-cycle-dark.gif` via the `<picture>` switch and doesn't need
   per-project edits (the GIFs themselves carry the per-project content).

8. **Show the diff to the user and confirm before pushing.** A push to
   `master` that touches `site/**` or `assets/**` triggers the deploy
   workflow automatically (which now runs a real `npm run build`, not a
   raw copy) — this is a visible, externally-observable change (it
   updates the live profile page), so don't push without confirmation.

9. **After pushing, verify the deploy**, mirroring how the gallery was
   first set up:
   ```
   gh run watch <run-id> --repo tianhaoz95/tianhaoz95 --exit-status
   curl -s -o /dev/null -w "%{http_code}\n" https://tianhaoz95.github.io/tianhaoz95/
   curl -s -o /dev/null -w "%{http_code}\n" https://tianhaoz95.github.io/tianhaoz95/card-cycle.gif
   curl -s -o /dev/null -w "%{http_code}\n" https://tianhaoz95.github.io/tianhaoz95/card-cycle-dark.gif
   curl -s -o /dev/null -w "%{http_code}\n" https://tianhaoz95.github.io/tianhaoz95/banner.svg
   curl -s -o /dev/null -w "%{http_code}\n" https://tianhaoz95.github.io/tianhaoz95/banner-dark.svg
   curl -s https://tianhaoz95.github.io/tianhaoz95/ | grep -o "<project name>"
   ```
   The live page is a Vite build (`site/dist`), so its `index.html` uses
   hashed asset filenames (`./assets/index-<hash>.js`) that change on every
   build — don't hardcode those; only the four `assets/*` static files and
   `.nojekyll` are guaranteed to keep stable names.

## Regenerating the GIF

Build it outside the repo (a scratch/tmp dir), then copy the rendered file
into `assets/card-cycle.gif` — don't run `hyperframes init` inside the repo
itself.

Requires the `hyperframes` CLI (`npx hyperframes doctor` to check
Chrome/FFmpeg are available) and benefits from the bundled HyperFrames
skills for composition syntax reference (`hyperframes-core` for the
`data-*` clip contract) if available in the current session — otherwise
the pattern below is self-contained.

**Composition contract recap**: a root `<div id="root" data-composition-id
data-start="0" data-width data-height data-duration>`; each visible timed
child needs `class="clip"` + `data-start` + `data-duration` +
`data-track-index` (clips on the same track can't overlap — give every
card its own track); GSAP timeline built paused and registered on
`window.__timelines["main"]`.

**Design: K cards visible side by side, shuffling.** `K = min(N, 3)` — 3
fixed slots shown at once (never more, to keep the footprint constant);
fewer if there are under 3 projects. Every project card is always visible
at `K = 3`; the "shuffle" is a position swap, not a content swap. Neither
GIF uses `prefers-color-scheme` itself — it's a static render, so light
and dark are two separate renders of the *same* composition with only the
color constants swapped:

| Token         | Light (`card-cycle.gif`)        | Dark (`card-cycle-dark.gif`)     |
| ------------- | -------------------------------- | --------------------------------- |
| outer page bg | `#ffffff`                        | `#0d1117`                         |
| `.card` bg    | `#ffffff`                        | `#12151c`                         |
| border        | `#e3e6ec`                        | `#232733`                         |
| title text    | `#1a1d24`                        | `#e6e8ef`                         |
| desc text     | `#5b6472`                        | `#9aa3b2`                         |
| accent        | `#3b5bdb`                        | `#7c9bff`                         |
| tag bg/border | `rgba(59,91,219,.08)/.25`        | `rgba(124,155,255,.12)/.25`       |

The outer page background in each case is matched to GitHub's *actual*
canvas color for that theme (`#ffffff` light / `#0d1117` dark) rather than
`site/src/theme.css`'s own `--bg` tokens (`#f6f7f9` / `#0b0d12`) — this is
what lets each GIF blend into the README with no visible edge on
github.com, regardless of the visitor's GitHub theme. The card colors
themselves reuse `theme.css`'s own `:root` tokens (light and dark blocks
respectively) — only the outer canvas is GitHub-matched, not the whole
palette. Both the GIF pair and the `banner.svg`/`banner-dark.svg` pair are
shared assets: `site/`'s `#projects` hero theme-switches on the visitor's
OS/browser preference (its own `<picture>` sources), and `README.md`
theme-switches on the visitor's GitHub UI theme (its own separate
`<picture>` sources) — same two files, two independent switches.
Regenerate both GIFs (and both banner SVGs) from one shared
composition/template, swapping only the color constants between runs, so
the pair never drifts into different layouts or timing from each other.

**Rendering at 2x for retina.** The composition is authored and rendered
at exactly **2x** a logical 880×240 / `K=3` design — 1760×480 actual
canvas, 528px-wide card slots (2x logical 264px), 48px outer padding (2x
24px), 40px gaps (2x 20px), fonts/borders/radii all doubled too (see "Card
markup" below for the doubled values). Every distance in the JS timeline
(`SLOTS`, the `x` deltas) is likewise 2x the logical design. This exists
purely to avoid blur on Retina/HiDPI screens: a naively-rendered 1x GIF
gets upscaled by the browser on any high-density display, which is what
"low resolution" GIF complaints usually are. Do **not** render at the
logical 1x size and rely on `--resolution` to upscale — `hyperframes
render --resolution` only accepts a fixed preset list (`landscape`,
`portrait`, `square`, etc. — see `hyperframes render --help`), none of
which match this composition's ~11:3 aspect ratio, so there is no
flag-only path to 2x here. Bake the doubled pixel values into the
composition itself instead. Where the GIF is *displayed* (`README.md`'s
`<img width height>`, or `site/`'s CSS `max-width`) is what constrains it
back down to the intended on-screen size — see the `<picture>` block above
and the "Canvas" note below.

**Canvas**: 1760×480 at `K=3` (528px-wide card slots, 48px outer padding,
40px gaps — same row math as `banner.svg`'s two-up layout doubled, just
three-up). For `K=2` use the `banner.svg` two-card geometry (404px slots,
also doubled if regenerating fresh) at a shorter, squarer canvas; for
`K=1` it degenerates to the old single-card cycle (see git history before
this section was rewritten, if ever needed again).

**`K=3` is a pure cyclic rotation — the common case for ≤3 projects.**
Slot left-edges: `SLOTS = [48, 616, 1184]`. Each card's CSS `left` is
fixed to its home slot (cycle 0 position); everything else is a GSAP `x`
(translateX) offset from home. Every cycle, every card advances one slot
to the right, wrapping the rightmost card back to the leftmost — after
exactly 3 cycles every card is back at its slot-0 position, so the loop
point is bit-for-bit identical to `t=0` and the GIF loops with no visible
seam. `HOLD = 1.8s`, `TRANS = 0.6s`, `SEG = HOLD+TRANS = 2.4s`, total
duration `D = 3*SEG = 7.2s` (timing is unaffected by the 2x pixel scale —
only spatial values double, never durations/opacity/scale/z-index).

For card `c` with home slot `h_c` (0, 1, or 2), its `x` delta at cycle `k`
(0, 1, 2) is `SLOTS[(h_c + k) % 3] - SLOTS[h_c]`. Each transition starts at
`t = k*SEG + HOLD` and tweens to the next cycle's deltas:

```js
const SLOTS = [48, 616, 1184];
const HOLD = 1.8, TRANS = 0.6, SEG = HOLD + TRANS;
// deltasFor(homeSlot) -> [cycle0, cycle1, cycle2] x-offsets from home
const deltasFor = (h) => [0, 1, 2].map((k) => SLOTS[(h + k) % 3] - SLOTS[h]);
const deltasA = deltasFor(0), deltasB = deltasFor(1), deltasC = deltasFor(2);

tl.set(["#cardA", "#cardB", "#cardC"], { x: 0, scale: 1, zIndex: 1 }, 0);
const wrappers = ["#cardC", "#cardB", "#cardA"]; // the card doing the long wrap-around each cycle
const allCards = ["#cardA", "#cardB", "#cardC"];
for (let cycle = 0; cycle < 3; cycle++) {
  const t = cycle * SEG + HOLD;
  const next = (cycle + 1) % 3;
  const wrapId = wrappers[cycle];
  const others = allCards.filter((id) => id !== wrapId);
  tl.set(wrapId, { zIndex: 0 }, t);
  tl.set(others, { zIndex: 2 }, t);
  tl.to("#cardA", { x: deltasA[next], duration: TRANS, ease: "power2.inOut" }, t);
  tl.to("#cardB", { x: deltasB[next], duration: TRANS, ease: "power2.inOut" }, t);
  tl.to("#cardC", { x: deltasC[next], duration: TRANS, ease: "power2.inOut" }, t);
  tl.to(allCards, { scale: 0.97, opacity: 0.85, duration: TRANS / 2, ease: "power1.inOut" }, t);
  tl.to(allCards, { scale: 1, opacity: 1, duration: TRANS / 2, ease: "power1.inOut" }, t + TRANS / 2);
  tl.set(allCards, { zIndex: 1 }, t + TRANS);
}
```

The `zIndex` dip + `opacity: 0.85` mid-transition is required, not
cosmetic: with 3 cards rotating through 3 slots, the card making the long
(2-slot) wrap necessarily crosses paths with the other two mid-slide.
`npx hyperframes inspect` flags that crossing as `text_occluded` /
`content_overlap` unless you either (a) route the motion around it, or (b)
do what's above — dip the wrapping card's z-index and everyone's opacity
so the cross-fade reads as an intentional shuffle. Mark each `.card` clip
`data-layout-allow-occlusion="true" data-layout-allow-overlap="true"` so
`inspect` doesn't flag the by-design overlap as an error.

**`K>3` (more than 3 projects, not yet built)**: keep 3 visible slots, but
treat the rotation as a sliding window over all `N` projects instead of a
closed permutation of 3 — each "cycle" swaps one slot's occupant for the
next not-yet-shown project (slide out / slide in from off-canvas, same
`TRANS` crossfade), advancing until all `N` projects have appeared once,
then the window is back to its starting 3 and the loop closes. Don't reuse
the closed 3-card rotation above unmodified for `N>3`; it has no concept of
a project that isn't one of the 3 visible cards.

**Card markup** (per project, inside its `.clip`): a small accent top-bar,
a 72px `.icon-chip` with the project's emoji, `.card-title` (30px),
one-line `.card-desc` (22px), and up to 2 `.tag` pills (19px) — same
visual language as `site/`'s cards (at half these sizes), scaled up 2x to
fit a 528×400 slot.

**Build, lint, inspect, render — once per theme.** Build one composition
(light colors), verify it, render it, then copy the same file and
substitute only the color constants from the table above for the dark
pass — same content, same timing, same lint/inspect checks:

```bash
WORKDIR="$(mktemp -d)/card-cycle"
npx hyperframes init "$WORKDIR" --non-interactive --example=blank
# write the light-palette composition to "$WORKDIR/index.html" per the contract above
npx hyperframes lint "$WORKDIR"      # benign: "overlapping_gsap_tweens" warnings on x vs scale/opacity are expected
npx hyperframes inspect "$WORKDIR"   # must be 0 issues — the allow-occlusion/allow-overlap attributes should clear it
npx hyperframes render "$WORKDIR" --format gif --fps 15 --gif-loop 0 \
  -o "$WORKDIR/renders/card-cycle.gif"
cp "$WORKDIR/renders/card-cycle.gif" assets/card-cycle.gif

DARKDIR="$(mktemp -d)/card-cycle-dark"
cp -r "$WORKDIR"/. "$DARKDIR"
rm -rf "$DARKDIR/renders" "$DARKDIR/snapshots"
# edit "$DARKDIR/index.html": swap only the color constants (table above) to the dark column
npx hyperframes lint "$DARKDIR"
npx hyperframes inspect "$DARKDIR"
npx hyperframes render "$DARKDIR" --format gif --fps 15 --gif-loop 0 \
  -o "$DARKDIR/renders/card-cycle-dark.gif"
cp "$DARKDIR/renders/card-cycle-dark.gif" assets/card-cycle-dark.gif
```

Sanity-check each with `npx hyperframes snapshot "$DIR" -o "$DIR/snapshots" --at <comma-separated-seconds>`
(the `--at` flag, not `--times`) and view `contact-sheet.jpg` — confirm the
loop point (`t=0` vs `t=D`) is visually identical, and check a
mid-transition timestamp (e.g. `HOLD + TRANS/2` of the first cycle) to
confirm the wrap crossing reads as a soft shuffle, not a hard glitch. Do
this for both the light and dark render before copying either into
`assets/`.
