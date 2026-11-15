(() => {
  const dialog = document.querySelector(".earnings-dialog");
  const launch = document.getElementById("play-earnings-game");
  launch.addEventListener("click", () => dialog.showModal());
  const game = document.querySelector(".earnings-game");
  const form = game.querySelector("form");
  const inputs = [...form.querySelectorAll("input")];
  const results = [...game.querySelectorAll("[data-target]")];
  const options = [...dialog.querySelectorAll(".earnings-options button")];
  const feedback = document.getElementById("earnings-feedback");
  const numbers = new Intl.NumberFormat("en-GB");
  let source = inputs[0];

  function readPence(input) {
    const match = input.value.trim().match(/^£?\s*(?:(\d+|\d{1,3}(?:,\d{3})+)(?:\.(\d{0,2}))?|\.(\d{1,2}))$/);
    if (!match) return 0n;
    const pounds = (match[1] || "0").replaceAll(",", "");
    const pence = (match[2] || match[3] || "").padEnd(2, "0");
    return BigInt(pounds) * 100n + BigInt(pence);
  }

  function formatPay(pence) {
    const pounds = numbers.format(pence / 100n);
    const remainder = pence % 100n;
    return remainder ? pounds + "." + String(remainder).padStart(2, "0") : pounds;
  }

  form.addEventListener("input", ({ target }) => {
    source.removeAttribute("aria-invalid");
    source.removeAttribute("aria-describedby");
    source = target;
    feedback.hidden = true;
    const pay = readPence(source);
    const period = BigInt(source.dataset.days);
    for (const input of inputs) {
      if (input === source) continue;
      const converted = (pay * BigInt(input.dataset.days) + period / 2n) / period;
      input.value = pay ? formatPay(converted) : "";
    }
    for (const option of options) option.disabled = true;
    for (const result of results) {
      if (result.textContent !== "—") result.textContent = "—";
    }
  });

  function showResults(pay) {
    const period = BigInt(source.dataset.days);
    const active = options.filter(option => option.getAttribute("aria-pressed") === "true");
    const monthlyCosts = active.reduce((total, option) => total + BigInt(option.dataset.cost || 0), 0n);
    const applyTax = active.some(option => option.hasAttribute("data-tax"));
    // Work with exact fractions through to the final rounding to a whole day.
    const availablePay = pay * 30n - monthlyCosts * period;
    feedback.textContent = availablePay <= 0n ? "These costs leave no earnings to put towards the targets." : "";
    feedback.hidden = availablePay > 0n;

    for (const result of results) {
      if (availablePay <= 0n) {
        result.textContent = "Cannot reach";
        continue;
      }
      const target = BigInt(result.dataset.target) * 100n * period * 30n;
      const numerator = applyTax ? target * 6n : target;
      const denominator = applyTax ? availablePay * 5n : availablePay;
      const days = (numerator + denominator - 1n) / denominator;
      const years = days / 365n;
      const remaining = days % 365n;
      result.textContent = numbers.format(years) + (years === 1n ? " year" : " years") +
        " and " + numbers.format(remaining) + (remaining === 1n ? " day" : " days");
    }
  }

  for (const option of options) {
    option.addEventListener("click", () => {
      option.setAttribute("aria-pressed", option.getAttribute("aria-pressed") !== "true");
      showResults(readPence(source));
    });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const pay = readPence(source);
    if (!pay) {
      feedback.textContent = "Enter an amount above £0, with up to two decimal places.";
      feedback.hidden = false;
      source.setAttribute("aria-invalid", "true");
      source.setAttribute("aria-describedby", feedback.id);
      source.focus();
      return;
    }

    for (const option of options) option.disabled = false;
    showResults(pay);
  });
})();
