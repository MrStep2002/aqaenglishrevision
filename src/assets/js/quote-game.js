document.querySelectorAll('.quote-game[data-quotes], .quote-game[data-questions], .quote-game[data-question-bank]').forEach(dialog => {
  const launcher = document.getElementById('play-' + dialog.id);
  const status = dialog.querySelector('.quote-status[role="status"]');
  const meter = dialog.querySelector('meter');
  const percent = dialog.querySelector('.quote-percent');
  const prompt = dialog.querySelector('.quote-prompt');
  const options = dialog.querySelector('.quote-options');
  const mode = dialog.querySelector('.quote-mode');
  const form = dialog.querySelector('.quote-type');
  const input = form?.querySelector('input');
  const feedback = dialog.querySelector('.quote-feedback');
  const next = dialog.querySelector('.quote-next');
  const questionBank = dialog.querySelector('.quiz-bank');

  const { theme } = dialog.dataset;
  const poolButtons = [...dialog.querySelectorAll('[data-pool]')];
  const useQuotePools = poolButtons.length > 0;
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
    const columns = header.replaceAll('"', '').split(',');
    if (columns.slice(0, 5).join(',') !== 'quote,blanks,themes,characters,pool') throw new Error('Unexpected quote CSV header');

    return lines.filter(line => line.trim()).map(line => {
      const fields = [...line.matchAll(/(?:^|,)("(?:[^"]|"")*"|[^",]*)(?=,|$)/g)];
      if (fields.length !== columns.length || fields.map(match => match[0]).join('') !== line) {
        throw new Error('Invalid quote CSV row');
      }
      const [quote, blankGroups, themes, characters, tier] = fields.map(([, value]) =>
        value.replace(/^"|"$/g, '').replaceAll('""', '"')
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
    const typed = mode?.querySelector('input:checked')?.value === 'type';
    options.hidden = !takingTurn || typed;
    if (form) {
      form.hidden = !takingTurn || !typed;
      if (!form.hidden && dialog.open) input.focus();
    }
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
    if (input) input.value = '';
    showAnswerMode();
    if ((!form || form.hidden) && dialog.open) prompt.focus();
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
    const { answer, accepted = [], quote, isContext, explanation } = round[index];
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
    if (!correct && explanation) feedback.textContent += ' ' + explanation;
    showAnswerMode();
    if (correct) {
      prompt.focus();
      advanceTimer = setTimeout(advance, Number(dialog.dataset.advanceDelay || 1000));
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
      const [quoteItems, questions] = await Promise.all([
        loadBank(dialog.dataset.quotes, async response => readQuotes(await response.text())),
        questionBank ? JSON.parse(questionBank.textContent) : loadBank(dialog.dataset.questions, response => response.json()),
      ]);
      const questionItems = questions.map(({ question, choices, accepted, themes, explanation }) => ({
        quote: question,
        isContext: true,
        themes,
        blanks: [{ answer: choices[0], choices, accepted, explanation }],
      }));
      const loaded = [...quoteItems, ...questionItems].filter(item => !theme || item.themes?.includes(theme));
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

  function openGame() {
    launcher.focus({ preventScroll: true });
    dialog.showModal();
    if (!quotes && !status.textContent) loadRound();
    else if (quotes) showAnswerMode();
  }
  launcher.addEventListener('click', openGame);

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

  mode?.addEventListener('change', showAnswerMode);
  form?.addEventListener('submit', event => {
    event.preventDefault();
    if (input.value.trim()) check(input.value);
  });
  next.addEventListener('click', () => {
    if (!quotes) loadRound();
    else advance();
  });
});
