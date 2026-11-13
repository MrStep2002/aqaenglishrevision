# AQA English Revision

The source for **aqaenglishrevision.com**, rebuilt from the Google Sites version in November 2026.
It's a static site made with [Eleventy](https://www.11ty.dev/): every page is a plain HTML file,
and one shared template adds the header, menu, title plate, contents column and footer.

The look ("the Annotated Edition", November 2026) is written-first and laid out like a newspaper page:
the contents column on the left, the text in the middle, and a right-hand margin for notes, word
definitions and pictures. Readers can change the font, size, spacing and page colour, and tick
pages off as read; their browser remembers both.

Site illustrations live under `src/assets/pictures/`. Keep full-resolution originals separately and publish web-sized copies. The mouse logo lives under `src/assets/images/site/`.

## Preview it on your Mac

You need [Node.js](https://nodejs.org/) (version 20 or newer) installed once. Then, in Terminal:

```
cd ~/Documents/GitHub/aqaenglishrevision
npm install        # first time only
npm start -- --output=/private/tmp/aqaenglishrevision-preview
```

Open [localhost:8080](http://localhost:8080), or use the address Eleventy prints. Pages reload when you save. Press `Control+C` to stop. The temporary output path preserves the existing `_site/` folder.

For a local production build, run `npm run build -- --output=/private/tmp/aqaenglishrevision-build`. The GitHub Actions workflow builds into `_site/` in its own checkout.

## Where things live

| What | Where |
|---|---|
| Page content | `src/…` — the folder path matches the web address, e.g. `src/macbeth/plot.html` is `/macbeth/plot`, and `src/macbeth/index.html` is `/macbeth` |
| The contents column for each text (and the pages in it) | `src/_data/nav.json` |
| The main menu order, each section's label and its colour "world" | `src/_data/sections.json` |
| Site name, web address, footer text, visitor statistics | `src/_data/site.json` |
| Sitemap and robots.txt (made automatically) | `src/sitemap.njk`, `src/robots.njk` |
| Shared page template (header, reading settings, title plate, contents, footer) | `src/_includes/base.njk` |
| Styles / reading settings and contents script | `src/assets/css/site.css`, `src/assets/js/site.js` |
| The mouse logo | `src/assets/images/site/mouse.svg` (and `mouse-white.svg` for the dark page colour) |
| Images | Publishable illustrations in `src/assets/pictures/`, organised by section |
| Publishing workflow | `.github/workflows/deploy.yml` |

### Addresses

Page addresses use the original format, with no `.html` and no slash at the end
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
- `<section class="banner" style="--banner:url('/assets/pictures/…');--shade:0.6">` holds the page title. The template lifts it out into the coloured title plate at the top, with the banner picture showing faintly behind it. Each page should have exactly one, at the top.
- `<div class="row">` with `<div class="col" style="--span:6">` makes columns; the spans in a row add up to 12. They stack on phones.
- `<details class="drop"><summary><h3>Title</h3></summary><div class="drop-body">…</div></details>` is a drop-down box.
- `<p class="sm">` is the smaller body text; `class="tc"` centres text.
- Headings are bold by default; `class="nb"` makes one not bold.

New blocks for the redesign (use them as pages get reworked). Anything below that's marked "margin" floats into the right-hand margin, beside the paragraph that comes after it:

- `<aside class="note">…</aside>` puts an annotation in the right-hand margin, next to the paragraph that follows it. `<aside class="note word"><b>sovereign</b> a king or queen</aside>` is a word definition. `<figure class="margin"><img …><figcaption>…</figcaption></figure>` is a small margin picture. On narrower screens these become small boxes in the text instead.
- `<figure class="slot margin" data-caption="What the picture should show"></figure>` is a picture space in the margin; `<figure class="slot wide" …>` is one across the text column. When your picture is ready, swap it for `<figure class="margin"><img src="/assets/pictures/…" alt="…"></figure>`.
- `<aside class="note quote"><p>“A quotation”</p><p class="note-ref">Act 1, Scene 5</p></aside>` is a key quote in the margin (see Macbeth › Lady Macbeth for examples).
- `<aside class="margin-card">` holds a link card in the margin; `<aside class="listen">` holds an audio player.
- `<div class="tiles">` with `<div class="tile">`s is a grid of pages, each with a picture space; `<div class="card-grid">` is a grid of link cards.

The front pages (`src/index.html` and each text's `index.html`) use a few more: `front-facts` (the line of facts in the title plate), `front-split` with `main` and `side` (text with a side column), `side-quote`, `acts` (the plot strip), `cards big` / `cards small` (picture links), `link-rows` (links with a line of description), `toc` (the home page contents), `panel` and `signoff`. Copy from an existing front page rather than starting from nothing.

Add new Unseen Poetry resource links to the Practice section in `src/unseen-poetry/index.html`. The contents menu is in `src/_data/nav.json`. Staff Room uses the existing `/teachers-corner` address.

### The colour worlds

Each section has a world colour, set in `src/_data/sections.json`: fog (A Christmas Carol), blood
(Macbeth), port (An Inspector Calls), ink (Unseen Poetry), moss (Language Paper 1), slate
(Language Paper 2), navy (How to Revise and Who am I?) and study (Staff Room). The colours
themselves are near the top of `src/assets/css/site.css`.

### Pages that aren't in the menu

Some pages are deliberately left out of the menu (as they were on Google Sites) but are still
published and reachable by their address, e.g. `/unseen-poetry/growing-up`. Pages nothing links to have
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
