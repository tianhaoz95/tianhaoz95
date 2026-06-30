---
name: update-project-cards
description: Regenerates the project cards gallery on this repo's GitHub Pages site (pages/index.html and pages/banner.svg) from the submodules under ./projects. Use when a project is added, removed, or updated under ./projects, or when the user asks to "update the project cards", "sync the gallery", "refresh the Pages site", or "add a project to the README".
---

# Update Project Cards

This repo (`tianhaoz95/tianhaoz95`) is the GitHub profile repo. It deploys a
static project-cards gallery to GitHub Pages via
`.github/workflows/deploy-pages.yml`, which uploads `pages/` as the Pages
artifact on every push that touches `pages/**`. `README.md` (the profile
page) embeds `pages/banner.svg` as a clickable image linking to the live
Pages site — GitHub strips `<iframe>`/live HTML from profile READMEs, so the
banner is a static SVG, not a live embed.

Two files hold the actual content and must stay in sync:

- `pages/index.html` — the full cards gallery (one card per project)
- `pages/banner.svg` — a mini static preview of the same cards, used in
  `README.md`

Projects live as git submodules under `./projects/*` (declared in
`.gitmodules`).

## Procedure

1. **Enumerate projects.** Read `.gitmodules` and `ls projects/` to get the
   current set of project directories and their remote repo URLs.

2. **Gather metadata per project**, in this priority order:
   - **Name**: title from the project's `README.md` (first `#` heading), else
     `package.json` `name`, else the directory name.
   - **Description**: the first descriptive paragraph under the README
     title, else `package.json` `description`. Keep it to 1–2 sentences.
   - **Repo URL**: from `.gitmodules`.
   - **Live site URL**: check, in order — a GitHub Pages deploy workflow
     under `<project>/.github/workflows/*pages*` (site is
     `https://tianhaoz95.github.io/<repo>/`, adjusted for any subpath the
     workflow copies, e.g. check what dir it `cp -r`s to `_site`), then
     `firebase.json` `hosting.site` (site is `https://<site>.web.app/`),
     then `package.json` `homepage`. Verify the URL actually resolves
     (`curl -s -o /dev/null -w '%{http_code}'`) before using it.
   - **Image**: prefer hotlinking an image already hosted on the project's
     own live site or repo (a screenshot under its Pages site, or a favicon)
     over copying binaries into this repo. Verify it resolves with curl
     before using it, same as the live site URL.

3. **Diff against the existing gallery.** Match existing cards in
   `pages/index.html` by repo URL. Add cards for new projects, update
   changed fields (description, links, image) for existing ones, and remove
   cards for projects no longer under `./projects`.

4. **Regenerate `pages/index.html`.** Reuse the existing CSS classes and
   card markup structure (`.card`, `.card-media`, `.card-body`,
   `.card-title`, `.card-desc`, `.tags`/`.tag`) — don't restyle the page.
   `.card-media.icon-only` is for projects whose only available image is a
   small icon/favicon rather than a screenshot.

5. **Regenerate `pages/banner.svg`** to match the same set of cards in the
   same compact two-card-per-row layout. If there are more than 2 projects,
   wrap to additional rows and grow the `viewBox`/`height` accordingly,
   keeping each card block the same width/style as the existing ones.

6. **Leave `README.md` alone** unless the "## Projects" section or the
   banner's path/filename changed — it just links to `banner.svg` and
   doesn't need per-project edits.

7. **Show the diff to the user and confirm before pushing.** A push to
   `master` that touches `pages/**` triggers the deploy workflow
   automatically — this is a visible, externally-observable change (it
   updates the live profile page), so don't push without confirmation.

8. **After pushing, verify the deploy**, mirroring how the gallery was
   first set up:
   ```
   gh run watch <run-id> --repo tianhaoz95/tianhaoz95 --exit-status
   curl -s -o /dev/null -w "%{http_code}\n" https://tianhaoz95.github.io/tianhaoz95/
   curl -s https://tianhaoz95.github.io/tianhaoz95/ | grep -o "<project name>"
   ```
