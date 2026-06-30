---
name: update-project-cards
description: Regenerates the project cards gallery on this repo's GitHub Pages site (pages/index.html, pages/banner.svg, and the animated pages/card-cycle.gif) from the submodules under ./projects. Use when a project is added, removed, or updated under ./projects, or when the user asks to "update the project cards", "sync the gallery", "refresh the Pages site", "update the gif", or "add a project to the README".
---

# Update Project Cards

This repo (`tianhaoz95/tianhaoz95`) is the GitHub profile repo. It deploys a
static project-cards gallery to GitHub Pages via
`.github/workflows/deploy-pages.yml`, which uploads `pages/` as the Pages
artifact on every push that touches `pages/**`.

Three artifacts hold the actual content and must stay in sync:

- `pages/index.html` — the full cards gallery (one card per project), plus a
  `.hero` block near the top, headed "Highlighted Projects", that stacks
  `banner.svg` above `card-cycle.gif` as a compact preview of the same
  cards.
- `pages/banner.svg` — a static two-card-per-row preview of every project
  card, shown in the `.hero` block above the GIF.
- `pages/card-cycle.gif` — a small (420×240) looping animation that cycles
  through every project's card one at a time, highlighting the currently
  shown one (accent top-bar + progress dots). This is what keeps the gallery
  usable in a small footprint as the project count grows — it's the only
  artifact that scales by *time* (cycling) rather than *space* (a grid that
  keeps getting taller). Generated with the `hyperframes` CLI (a `motion-graphics`-style
  composition) — see "Regenerating the GIF" below.

`README.md` embeds `pages/card-cycle.gif` directly (not `banner.svg`) as a
clickable image linking to the live Pages site — GitHub strips
`<iframe>`/live HTML from profile READMEs, so an animated GIF is the
richest format that still renders there.

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

4. **Regenerate `pages/index.html`.** Reuse the existing CSS classes and
   card markup structure (`.card`, `.card-media`, `.card-body`,
   `.card-title`, `.card-desc`, `.tags`/`.tag`, `.hero`, `.hero-label`,
   `.hero-banner`, `.hero-gif`) — don't restyle the page.
   `.card-media.icon-only` is for projects whose only available image is a
   small icon/favicon rather than a screenshot. The `.hero` block's
   `src="banner.svg"` / `src="card-cycle.gif"` paths don't change; only
   their `alt` text needs updating if the project list changed (list every
   project name in the alt text).

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

7. **Leave `README.md` alone** unless the "## Projects" section or the
   GIF's path/filename changed — it just links to `card-cycle.gif` and
   doesn't need per-project edits (the GIF itself carries the per-project
   content).

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

**Fixed canvas**: 420×240 regardless of project count — the whole point is
a small, constant footprint. Dark theme only (no `prefers-color-scheme`
support — it's a static GIF), reusing `index.html`'s `:root` dark tokens:
`--bg:#0b0d12 --card-bg:#12151c --border:#232733 --text:#e6e8ef
--muted:#9aa3b2 --accent:#7c9bff`.

**Timing — generalizes to N projects.** `HOLD = 1.8s`, `TRANS = 0.4s`,
`SEG = HOLD + TRANS = 2.2s`. Total duration `D = N * SEG`. For very large N
(more than ~8 projects pushes the loop past ~18s), shorten `HOLD` so the
full loop stays under roughly 15–20s — don't change `TRANS`.

For card `i` (0-indexed, 0 ≤ i < N), on its own `data-track-index="i+1"`:

```
start_i    = (i == 0)     ? 0 : i*SEG - TRANS
end_i      = (i == N-1)   ? D : (i+1)*SEG
duration_i = end_i - start_i
```

A `#dots` clip spans the whole timeline (`data-start="0" data-duration="D"
data-track-index="N+1"`) holding one `<span class="dot" id="dot{i}">` per
project, centered at the bottom.

GSAP timeline: set the initial state at `t=0` (card 0 opacity 1 / scale 1 /
y 0, dot 0 accent-colored + scaled 1.3; every other card opacity 0 / scale
0.96 / y 8, every other dot muted-bordered + scale 1). Then for each
transition `i -> i+1` (i from 0 to N-2), at `t = i*SEG + HOLD`:

```js
tl.to(`#card${i}`,   { opacity: 0, scale: 0.96, y: -8, duration: TRANS, ease: "power2.in" }, t);
tl.to(`#card${i+1}`, { opacity: 1, scale: 1,    y: 0,  duration: TRANS, ease: "power2.out" }, t);
tl.to(`#dot${i}`,    { backgroundColor: "#232733", scale: 1,   duration: TRANS }, t);
tl.to(`#dot${i+1}`,  { backgroundColor: "#7c9bff", scale: 1.3, duration: TRANS }, t);
```

**Card markup** (per project, inside its `.clip`): a small accent top-bar,
an `.icon-chip` with the project's emoji, `.card-title`, one-line
`.card-desc`, and up to 2 `.tag` pills — same visual language as
`index.html`'s cards, scaled down to fit 420×240.

**Build, lint, render**:

```bash
WORKDIR="$(mktemp -d)/card-cycle"
npx hyperframes init "$WORKDIR" --non-interactive --example=blank
# write the composition to "$WORKDIR/index.html" per the contract above
npx hyperframes lint "$WORKDIR"
npx hyperframes inspect "$WORKDIR"
npx hyperframes render "$WORKDIR" --format gif --fps 15 --gif-loop 0 \
  -o "$WORKDIR/renders/card-cycle.gif"
cp "$WORKDIR/renders/card-cycle.gif" pages/card-cycle.gif
```

Optionally `npx hyperframes snapshot "$WORKDIR" -o "$WORKDIR/snapshots"`
and view `contact-sheet.jpg` to sanity-check that each card shows the right
content with the right dot highlighted before copying into `pages/`.
