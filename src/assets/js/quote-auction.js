(() => {
  const rounds = [
    {
      question: 'How does Dickens show wealthy people dismissing poverty?',
      lots: [
        ['“Are there no prisons?”', true, 'Scrooge treats punishment as a response to poverty, refusing to consider what the people asking for help actually need.'],
        ['“decrease the surplus population”', true, '“Surplus” reduces people to an economic calculation. Scrooge uses it to dismiss the deaths of the poor.'],
        ['“solitary as an oyster”', false, 'This gives you a way into Scrooge’s isolation, but by itself it tells us little about what he thinks of the poor.'],
        ['“I am as light as a feather”', false, 'This shows Scrooge’s joy after his change. It does not directly show him dismissing poverty.'],
        ['“This boy is Ignorance. This girl is Want.”', false, 'This is useful for discussing poverty and society’s neglect. The other two quotes show Scrooge expressing that attitude himself.'],
      ],
    },
    {
      question: 'How does Dickens show that Scrooge learns to act with generosity?',
      lots: [
        ['“I’ll raise your salary”', true, 'Scrooge now shares his wealth by improving Bob’s pay. His generosity changes someone else’s material circumstances.'],
        ['“I’ll send it to Bob Cratchit’s!”', true, 'Scrooge sends the prize turkey to the Cratchits. It is an immediate and practical act of generosity.'],
        ['“Hard and sharp as flint”', false, 'This offers a useful contrast with the ending, but describes his early hardness rather than a generous act.'],
        ['“I wear the chain I forged in life.”', false, 'Marley’s warning can explain why Scrooge changes. It does not show Scrooge putting generosity into practice.'],
        ['“I will honour Christmas in my heart”', false, 'This shows the promise Scrooge makes. The two strongest choices show what he actually does to help.'],
      ],
    },
    {
      question: 'How does Dickens show that money can damage personal relationships?',
      lots: [
        ['“Another idol has displaced me”', true, 'Belle says that Scrooge has replaced her with something he worships. His pursuit of money has come between them.'],
        ['“Our contract is an old one. It was made when we were both poor”', true, 'Belle remembers an engagement made before Scrooge became wealthy. The contrast helps explain why she ends it.'],
        ['“Mankind was my business.”', false, 'Marley regrets neglecting other people. It can support a wider argument, but is less specific about a personal relationship breaking down.'],
        ['“Are there no prisons?”', false, 'This exposes Scrooge’s attitude to poverty, rather than showing how money changes a relationship.'],
        ['“God bless Us, Every One!”', false, 'Tiny Tim’s blessing shows warmth and goodwill. You would need another quotation to show money damaging a relationship.'],
      ],
    },
  ];

  const dialog = document.getElementById('quote-auction');
  const launch = document.getElementById('play-quote-auction');
  const question = dialog.querySelector('.auction-question');
  const progress = dialog.querySelector('.auction-progress');
  const lots = dialog.querySelector('.auction-lots');
  const budget = dialog.querySelector('.auction-budget');
  const reveal = dialog.querySelector('.auction-reveal');
  const result = dialog.querySelector('.auction-result');
  const next = dialog.querySelector('.auction-next');
  const bought = new Set();
  const purse = 2;
  let roundIndex = 0;
  let cards = [];

  function updateBudget() {
    const remaining = purse - bought.size;
    budget.textContent = remaining === 1 ? '1 coin left' : remaining + ' coins left';
    reveal.disabled = remaining > 0;
    cards.forEach(({ button }, index) => {
      const owned = bought.has(index);
      button.setAttribute('aria-pressed', owned);
      button.textContent = owned ? 'Return quote' : 'Buy for 1 coin';
      button.disabled = remaining === 0 && !owned;
    });
  }

  function showRound() {
    const round = rounds[roundIndex];
    bought.clear();
    progress.textContent = 'Round ' + (roundIndex + 1) + ' of ' + rounds.length;
    question.textContent = round.question;
    result.hidden = true;
    next.hidden = true;
    reveal.hidden = false;
    const shuffled = [...round.lots];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    cards = shuffled.map(([quote, direct, reason], index) => {
      const card = document.createElement('div');
      card.className = 'auction-lot';
      const text = document.createElement('blockquote');
      text.textContent = quote;
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', 'Buy or return ' + quote);
      const feedback = document.createElement('p');
      feedback.hidden = true;
      card.append(text, button, feedback);
      button.addEventListener('click', () => {
        if (bought.has(index)) bought.delete(index);
        else if (bought.size < purse) bought.add(index);
        updateBudget();
      });
      return { card, button, feedback, direct, reason };
    });
    lots.replaceChildren(...cards.map(({ card }) => card));
    updateBudget();
  }

  launch.addEventListener('click', () => {
    showRound();
    dialog.showModal();
    question.focus();
  });
  reveal.addEventListener('click', () => {
    let directPicks = 0;
    cards.forEach(({ card, button, feedback, direct, reason }, index) => {
      const owned = bought.has(index);
      if (owned && direct) directPicks++;
      card.dataset.fit = direct ? 'direct' : 'less-direct';
      button.hidden = true;
      feedback.hidden = false;
      feedback.textContent = (owned ? 'Your pick · ' : '') + (direct ? 'Direct evidence. ' : 'Less direct. ') + reason;
    });
    result.textContent = directPicks + ' of your 2 picks give the most direct evidence for this question.';
    result.hidden = false;
    reveal.hidden = true;
    next.textContent = roundIndex === rounds.length - 1 ? 'Play again' : 'Next question';
    next.hidden = false;
    result.focus();
  });
  next.addEventListener('click', () => {
    roundIndex = (roundIndex + 1) % rounds.length;
    showRound();
    question.focus();
  });
})();

(() => {
  const extract = document.getElementById('extract-evidence');
  const launch = document.getElementById('play-extract-evidence');
  if (!extract || !launch) return;
  const phrases = [...extract.querySelectorAll('[data-score]')];
  const question = extract.querySelector('.auction-question');
  const count = extract.querySelector('.evidence-count');
  const check = extract.querySelector('.auction-reveal');
  const feedback = extract.querySelector('.evidence-feedback');
  const score = feedback.querySelector('h3');
  const explanations = [...feedback.querySelectorAll('li')];
  const selected = new Set();

  function update() {
    count.textContent = selected.size + ' of 2 phrases selected';
    check.disabled = selected.size !== 2;
    phrases.forEach(phrase => {
      phrase.setAttribute('aria-pressed', selected.has(phrase));
      phrase.disabled = selected.size === 2 && !selected.has(phrase);
    });
  }

  function reset() {
    selected.clear();
    feedback.hidden = true;
    check.hidden = false;
    update();
  }

  launch.addEventListener('click', () => {
    reset();
    extract.showModal();
    question.focus();
  });
  phrases.forEach(phrase => {
    phrase.addEventListener('click', () => {
      if (selected.has(phrase)) selected.delete(phrase);
      else if (selected.size < 2) selected.add(phrase);
      update();
    });
  });
  check.addEventListener('click', () => {
    if (selected.size !== 2) return;
    const total = [...selected].reduce((sum, phrase) => sum + Number(phrase.dataset.score), 0);
    score.textContent = 'Your evidence score: ' + total + '/4';
    phrases.forEach((phrase, index) => {
      phrase.disabled = true;
      explanations[index].classList.toggle('evidence-selected', selected.has(phrase));
    });
    check.hidden = true;
    feedback.hidden = false;
    score.focus();
  });
  feedback.querySelector('.evidence-retry').addEventListener('click', () => {
    reset();
    question.focus();
  });
})();
