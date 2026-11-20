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
seoTitle: "Macbeth Plot Summary | AQA GCSE Literature"
description: "Revise Macbeth’s plot and key events for AQA GCSE English Literature."
permalink: /macbeth/plot.html   # address: /macbeth/plot
---

<section class="sec">
<div class="wrap">
<p>The easiest way to remember the plot of Macbeth is…</p>
</div>
</section>
```

The optional `seoTitle` is the complete browser-tab and suggested search-result title. It can be more descriptive than the short `title` and visible banner heading. No extra site-name suffix is added to it. Pages without `seoTitle` keep the usual `Title | AQA English Revision` format. Google may shorten or rewrite search-result titles.

Use an optional `description` for a short, accurate summary of that particular page. Google may use it beneath the search title or choose a different passage from the page. Give each published resource its own description and link to related lessons where they help readers.

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

### Placing games anywhere on the site

Normal game clicks open a player over the current page. Use the game’s close button or Escape to return to the same page and scroll position. The player loads only the selected game's markup, data and script; closing it removes the player and stops its timers. Theme-specific links keep the theme's own question bank.

To place an existing game on another page, copy its link from `src/games.html`. For example:

```html
<a class="quote-launch" href="/a-christmas-carol/key-quotes#play-fog-run">Play Fog Run</a>
```

Use as many links to the same game as you need; links do not need IDs. The lesson address before `#play-…` supplies the game's content and the lesson link shown if loading fails. A themed link such as `/a-christmas-carol/greed#play-analysis-gaps` keeps the Greed exercises. Existing lesson-page launch buttons keep working. Modified clicks and opening a link in a new tab retain the original lesson/game address.

To change the lesson link shown if loading fails without changing the game or its bank, optionally add `data-related-lesson`:

```html
<a href="/a-christmas-carol/key-quotes#play-fog-run"
   data-related-lesson="/a-christmas-carol/greed">Play Fog Run</a>
```

The shared launcher lives in `src/assets/js/game-launcher.js`, its isolated player bridge in `src/assets/js/game-player.js`, and their styles in `src/assets/css/game-launcher.css`. Register a new game in the launcher's `games` object; most games need only their lesson page, with optional script, dialog selector and external JSON data ID. The existing game templates and scripts remain the source of game behaviour. A loading failure offers retry and an explicit lesson link without changing the current page.

Picture Planner is part of the Pics & Tips lesson and retains an explicitly labelled lesson link on the Games page.

### Quotation bank

Quote Recall and Quote Builder share `src/assets/data/christmas-carol-quotes.csv`, containing one entry for each of the 63 Key Quotes master IDs. The first columns remain `quote,blanks,themes,characters,pool,tile_breaks`. Metadata columns record `quote_id`, `stave`, `voice`, `source_url` and any `source_note` needed to explain the game copy's verified wording. The original master is retained unchanged. Each blank is a correct word and three alternatives separated by pipes; separate different gaps with semicolons. An answer must occur once in its quotation. All 63 entries also provide an ordering puzzle.

The pool numbers 10, 25 and 50 are cumulative tier names rather than enforced row counts. The current pools contain 12, 30 and 63 quotations; the existing button labels are retained. Tiers are preserved for matching entries from the earlier game bank. New entries use their master essentiality levels. The mixed Theme Revision player reads this same expanded quotation bank.

### Shared paragraph coverage

Analysis Gaps, Word Formation and Essay Jigsaw each keep their own CSV and now contain the same 678 distinct model paragraphs at their original levels. Existing rows, prepared gaps, prompts, puzzle pieces and hints remain unchanged. The merge adds 150 Analysis Gaps exercises, 192 Word Formation exercises and 108 Jigsaw puzzles. The older 45-row scene-analysis file and all master paragraph files remain unchanged. New Jigsaw pieces keep quotations together and group related observations where useful; the source prose is preserved.

### Plot Quiz

Edit `src/assets/data/plot-quiz.csv` to add or change multiple-choice plot questions. Each row has a unique `id`, a `question`, the correct `answer`, three different wrong answers in `wrong1` to `wrong3`, and an optional `explanation`. The game shuffles the four choices. Plot questions retain their theme tags and are included in the mixed Theme Revision player at every ghost level.

Separate multiple tags with semicolons in `themes`, `staves` and `characters`. Theme tags match the page addresses, using `change`, `christmas`, `compassion`, `family`, `greed` and `social-injustice`. Staves use numbers 1–5. Character tags use names such as `scrooge` and `bob-cratchit`. The `source` column records where to check each question in Dickens's text.

The Plot page offers the full bank. The six theme pages use matching theme tags. Correct answers advance after three quarters of a second. Wrong answers show the explanation and wait for Next question. The game refills its shuffled question deck when it reaches the end. To add it to another page, use a launch button with `id="play-plot-quiz"`, `class="quote-launch"`, `type="button"`, `aria-haspopup="dialog"` and `aria-controls="plot-quiz"`.

### Word in Context

Edit `src/assets/data/christmas-carol-vocabulary.csv` to add or change vocabulary questions. Each row has a unique `word`, a `level` of 1, 2 or 3, a `definition`, and an `example` sentence that uses that word once. The game turns the word into a gap and offers three other words from the same level, chosen at random each time. Save the file as UTF-8 CSV. A comma inside a sentence is fine when the cell is quoted.

Each level needs at least four words. A phrase such as `direct address` is one answer, and the button shows the whole phrase. The build names the row if the word is missing, repeated, or written in a different form from the example. Correct answers advance after three quarters of a second. Wrong answers show the definition and wait for Next question. The Essays page launches the game. To add it to another page, use a launch button with `id="play-word-in-context"`, `class="quote-launch"`, `type="button"`, `aria-haspopup="dialog"` and `aria-controls="word-in-context"`.

### Fog Run

Edit `src/assets/data/fog-run.csv` for the snowy maze game. Its controller, maze, artwork, styles and template all use the `fog-run` name. Links use `#play-fog-run`.

Each row contains `word`, `level`, `type`, `clue`, optional `definition` and `source`. Levels are 1–3. The maze keeps its 100 original sentence exercises and adds Crossword clues and quotation gaps. A `sentence` or `quote` clue contains one `____` gap; a `crossword` clue can be a direct question or contain one gap. The player collects the answer while avoiding the cash boxes. Answer choices are distinct even when the bank has several clues for the same answer. Each level needs at least three different answers.

The CSV is independent of Word in Context. The optional definition is used when pausing a sentence exercise. The source column records where the content came from and is not shown in play.

### Fred’s or Dead

Edit `src/assets/data/freds-or-dead.csv` for the street game. Its controller, street, course, styles and template use `freds-or-dead`. Links use `#play-freds-or-dead`.

Each row has `word`, `level` (1 = Easy, 2 = Medium, 3 = Hard), `type` (`definition`, `character`, `quote` or `crossword`), `clue` and an optional `source`. Put one `____` gap in a quotation clue. Crossword letter counts are omitted from imported clues. An answer can have several different clues; duplicate answer/clue combinations at the same level are skipped when importing. Each level needs at least ten different answers.

The bank keeps the original 156 clues and adds Crossword clues and the remaining gap variants from the quotation bank. No additional Vocabulary definitions were imported. Both games have their own CSV, so content can be edited independently.

Each run chooses ten different answers and places them at shuffled positions. The clues use a separate order with a mixture of available clue types. Scrooge moves with Left/Right, jumps with Up/Space or a tap on the street, and can revisit any part of the street. There is no timer or automatic scrolling. A wrong collection leaves the clue and word in place. After all ten are collected, run to Fred’s door at the far right to enter the party.

Historical duplicate game files are preserved under `archive/game-renames/`, outside the published source. Edit the current files under `src/`.

### Hangman

Edit `src/assets/data/christmas-carol-hangman.csv`. This is a separate list from Word in Context. Each row has a `word`, a `level` of 1, 2 or 3, and an optional `definition`. The word column is what the player spells. A short quotation goes in that same column: add the line and it is included. Letters are guessed. Spaces, hyphens and punctuation stay on screen. Each level needs at least one row. Each wrong letter draws more fog over the nightcap mouse. Seven wrong guesses lose the round. Solving the word clears the fog and restores the mouse. Hint shows the definition for the current row, when that cell has one. The build names the row if the word is missing, repeated, or has no letters. The Essays page launches the game. To add it to another page, use a launch button with `id="play-hangman"`, `class="quote-launch"`, `type="button"`, `aria-haspopup="dialog"` and `aria-controls="hangman"`.

### Crossword

Edit `src/assets/data/christmas-carol-crossword.csv`. This is a separate list from the vocabulary bank. Each row is a `word` and a `clue`. Use letters only, with no spaces or hyphens, because each letter is one square. Opening the game deals a crossword of up to eight words from that list, and New deals another. Letter fills one missing letter in the selected word. The build names a row if the word is missing, repeated, or shares no letters with the rest of the list. The Essays page launches the game. To add it to another page, use a launch button with `id="play-crossword"`, `class="quote-launch"`, `type="button"`, `aria-haspopup="dialog"` and `aria-controls="crossword"`.

### Connecting Wall

Edit `src/assets/data/christmas-carol-wall.csv` to add categories. Each row has a unique `id`, a `level` (1 = Easy, 2 = Mid, 3 = Hard), a `group` name, at least four numbered word columns (`word1`, `word2`, and so on), and an optional `explanation`. Larger pools provide different four-word samples. Words may appear in several categories; the generator selects four compatible pools and displays only words belonging to exactly one of them. The selected level comes first, with nearby levels used if needed. The build reports invalid rows or a bank that cannot supply a complete wall.

Select four tiles to check a group automatically. Correct groups reveal their names and move to the top; wrong guesses allow another attempt. The last group completes automatically after three are found. Shuffle moves the remaining tiles, Show a group reveals one, Restart resets the same wall, and New wall draws another. The optional three-minute timer can be paused and does not end play when time expires. Completing a wall makes its explanations available. The Essays page and Games page launch the game. To add it elsewhere, use `id="play-connecting-wall"`, `class="quote-launch"`, `type="button"`, `aria-haspopup="dialog"` and `aria-controls="connecting-wall"` on its launch button.

Run `node --test tools/connecting-wall.test.mjs` to check generation, overlapping memberships and level selection.

### Wordsearch

Wordsearch uses the Level 1 entries in `src/assets/data/christmas-carol-crossword.csv`. Words must have 2–10 letters to fit the 10 × 10 board. Each new grid chooses eight different answers and uses horizontal, vertical and diagonal placements in both directions. The generator balances direction families and favours placements that cross at shared letters, trying new layouts for a connected puzzle. The landscape popup puts the grid on the right and a word box on the left. Reveal adds one puzzle word at a time to that box without marking it as found. Found words appear there automatically with a tick. New grid clears the box. On narrow phones the box sits above the grid. Clue highlights the first letter of a word still to find and gives its row and column. The hint stays until that word is found, another clue is requested, or a new grid is dealt. Drag across a word with a mouse or finger; found words stay highlighted. With a keyboard, use the arrow keys and press Space or Enter at the first and last letters. Escape cancels a selection. New grid deals another puzzle. The generator avoids creating extra unselected words from the eligible bank in the filler letters, and recognisable embedded words such as BELL in BELLE are included in the eight answers. The Essays page launches the game, and the Games page links to it. To add it elsewhere, include a button with `id="play-wordsearch"`, `class="quote-launch"`, `type="button"`, `aria-haspopup="dialog"` and `aria-controls="wordsearch"`.

### Word Formation

Edit [the Word Formation bank](src/assets/data/christmas-carol-word-formation.csv) independently of Analysis Gaps and the master paragraph files in `assets-folder-bank/`. The bank contains all 678 shared model paragraphs: 238 at `Foundation`, 249 at `Intermediate` and 191 at `Advanced`, including its original exercises and the older Analysis Gaps, Essay Jigsaw and scene-analysis models. Eleventy validates and embeds this CSV when building the site.

Each row uses `level,paragraph,stem1,stem2,stem3,stem4,alternatives1,alternatives2,alternatives3,alternatives4,themes`. Mark four complete answers within `paragraph` using `[[double brackets]]`, keeping the model paragraph's correct wording. Enter the corresponding prompt words in `stem1` to `stem4`, in the order the marked answers appear. Each prompt must differ from its answer. For example, `his [[kindness]]` can use the stem `kind`. Leave alternative cells blank unless another form also fits that gap; separate multiple accepted single-word forms with semicolons. Answers ignore case, surrounding spaces and straight/curly apostrophe differences. The completed paragraph always displays the model's original wording.

Keep exercises at all three levels and save as UTF-8 CSV. The loader reports invalid levels, missing prompts or markers, partial-word gaps and malformed alternatives with their CSV row numbers. Analysis Gaps now has five columns (`level,paragraph,extra1,extra2,themes`); its former `formation` column has moved into this game's own bank.

The `themes` column contains one or more of `Change`, `Christmas`, `Compassion`, `Family`, `Greed` and `Social Injustice`, separated by semicolons. The loader also accepts lowercase theme slugs and exports normalised slugs for filtering. It names the row for blank, unknown or repeated tags. Older Word Formation banks without the themes column remain supported.

### Paragraph games

Edit [the Essay Jigsaw bank](src/assets/data/paragraph-games/build-the-paragraph.csv) in a spreadsheet or text editor. Each row is one model paragraph. Set `level` to `Foundation`, `Intermediate` or `Advanced`; the game lets students choose between the levels present in the bank. A bank without a `level` column still runs as a single set.

Enter the question and put the puzzle pieces in their correct order across `sentence1`, `sentence2` and the following columns. A piece can contain more than one sentence: keep related word analysis together where separating it would permit interchangeable orders. Keep a complete quotation within the same piece. Leave unused cells blank and add further numbered columns for longer paragraphs. The matching `hint1`, `hint2` and other hint cells are optional, as is `explanation`, which appears after a solve. Save the file as UTF-8 CSV. Eleventy reads this game’s bank when it builds the page.

The Jigsaw bank also has a `themes` column, using the same semicolon-separated theme names as Word Formation. Rows can belong to more than one theme. Banks without this column remain supported; when present, every row must have valid theme tags.

The paragraph files in `assets-folder-bank/` remain editable master copies. Essay Jigsaw uses its own CSV, so changing its questions, levels or hints does not alter the master paragraphs or another game’s bank.

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

### Mixed Theme Revision selection

Revise This Theme mixes the following existing sources in one game window, using the selected theme and ghost:

- Analysis Gaps, Corrections (Word Formation) and Essay Jigsaw: match both theme and level.
- Vocabulary: match the level; vocabulary is available across all themes. Past uses an existing shorter example when the bank provides one (`fog_easy_example`), falling back to the normal example otherwise. Word levels remain those assigned in the source bank.
- Quotations: Past uses the Top 10, Present the Top 25, and Yet-to-Come the Big 50, filtered by theme. These are cumulative pools (`pool <= 10`, `pool <= 25`, `pool <= 50`).
- Plot and context questions: match the theme and allow them at every level.

The session rotates between quote gaps, quotation tiles, plot questions, context questions, Analysis Gaps, Corrections, vocabulary and Essay Jigsaw. It samples each available format once per rotation and draws exercises without replacement within each format before refilling that deck. Check submits an exercise. Fully correct exercises advance automatically after 500 ms; wrong or partially correct exercises remain visible until Next is selected. Skip moves on without scoring an unfinished exercise. The rotation continues indefinitely as each format’s deck refills. Skip, ghost changes and closing the window cancel any pending automatic advance. Accuracy counts checked answers, including individual gaps in multi-gap exercises. Changing ghosts starts a fresh session at that level.

The original CSVs and JSON remain the sources; edits feed both the standalone games and mixed revision. The builder is `tools/read-theme-revision-bank.js`, the window is `src/_includes/theme-revision.njk`, and its controller and rendering modules use the `theme-revision` prefix in `src/assets/js/`. Jigsaw and Corrections keep their theme tags in their own banks. No duplicate question bank is maintained.

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

Visitor statistics use [GoatCounter](https://www.goatcounter.com/) without analytics cookies.
The dashboard is [mrstep.goatcounter.com](https://mrstep.goatcounter.com/); sign in with the owner's account.
The site code is `"goatcounter": "mrstep"` in `src/_data/site.json`. Leave it empty (`""`) to switch statistics off.

Statistics start when this configuration is published; earlier visits cannot be recovered.
The loader (`src/assets/js/analytics.js`) counts pages only on the live domain, skips embedded frames,
and respects a browser's exclusion choice. Local previews, the privacy page and 404 pages are not counted.
Games and answers are not tracked as events. In GoatCounter, leave collection of individual pageviews
disabled so reports remain aggregate statistics.

Use the dashboard's date range and page list to see visits over time and which resources are used.
Visits are estimates, not an exact count of different people; repeat visits and blocked scripts affect totals.
Do not add up individual page counts to calculate the number of people visiting the whole site.

To exclude your own browsing while editing, open `/privacy` on the live site and select
"Exclude my visits from visitor statistics". Do this in each browser you use. Visitors have the same
choice through the footer's privacy link. Clearing site data resets this browser preference.

After publishing, open a revision page once in a browser that is not excluded and check that its visit
appears in GoatCounter. If it does not, check whether an ad blocker is blocking the statistics script.

## How this was made

`tools/convert_google_sites.py` converted the Google Sites export (kept outside this repository) into
the files in `src/`. It was a one-off: from now on, edit the files in `src/` directly. Re-running the
converter would overwrite your edits.
