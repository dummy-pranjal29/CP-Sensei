function waitForElement(selector, callback, timeout = 5000) {
  const existing = document.querySelector(selector);
  if (existing) {
    callback(existing);
    return;
  }

  const observer = new MutationObserver(() => {
    const element = document.querySelector(selector);

    if (element) {
      observer.disconnect();
      callback(element);
    }
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  setTimeout(() => {
    observer.disconnect();
  }, timeout);
}

function extractFromCodeforces() {
  const titleEl = document.querySelector(".title");
  const timeEl = document.querySelector(".time-limit");
  const statementEl = document.querySelector(".problem-statement");

  const titleFromDOM = titleEl ? titleEl.innerText.trim() : null;
  const problemCode = new URLSearchParams(window.location.search).get("problemCode");
  const title = titleFromDOM || problemCode || null;
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

function extractFromLeetcode(callback) {
  waitForElement("[data-track-load='description_content']", () => {
    const titleEl = document.querySelector(".text-title-large");
    const difficultyEl = document.querySelector("[class*='difficulty']");
    const statementEl = document.querySelector(
      "[data-track-load='description_content']",
    );

    const titleFromDOM = titleEl ? titleEl.innerText.trim() : null;
    const titleFromPage = document.title.replace("- LeetCode", "").trim();
    const title = titleFromDOM || titleFromPage || null;

    const difficulty = difficultyEl ? difficultyEl.innerText.trim() : null;
    const statement = statementEl ? statementEl.innerText.trim() : null;

    callback({
      platform: "leetcode",
      title,
      difficulty,
      statement,
      url: window.location.href,
    });
  });
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

function extractProblemData(platform, callback) {
  switch (platform) {
    case "codeforces":
      callback(extractFromCodeforces());
      break;
    case "leetcode":
      extractFromLeetcode(callback);
      break;
    case "geeksforgeeks":
      callback(extractFromGeeksforGeeks());
      break;
    default:
      callback(null);
  }
}

window.__cpExtractProblem = extractProblemData;
