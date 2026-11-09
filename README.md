# AQA English Revision

The source for **aqaenglishrevision.com**, rebuilt from the Google Sites version in November 2026.
It's a static site made with [Eleventy](https://www.11ty.dev/): every page is a plain HTML file,
and one shared template adds the banner, menu and footer.

## Preview it on your Mac

You need [Node.js](https://nodejs.org/) (version 20 or newer) installed once. Then, in Terminal:

```
cd ~/Documents/GitHub/aqaenglishrevision
npm install        # first time only
npm start          # then open http://localhost:8080
```

Pages reload automatically when you save a file. Press `Ctrl+C` to stop.

## Where things live

| What | Where |
|---|---|
| Page content | `src/…` — the folder path matches the web address, e.g. `src/macbeth/plot.html` is `/macbeth/plot`, and `src/macbeth/index.html` is `/macbeth` |
| The menu | `src/_data/nav.json` |
| Site name, web address, footer text, visitor statistics | `src/_data/site.json` |
| Sitemap and robots.txt (made automatically) | `src/sitemap.njk`, `src/robots.njk` |
| Shared page template (header, menu, footer) | `src/_includes/base.njk` |
| Styles / menu script | `src/assets/css/site.css`, `src/assets/js/site.js` |
| Images | `src/assets/images/<page>/…`; images used on several pages are in `src/assets/images/shared/` |
| Custom quizzes and games | `src/assets/embeds/` (each is a self-contained HTML file shown in a frame) |
| Publishing workflow (not switched on yet) | `tools/github-pages-deploy.yml` |

### Addresses

Page addresses match the old Google Site exactly: no `.html` and no slash at the end
(`/macbeth/plot`). Each page's `permalink:` says where it's saved (`/macbeth/plot.html`); GitHub Pages
serves it at the address without `.html`. When linking between pages, use the address, e.g.
`<a href="/macbeth/plot">`.

### Editing a page

Each page file starts with a short header, then the content:

```html
---
title: "Plot"
permalink: /macbeth/plot.html   # address: /macbeth/plot
---

<section class="sec">
<div class="wrap">
<p>The easiest way to remember the plot of Macbeth is…</p>
</div>
</section>
```

The building blocks used across the site:

- `<section class="sec">` is a band of the page; add `sec-light` (grey) or `sec-dark` (navy) for coloured bands.
- `<section class="banner" style="--banner:url('/assets/images/…');--shade:0.6">` is the big title banner at the top (`--shade` darkens the photo, 0 to 1).
- `<div class="row">` with `<div class="col" style="--span:6">` makes columns; the spans in a row add up to 12. They stack on phones.
- `<details class="drop"><summary><h3>Title</h3></summary><div class="drop-body">…</div></details>` is a drop-down box.
- `<p class="sm">` is the smaller body text; `class="tc"` centres text.
- Headings are bold by default; `class="nb"` makes one not bold.

### Pages that aren't in the menu

Some pages are deliberately left out of the menu (as they were on Google Sites) but are still
published and reachable by their address, e.g. `/unseen-poetry/time`. Pages nothing links to have
`sitemap: false` in their header, which keeps them out of the sitemap given to search engines.

Pages with `draft: true` in their header (the old test pages under `src/drafts/`) only appear when
you preview locally — they're left out of the live site.

## Publishing (GitHub Pages)

The workflow in `.github/workflows/deploy.yml` builds the site and publishes it to GitHub Pages
every time you push to `main`. You can also run it by hand: GitHub → Actions → "Deploy site" → Run workflow.

The custom domain (`www.aqaenglishrevision.com`) is set in GitHub → Settings → Pages; with this kind of
workflow no CNAME file is needed. The DNS at GoDaddy points `www` at `mrstep2002.github.io` and the plain
address at GitHub's four Pages IP addresses.

## Visitor statistics

The site is ready for [GoatCounter](https://www.goatcounter.com/), which counts visits without cookies.
Once you have an account, put its code in `src/_data/site.json`, e.g. `"goatcounter": "aqaenglishrevision"`.
Leave it empty (`""`) to switch statistics off.

## How this was made

`tools/convert_google_sites.py` converted the Google Sites export (kept outside this repository) into
the files in `src/`. It was a one-off: from now on, edit the files in `src/` directly. Re-running the
converter would overwrite your edits.
