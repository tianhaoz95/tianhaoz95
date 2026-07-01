---
name: update-project-cards
description: Regenerates the #projects section of this repo's GitHub Pages profile (pages/index.html, pages/banner.svg, and the animated pages/card-cycle.gif + pages/card-cycle-dark.gif) from the submodules under ./projects. Use when a project is added, removed, or updated under ./projects, or when the user asks to "update the project cards", "sync the gallery", "refresh the Pages site", "update the gif", or "add a project to the README".
---

# Update Project Cards

This repo (`tianhaoz95/tianhaoz95`) is the GitHub profile repo. It deploys a
static project-cards gallery to GitHub Pages via
`.github/workflows/deploy-pages.yml`, which uploads `pages/` as the Pages
artifact on every push that touches `pages/**`.

`pages/index.html` is a full developer-profile page (`.site-nav` +
`#about` + `#skills` + `#projects` + `#contact`, in that order) — **this
skill only owns the `#projects` section.** Don't touch `.site-nav`,
`#about`, `#skills`, or `#contact` when running this skill; those are a
separate concern (bio, tech-stack tags, social links) with no per-project
data in them. Three artifacts make up the `#projects` section and must
stay in sync:

- The `#projects` section of `pages/index.html` — a `.hero` block (stacks
  `banner.svg` above `card-cycle.gif` as a compact preview) followed by
  the full `.grid` of one `.card` per project.
- `pages/banner.svg` — a static two-card-per-row preview of every project
  card, shown in the `.hero` block above the GIF.
- `pages/card-cycle.gif` (light) and `pages/card-cycle-dark.gif` (dark) —
  the same looping animation (880×240 at 3 projects, project cards side by
  side, periodically shuffling positions in a seamless cyclic rotation —
  the loop point is invisible) rendered twice, once per theme. This is
  what keeps the gallery usable in a small footprint as the project count
  grows — it's the only artifact that scales by *time* (shuffling through
  more cards than fit on screen at once) rather than *space* (a grid that
  keeps getting taller). Generated with the `hyperframes` CLI (a
  `motion-graphics`-style composition) — see "Regenerating the GIF" below.
  **Both light and dark variants must be regenerated together** — never
  update one without the other, or `README.md`'s theme switch (below) will
  show a stale frame in whichever theme wasn't touched.

`README.md` embeds both GIFs via a `<picture>` element with
`prefers-color-scheme` sources, switching on the visitor's GitHub theme
setting, wrapped in an `<a>` to the live Pages site (`pages/index.html`
itself stays light-only in its `#projects` hero — see "Regenerating the
GIF" for why the two surfaces intentionally differ):

```html
<a href="https://tianhaoz95.github.io/tianhaoz95/">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="pages/card-cycle-dark.gif">
    <source media="(prefers-color-scheme: light)" srcset="pages/card-cycle.gif">
    <img alt="Projects" src="pages/card-cycle.gif">
  </picture>
</a>
```

Both `srcset`/`src` paths are **relative**, not the deployed
`https://tianhaoz95.github.io/tianhaoz95/...` URL: a relative path
resolves to the committed file the instant it's pushed, with no
dependency on the Pages deploy workflow finishing first — the link
*destination* (which does point at the deployed site) is unaffected
either way.

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
     `index.html`, and a single short clause (~6 words) for the GIF card,
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
     in `index.html`'s `.card-title` if the project already has a card)
     rather than the hotlinked image — the canvas is too small for a
     screenshot.
   - **Tags**: 2 short tags per project, reused between `index.html` and the
     GIF card (`index.html` may show a 3rd tag if there's room; the GIF
     stays to 2 for space).

3. **Diff against the existing gallery.** Match existing cards in
   `pages/index.html` by repo URL. Add cards for new projects, update
   changed fields (description, links, image) for existing ones, and remove
   cards for projects no longer under `./projects`.

4. **Regenerate only the `#projects` section of `pages/index.html`.** Leave
   `.site-nav`, `#about`, `#skills`, and `#contact` untouched — they hold
   bio/skills/social content with nothing project-specific in them. Within
   `#projects`, reuse the existing CSS classes and markup structure
   (`.section-label`, `.hero`, `.hero-banner`, `.hero-gif`, `.grid`,
   `.card`, `.card-media`, `.card-body`, `.card-title`, `.card-desc`,
   `.tags`/`.tag`) — don't restyle the page. `.card-media.icon-only` is for
   projects whose only available image is a small icon/favicon rather than
   a screenshot. The `.hero` block's `src="banner.svg"` / `src="card-cycle.gif"`
   paths don't change; only their `alt` text needs updating if the project
   list changed (list every project name in the alt text). If a new
   project's tech stack is a real addition to what's already covered in
   `#skills`, flag it to the user — this skill doesn't edit `#skills`
   itself, but stale skill tags are worth surfacing.

5. **Regenerate `pages/banner.svg`** to match the same set of cards in the
   same compact two-card-per-row layout. If there are more than 2 projects,
   wrap to additional rows and grow the `viewBox`/`height` accordingly,
   keeping each card block the same width/style as the existing ones.

6. **Regenerate `pages/card-cycle.gif`.** Always do a full regenerate (not a
   patch) so the cycle stays internally consistent — see "Regenerating the
   GIF" below for the exact composition. Always rebuild `banner.svg`,
   `card-cycle.gif`, and `index.html` together in the same skill run; never
   let one update without the others, or the hero preview and the full grid
   will disagree on the project list.

7. **Leave `README.md` alone** unless the "## Projects" section or either
   GIF's path/filename changed — it just embeds `card-cycle.gif` /
   `card-cycle-dark.gif` via the `<picture>` switch and doesn't need
   per-project edits (the GIFs themselves carry the per-project content).

8. **Show the diff to the user and confirm before pushing.** A push to
   `master` that touches `pages/**` triggers the deploy workflow
   automatically — this is a visible, externally-observable change (it
   updates the live profile page), so don't push without confirmation.

9. **After pushing, verify the deploy**, mirroring how the gallery was
   first set up:
   ```
   gh run watch <run-id> --repo tianhaoz95/tianhaoz95 --exit-status
   curl -s -o /dev/null -w "%{http_code}\n" https://tianhaoz95.github.io/tianhaoz95/
   curl -s -o /dev/null -w "%{http_code}\n" https://tianhaoz95.github.io/tianhaoz95/card-cycle.gif
   curl -s -o /dev/null -w "%{http_code}\n" https://tianhaoz95.github.io/tianhaoz95/card-cycle-dark.gif
   curl -s https://tianhaoz95.github.io/tianhaoz95/ | grep -o "<project name>"
   ```

## Regenerating the GIF

Build it outside the repo (a scratch/tmp dir), then copy the rendered file
into `pages/card-cycle.gif` — don't run `hyperframes init` inside the repo
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
`index.html`'s own `--bg` tokens (`#f6f7f9` / `#0b0d12`) — this is what
lets each GIF blend into the README with no visible edge on github.com,
regardless of the visitor's GitHub theme. The card colors themselves reuse
`index.html`'s own `:root` tokens (light and dark blocks respectively) —
only the outer canvas is GitHub-matched, not the whole palette.
`pages/banner.svg` and `pages/index.html`'s `#projects` hero stay
**light-only** (the light-token row above) — only `README.md` theme-
switches, via the `<picture>` element described earlier. Regenerate both
GIFs from one shared composition file, swapping only the color constants
between runs, so they never drift into different layouts or timing.

**Canvas**: 880×240 at `K=3` (264px-wide card slots, 24px outer padding,
20px gaps — same row math as `banner.svg`'s two-up layout, just three-up).
For `K=2` use the `banner.svg` two-card geometry (404px slots) at a
shorter, squarer canvas; for `K=1` it degenerates to the old single-card
cycle (see git history before this section was rewritten, if ever needed
again).

**`K=3` is a pure cyclic rotation — the common case for ≤3 projects.**
Slot left-edges: `SLOTS = [24, 308, 592]`. Each card's CSS `left` is fixed
to its home slot (cycle 0 position); everything else is a GSAP `x`
(translateX) offset from home. Every cycle, every card advances one slot
to the right, wrapping the rightmost card back to the leftmost — after
exactly 3 cycles every card is back at its slot-0 position, so the loop
point is bit-for-bit identical to `t=0` and the GIF loops with no visible
seam. `HOLD = 1.8s`, `TRANS = 0.6s`, `SEG = HOLD+TRANS = 2.4s`, total
duration `D = 3*SEG = 7.2s`.

For card `c` with home slot `h_c` (0, 1, or 2), its `x` delta at cycle `k`
(0, 1, 2) is `SLOTS[(h_c + k) % 3] - SLOTS[h_c]`. Each transition starts at
`t = k*SEG + HOLD` and tweens to the next cycle's deltas:

```js
const SLOTS = [24, 308, 592];
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
a 36px `.icon-chip` with the project's emoji, `.card-title` (15px),
one-line `.card-desc` (11px), and up to 2 `.tag` pills (9.5px) — same
visual language as `index.html`'s cards, scaled down to fit a 264×200
slot.

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
cp "$WORKDIR/renders/card-cycle.gif" pages/card-cycle.gif

DARKDIR="$(mktemp -d)/card-cycle-dark"
cp -r "$WORKDIR"/. "$DARKDIR"
rm -rf "$DARKDIR/renders" "$DARKDIR/snapshots"
# edit "$DARKDIR/index.html": swap only the color constants (table above) to the dark column
npx hyperframes lint "$DARKDIR"
npx hyperframes inspect "$DARKDIR"
npx hyperframes render "$DARKDIR" --format gif --fps 15 --gif-loop 0 \
  -o "$DARKDIR/renders/card-cycle-dark.gif"
cp "$DARKDIR/renders/card-cycle-dark.gif" pages/card-cycle-dark.gif
```

Sanity-check each with `npx hyperframes snapshot "$DIR" -o "$DIR/snapshots" --at <comma-separated-seconds>`
(the `--at` flag, not `--times`) and view `contact-sheet.jpg` — confirm the
loop point (`t=0` vs `t=D`) is visually identical, and check a
mid-transition timestamp (e.g. `HOLD + TRANS/2` of the first cycle) to
confirm the wrap crossing reads as a soft shuffle, not a hard glitch. Do
this for both the light and dark render before copying either into
`pages/`.
