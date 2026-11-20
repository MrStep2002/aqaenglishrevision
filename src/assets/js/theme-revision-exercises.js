import { normalise, shuffle } from './theme-revision-session.js?v=2';

export function renderExercise(container, round, controls) {
  const doc = container.ownerDocument;
  const element = (tag, className, text) => {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const button = (className, text, click) => {
    const node = element('button', className, text);
    node.type = 'button';
    node.addEventListener('click', click);
    return node;
  };
  const note = text => { if (text) container.append(element('p', 'theme-note', text)); };
  const mark = (answer, typed, correct) => {
    const node = element('span', correct ? 'theme-right' : 'theme-wrong');
    if (!correct) node.append(element('del', '', typed), ' ');
    node.append(answer);
    return node;
  };

  if (round.choices) {
    const prompt = element(round.kind === 'quote-gap' ? 'blockquote' : 'p', 'theme-question', round.kind === 'quote-gap' ? '“' + round.prompt + '”' : round.prompt);
    prompt.tabIndex = -1;
    const choices = element('div', 'theme-choices');
    choices.setAttribute('role', 'group');
    choices.setAttribute('aria-label', 'Answer choices');
    let selected, finished = false;
    const buttons = round.choices.map(choice => button('', choice, () => {
      if (finished) return;
      selected = choice;
      controls.submit();
    }));
    choices.append(...buttons);
    container.append(prompt, choices);
    return {
      focus: prompt,
      check() {
        if (finished || selected === undefined) return null;
        finished = true;
        const correct = normalise(selected) === normalise(round.answer);
        buttons.forEach(node => {
          node.disabled = true;
          if (normalise(node.textContent) === normalise(round.answer)) node.dataset.correct = 'true';
          else if (node.textContent === selected) node.dataset.correct = 'false';
        });
        if (round.kind === 'quote-gap') prompt.textContent = '“' + round.item.quote + '”';
        if (round.kind === 'vocabulary') prompt.textContent = round.completedPrompt || round.item.example;
        note(round.item.explanation || (round.kind === 'vocabulary' ? round.item.definition : ''));
        return { correct, correctCount: Number(correct), total: 1, message: correct ? 'Correct!' : 'The answer is “' + round.answer + '”.' };
      },
    };
  }

  if (round.kind === 'quote-order' || round.kind === 'jigsaw') {
    const isParagraph = round.kind === 'jigsaw';
    const pieces = isParagraph ? round.item.sentences : round.item.tiles;
    const prompt = element('h3', 'theme-question', isParagraph ? round.item.question : '');
    prompt.tabIndex = -1;
    if (!isParagraph) prompt.hidden = true;
    const answer = element('div', 'theme-answer');
    answer.setAttribute('role', 'group');
    answer.setAttribute('aria-label', isParagraph ? 'Your paragraph' : 'Your quotation');
    const placeholder = element('p', 'theme-placeholder', isParagraph ? 'Your paragraph' : 'Your quotation');
    answer.append(placeholder);
    const bank = element('div', 'theme-tiles');
    bank.setAttribute('role', 'group');
    bank.setAttribute('aria-label', 'Available pieces');
    let finished = false;
    const placed = () => [...answer.querySelectorAll('button')];
    const update = () => {
      placeholder.hidden = placed().length > 0;
      controls.ready(bank.querySelectorAll('button').length === 0);
    };
    const order = shuffle(pieces.map((_, index) => index));
    if (order.every((index, position) => pieces[index] === pieces[position])) order.push(order.shift());
    const tiles = order.map(index => {
      const node = button('theme-piece', pieces[index], () => {
        if (finished) return;
        const returning = node.parentElement === answer;
        const neighbour = node.nextElementSibling;
        (returning ? bank : answer).append(node);
        node.setAttribute('aria-label', (returning ? 'Add: ' : 'Return: ') + pieces[index]);
        controls.message('');
        update();
        const following = neighbour || bank.querySelector('button');
        if (following) following.focus({ preventScroll: true });
        else controls.focusCheck();
      });
      node.dataset.position = String(index);
      node.setAttribute('aria-label', 'Add: ' + pieces[index]);
      return node;
    });
    bank.append(...tiles);
    container.append(prompt, answer, bank);
    return {
      focus: isParagraph ? prompt : tiles[0],
      checkLabel: 'Check order',
      hint() {
        const current = placed();
        const mismatch = current.findIndex((node, index) => node.textContent !== pieces[index]);
        const index = mismatch < 0 ? current.length : mismatch;
        if (index === pieces.length) return 'The pieces are in order. Press Check order.';
        return isParagraph ? round.item.hints[index] || 'Look for the piece that follows on from the one before it.'
          : 'The next tile is “' + pieces[index] + '”.';
      },
      check() {
        if (finished || bank.querySelectorAll('button').length) return null;
        finished = true;
        const mismatch = placed().findIndex((node, index) => node.textContent !== pieces[index]);
        const correct = mismatch < 0;
        answer.hidden = bank.hidden = true;
        container.append(element(isParagraph ? 'p' : 'blockquote', 'theme-model', pieces.join(' ')));
        if (isParagraph) note(round.item.explanation);
        return {
          correct, correctCount: Number(correct), total: 1,
          message: correct ? (isParagraph ? 'Paragraph complete!' : 'Quotation complete!')
            : 'Check piece ' + (mismatch + 1) + '. The correct ' + (isParagraph ? 'paragraph' : 'quotation') + ' is shown.',
        };
      },
    };
  }

  const item = round.item;
  const passage = element('p', 'theme-paragraph');
  container.append(passage);
  if (round.kind === 'analysis') {
    let selected = 0, end = 0, finished = false;
    const answers = item.gaps.map(() => '');
    const bank = element('div', 'theme-word-bank');
    bank.setAttribute('role', 'group');
    bank.setAttribute('aria-label', 'Words for the gaps');
    const update = () => {
      slots.forEach((node, index) => {
        node.textContent = answers[index] || '[' + (index + 1) + ']';
        node.setAttribute('aria-label', 'Gap ' + (index + 1) + ': ' + (answers[index] || 'empty'));
        node.setAttribute('aria-pressed', String(index === selected));
      });
      choices.forEach(node => { node.disabled = answers.includes(node.textContent); });
      controls.ready(!answers.includes(''));
    };
    const slots = item.gaps.map((gap, index) => {
      const node = button('theme-gap', '', () => {
        if (finished) return;
        selected = index;
        answers[index] = '';
        controls.message('');
        update();
        choices.find(choice => !choice.disabled)?.focus({ preventScroll: true });
      });
      passage.append(item.analysis.slice(end, gap.start), node);
      end = gap.start + gap.answer.length;
      return node;
    });
    passage.append(item.analysis.slice(end));
    const choices = shuffle([...item.gaps.map(gap => gap.answer), ...item.extras]).map(word => button('', word, () => {
      if (finished || !answers.includes('') || answers.includes(word)) return;
      answers[selected] = word;
      const following = answers.findIndex((value, index) => index > selected && !value);
      selected = following < 0 ? answers.indexOf('') : following;
      controls.message('');
      update();
      if (answers.includes('')) choices.find(choice => !choice.disabled)?.focus({ preventScroll: true });
      else controls.focusCheck();
    }));
    bank.append(...choices);
    container.append(bank);
    update();
    return {
      focus: slots[0], checkLabel: 'Check words',
      check() {
        if (finished || answers.includes('')) return null;
        finished = true;
        let score = 0;
        const review = element('ul', 'theme-review');
        item.gaps.forEach((gap, index) => {
          const correct = answers[index] === gap.answer;
          score += Number(correct);
          slots[index].replaceWith(mark(gap.answer, answers[index], correct));
          if (!correct) review.append(element('li', '', 'Gap ' + (index + 1) + ': ' + gap.context));
        });
        bank.hidden = true;
        if (review.children.length) container.append(review);
        return { correct: score === slots.length, correctCount: score, total: slots.length, message: score + ' of ' + slots.length + ' correct.' };
      },
    };
  }

  if (round.kind !== 'corrections') throw new Error('Unknown exercise format: ' + round.kind);
  let end = 0, finished = false;
  const update = () => {
    controls.message('');
    controls.ready(fields.every(({ input }) => input.value.trim()));
  };
  const fields = item.forms.map((form, index) => {
    const label = element('label', 'theme-formation-gap');
    const cue = element('span', 'theme-stem', form.stem.toUpperCase());
    const input = element('input');
    input.type = 'text';
    input.autocomplete = 'off';
    input.autocapitalize = 'none';
    input.spellcheck = false;
    input.enterKeyHint = index + 1 === item.forms.length ? 'done' : 'next';
    input.setAttribute('aria-label', 'Gap ' + (index + 1) + ', change ' + form.stem);
    input.addEventListener('input', update);
    input.addEventListener('keydown', event => {
      if (event.key !== 'Enter' || finished) return;
      event.preventDefault();
      if (fields[index + 1]) fields[index + 1].input.focus();
      else controls.submit();
    });
    label.append(cue, input);
    passage.append(item.analysis.slice(end, form.start), label);
    end = form.start + form.answer.length;
    return { label, input };
  });
  passage.append(item.analysis.slice(end));
  update();
  return {
    focus: fields[0].input, checkLabel: 'Check answers',
    check() {
      if (finished || fields.some(({ input }) => !input.value.trim())) return null;
      finished = true;
      let score = 0;
      item.forms.forEach((form, index) => {
        const { label, input } = fields[index];
        const correct = [form.answer, ...(form.alternatives || [])].some(value => normalise(value) === normalise(input.value));
        score += Number(correct);
        const node = mark(form.answer, input.value.trim(), correct);
        if (correct && normalise(input.value) !== normalise(form.answer)) node.title = input.value.trim() + ' also fits. The model uses ' + form.answer + '.';
        label.replaceWith(node);
      });
      return { correct: score === fields.length, correctCount: score, total: fields.length, message: score + ' of ' + fields.length + ' correct.' };
    },
  };
}
