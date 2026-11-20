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

You need [Node.js](https://nodejs.org/) (version 20 or newer) installed once.

1. Press **Command + Space**, type **Terminal**, and press **Return**.
2. Paste this command into Terminal and press **Return** to open the site folder.

   ```sh
   cd ~/Documents/GitHub/aqaenglishrevision
   ```

3. On your first run, enter `npm install` and wait for it to finish.
4. Start the preview server.

   ```sh
   npm start -- --output=/private/tmp/aqaenglishrevision-preview
   ```

5. Keep Terminal running and open [the site preview](http://localhost:8080/) in your browser. To try the game, open [A Christmas Carol → Key Quotes](http://localhost:8080/a-christmas-carol/key-quotes.html) and click **Play Quote Recall**. If Terminal prints a different port, use the address it prints.

Pages reload when you save. To stop the preview, return to Terminal and press **Control + C**. The temporary output path preserves the existing `_site/` folder.

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
- `<section class="lesson-section" aria-labelledby="topic"><h2 id="topic" tabindex="-1">Topic</h2>…</section>` is an always-visible section with a link in the Contents menu. Use a unique heading ID on each page.
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

### Plot Quiz

Edit `src/assets/data/plot-quiz.csv` to add or change multiple-choice plot questions. Each row has a unique `id`, a `question`, the correct `answer`, three different wrong answers in `wrong1` to `wrong3`, and an optional `explanation`. The game shuffles the four choices.

Separate multiple tags with semicolons in `themes`, `staves` and `characters`. Theme tags match the page addresses, using `change`, `christmas`, `compassion`, `family`, `greed` and `social-injustice`. Staves use numbers 1–5. Character tags use names such as `scrooge` and `bob-cratchit`. The `source` column records where to check each question in Dickens's text.

The Plot page offers the full bank. The six theme pages use matching theme tags. Correct answers advance after three quarters of a second. Wrong answers show the explanation and wait for Next question. The game refills its shuffled question deck when it reaches the end. To add it to another page, use a launch button with `id="play-plot-quiz"`, `class="quote-launch"`, `type="button"`, `aria-haspopup="dialog"` and `aria-controls="plot-quiz"`.

### Word in Context

Edit `src/assets/data/christmas-carol-vocabulary.csv` to add or change vocabulary questions. Each row has a unique `word`, a `level` of 1, 2 or 3, a `definition`, and an `example` sentence that uses that word once. The game turns the word into a gap and offers three other words from the same level, chosen at random each time. Save the file as UTF-8 CSV. A comma inside a sentence is fine when the cell is quoted.

Each level needs at least four words. A phrase such as `direct address` is one answer, and the button shows the whole phrase. The build names the row if the word is missing, repeated, or written in a different form from the example. Correct answers advance after three quarters of a second. Wrong answers show the definition and wait for Next question. The Essays page launches the game. To add it to another page, use a launch button with `id="play-word-in-context"`, `class="quote-launch"`, `type="button"`, `aria-haspopup="dialog"` and `aria-controls="word-in-context"`.

### Fog Run

Edit `src/assets/data/fog-run.csv` to change Fog Run's words and clues. This is its own bank, separate from Word in Context and Marley's Chase. Each row has a unique `word`, a `level` (1 = Easy, 2 = Medium, 3 = Hard), a `definition` used for Find the word clues, and an `example` used for Complete the sentence clues. Keep both clues short for the game board. Write the answer word once in the example sentence; the game replaces it with a gap. Every row is available at its chosen level, with the other answer choices drawn from that same level. Each level needs at least three words. The starting bank contains the 90 words previously available in Fog Run, with Easy's shorter examples copied across. Add or edit rows and save as UTF-8 CSV. The site rebuilds when this file changes during local development.

### Hangman

Edit `src/assets/data/christmas-carol-hangman.csv`. This is a separate list from Word in Context. Each row has a `word`, a `level` of 1, 2 or 3, and an optional `definition`. The word column is what the player spells. A short quotation goes in that same column: add the line and it is included. Letters are guessed. Spaces, hyphens and punctuation stay on screen. Each level needs at least one row. Each wrong letter draws more fog over the nightcap mouse. Seven wrong guesses lose the round. Solving the word clears the fog and restores the mouse. Hint shows the definition for the current row, when that cell has one. The build names the row if the word is missing, repeated, or has no letters. The Essays page launches the game. To add it to another page, use a launch button with `id="play-hangman"`, `class="quote-launch"`, `type="button"`, `aria-haspopup="dialog"` and `aria-controls="hangman"`.

### Crossword

Edit `src/assets/data/christmas-carol-crossword.csv`. This is a separate list from the vocabulary bank. Each row is a `word` and a `clue`. Use letters only, with no spaces or hyphens, because each letter is one square. Opening the game deals a crossword of up to eight words from that list, and New deals another. Letter fills one missing letter in the selected word. The build names a row if the word is missing, repeated, or shares no letters with the rest of the list. The Essays page launches the game. To add it to another page, use a launch button with `id="play-crossword"`, `class="quote-launch"`, `type="button"`, `aria-haspopup="dialog"` and `aria-controls="crossword"`.

### Connecting Wall

Edit `src/assets/data/christmas-carol-wall.csv` to add categories. Each row has a unique `id`, a `level` (1 = Easy, 2 = Mid, 3 = Hard), a `group` name, at least four numbered word columns (`word1`, `word2`, and so on), and an optional `explanation`. Larger pools provide different four-word samples. Words may appear in several categories; the generator selects four compatible pools and displays only words belonging to exactly one of them. The selected level comes first, with nearby levels used if needed. The build reports invalid rows or a bank that cannot supply a complete wall.

Select four tiles to check a group automatically. Correct groups reveal their names and move to the top; wrong guesses allow another attempt. The last group completes automatically after three are found. Shuffle moves the remaining tiles, Show a group reveals one, Restart resets the same wall, and New wall draws another. The optional three-minute timer can be paused and does not end play when time expires. Completing a wall makes its explanations available. The Essays page and Games page launch the game. To add it elsewhere, use `id="play-connecting-wall"`, `class="quote-launch"`, `type="button"`, `aria-haspopup="dialog"` and `aria-controls="connecting-wall"` on its launch button.

Run `node --test tools/connecting-wall.test.mjs` to check generation, overlapping memberships and level selection.

### Paragraph games

Edit [the Build the Paragraph bank](src/assets/data/paragraph-games/build-the-paragraph.csv) in a spreadsheet or text editor. Each row is one paragraph. Enter the question and put the sentences in their correct order across `sentence1`, `sentence2` and the following columns. Leave unused sentence cells blank. Add `sentence7` and further numbered columns for longer paragraphs. The corresponding `hint1`, `hint2` and other hint cells are optional, as is `explanation`, which appears after a solve. Save the file as UTF-8 CSV. Eleventy reads the bank when it builds the page.

For another text or game, copy the CSV in `src/assets/data/paragraph-games/` and add an entry to the page's front matter.

```yaml
paragraphGames:
  - id: macbeth-paragraphs
    title: Macbeth Paragraph Builder
    bank: macbeth.csv
```

Add a launch button whose ID starts with `play-` followed by that game's ID.

```html
<button id="play-macbeth-paragraphs" class="quote-launch" type="button"
        aria-haspopup="dialog" aria-controls="macbeth-paragraphs">Play Macbeth Paragraph Builder</button>
```

The frame uses the section's colours by default. Add `skin: christmas` for the red and green border with holly. The dialog uses the configured ID, so you can target it with CSS for a custom skin. Multiple games can share a page by giving each entry and launch button its own ID.

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
