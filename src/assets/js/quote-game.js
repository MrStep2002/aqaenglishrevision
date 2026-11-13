(() => {
  const dialog = document.querySelector('.quote-game');
  const launch = document.querySelector('.quote-launch');
  const status = dialog.querySelector('.quote-status');
  const meter = dialog.querySelector('#quote-accuracy');
  const percent = dialog.querySelector('.quote-percent');
  const prompt = dialog.querySelector('.quote-prompt');
  const options = dialog.querySelector('.quote-options');
  const form = dialog.querySelector('.quote-type');
  const input = form.querySelector('input');
  const feedback = dialog.querySelector('.quote-feedback');
  const next = dialog.querySelector('.quote-next');

  const { theme } = dialog.dataset;
  const useQuotePools = !theme && !dialog.dataset.questions;
  const poolButtons = [...dialog.querySelectorAll('[data-pool]')];
  let pool = 10;
  let advanceTimer;

  const previousBlanks = new Map();
  let quotes;
  let round = [];
  let index = 0;
  let correctCount = 0;
  let attempts = 0;
  let answered = false;

  function shuffle(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  const normalise = word => word.trim().toLowerCase().replaceAll('’', "'");

  function readQuotes(csv) {
    // Each quote occupies one line. CSV double quotes inside fields are escaped as "".
    const [header, ...lines] = csv.trim().split(/\r?\n/);
    if (header.replaceAll('"', '') !== 'quote,blanks,themes,characters,pool') throw new Error('Unexpected quote CSV header');

    return lines.filter(line => line.trim()).map(line => {
      const fields = line.match(/("(?:[^"]|"")*"|[^",]+)(,|$)/g);
      if (!fields || fields.join('') !== line || fields.length !== 5) {
        throw new Error('Invalid quote CSV row');
      }
      const [quote, blankGroups, themes, characters, tier] = fields.map(field =>
        field.replace(/,$/, '').replace(/^"|"$/g, '').replaceAll('""', '"')
      );
      const words = [...quote.matchAll(/\p{L}+(?:[’'-]\p{L}+)*/gu)];
      const blanks = blankGroups.split(';').map(group => {
        const choices = group.split('|').map(word => word.trim());
        const [answer] = choices;
        const matches = words.filter(word => normalise(word[0]) === normalise(answer));
        if (matches.length !== 1 || choices.length !== 4 || choices.some(word => !word)
          || new Set(choices.map(normalise)).size !== 4) {
          throw new Error('Invalid blank for ' + quote);
        }
        const { index: start } = matches[0];
        return {
          answer,
          choices,
          masked: quote.slice(0, start) + '_____' + quote.slice(start + matches[0][0].length),
        };
      });
      return { quote, blanks, themes: themes.split(';'), characters: characters.split(';'), tier: Number(tier) };
    });
  }

  function showAnswerMode() {
    const takingTurn = Boolean(round[index]) && !answered;
    const typed = dialog.querySelector('input[name="quote-mode"]:checked').value === 'type';
    options.hidden = !takingTurn || typed;
    form.hidden = !takingTurn || !typed;
    if (!form.hidden && dialog.open) input.focus();
  }

  function showQuestion() {
    feedback.textContent = '';
    next.hidden = true;
    answered = false;
    const question = round[index];
    prompt.hidden = false;
    prompt.textContent = question.isContext ? question.quote : '“' + question.masked + '”';
    options.replaceChildren(...question.choices.map(choice => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = choice;
      button.addEventListener('click', () => check(choice));
      return button;
    }));
    input.value = '';
    showAnswerMode();
    if (form.hidden && dialog.open) prompt.focus();
  }

  function startRound(previousQuote) {
    const selected = shuffle(useQuotePools ? quotes.filter(quote => quote.tier <= pool) : quotes);
    if (selected.length > 1 && selected[0].quote === previousQuote) {
      [selected[0], selected[1]] = [selected[1], selected[0]];
    }
    round = selected.map(({ quote, blanks, isContext }) => {
      const alternatives = blanks.filter(blank => blank !== previousBlanks.get(quote));
      const blank = shuffle(alternatives.length ? alternatives : blanks)[0];
      previousBlanks.set(quote, blank);
      return { ...blank, quote, isContext, choices: shuffle(blank.choices) };
    });
    index = 0;
    showQuestion();
  }

  function advance() {
    const previousQuote = round[index].quote;
    index++;
    if (index === round.length) startRound(previousQuote);
    else showQuestion();
  }

  function check(guess) {
    if (answered || !round[index]) return;
    const { answer, accepted = [], quote, isContext } = round[index];
    const correct = [answer, ...accepted].some(value => normalise(value) === normalise(guess));
    attempts++;
    if (correct) correctCount++;
    const accuracy = Math.round(correctCount / attempts * 100);
    meter.value = accuracy;
    percent.textContent = accuracy + '%';

    answered = true;
    if (!isContext) prompt.textContent = '“' + quote + '”';
    feedback.textContent = correct ? 'Correct!' :
      isContext ? `The answer was “${answer}”.` : `The missing word was “${answer}”.`;
    showAnswerMode();
    if (correct) {
      prompt.focus();
      advanceTimer = setTimeout(advance, 1000);
    } else {
      next.textContent = isContext ? 'Next question' : 'Next quote';
      next.hidden = false;
      next.focus();
    }
  }

  async function loadBank(url, parse) {
    if (!url) return [];
    const response = await fetch(url);
    if (!response.ok) throw new Error('Could not fetch game content');
    return parse(response);
  }

  async function loadRound() {
    status.textContent = 'Loading questions…';
    next.hidden = true;
    try {
      const [quoteItems, contextItems] = await Promise.all([
        loadBank(dialog.dataset.quotes, async response => readQuotes(await response.text())),
        loadBank(dialog.dataset.questions, async response => (await response.json()).map(
          ({ question, choices, accepted, themes }) => ({
            quote: question,
            isContext: true,
            themes,
            blanks: [{ answer: choices[0], choices, accepted }],
          })
        )),
      ]);
      const loaded = [...quoteItems, ...contextItems].filter(item => !theme || item.themes?.includes(theme));
      if (!loaded.length) throw new Error('No matching questions');
      if (useQuotePools) {
        for (const size of [10, 25, 50]) {
          if (loaded.filter(quote => quote.tier <= size).length !== size) {
            throw new Error('Unexpected size for quote pool ' + size);
          }
        }
      }
      status.textContent = '';
      quotes = loaded;
      poolButtons.forEach(button => { button.disabled = false; });
      startRound();
    } catch (error) {
      console.error(error);
      status.textContent = 'The game content could not load. Try again.';
      next.textContent = 'Try again';
      next.hidden = false;
    }
  }

  launch.addEventListener('click', () => {
    dialog.showModal();
    if (!quotes && !status.textContent) loadRound();
    else if (quotes) showAnswerMode();
  });

  for (const button of poolButtons) {
    button.addEventListener('click', () => {
      const selected = Number(button.dataset.pool);
      if (selected === pool) return;
      clearTimeout(advanceTimer);
      pool = selected;
      for (const option of poolButtons) {
        option.setAttribute('aria-pressed', String(option === button));
      }
      startRound(round[index]?.quote);
    });
  }

  dialog.querySelector('.quote-mode').addEventListener('change', showAnswerMode);
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (input.value.trim()) check(input.value);
  });
  next.addEventListener('click', () => {
    if (!quotes) loadRound();
    else advance();
  });
})();
