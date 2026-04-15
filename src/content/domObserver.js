function extractFromCodeforces() {
  const titleEl = document.querySelector(".title");
  const timeEl = document.querySelector(".time-limit");
  const statementEl = document.querySelector(".problem-statement");

  const title = titleEl ? titleEl.innerText.trim() : null;

  let timeLimit = null;
  if (timeEl) {
    const labelEl = timeEl.querySelector(".property-title");
    const labelText = labelEl ? labelEl.innerText.trim() : "";
    timeLimit = timeEl.innerText.trim().replace(labelText, "").trim() || null;
  }

  const statement = statementEl ? statementEl.innerText.trim() : null;

  return {
    platform: "codeforces",
    title,
    timeLimit,
    statement,
    url: window.location.href,
  };
}

function extractFromLeetcode() {
  const titleEl = document.querySelector("[data-cy='question-title']");
  const difficultyEl = document.querySelector("[diff]");
  const statementEl = document.querySelector(".elfjS");

  const title = titleEl ? titleEl.innerText.trim() : null;
  const difficulty = difficultyEl ? difficultyEl.innerText.trim() : null;
  const statement = statementEl ? statementEl.innerText.trim() : null;

  return {
    platform: "leetcode",
    title,
    difficulty,
    statement,
    url: window.location.href,
  };
}

function extractFromGeeksforGeeks() {
  const titleEl = document.querySelector(".problems-page-title--title");
  const difficultyEl = document.querySelector(".difficulty-block-container");
  const statementEl = document.querySelector(".problems-page-main-description");

  const title = titleEl ? titleEl.innerText.trim() : null;
  const difficulty = difficultyEl ? difficultyEl.innerText.trim() : null;
  const statement = statementEl ? statementEl.innerText.trim() : null;

  return {
    platform: "geeksforgeeks",
    title,
    difficulty,
    statement,
    url: window.location.href,
  };
}

function extractProblemData(platform) {
  switch (platform) {
    case "codeforces":
      return extractFromCodeforces();
    case "leetcode":
      return extractFromLeetcode();
    case "geeksforgeeks":
      return extractFromGeeksforGeeks();
    default:
      return null;
  }
}

window.__cpExtractProblem = extractProblemData;
