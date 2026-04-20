let _lastVerdict = null;
let _lastSentAt = 0;
const DEDUP_MS = 4000;

function normalizeVerdict(text) {
  const t = text.toLowerCase();
  if (/accepted/.test(t) && !/wrong/.test(t)) return "AC";
  if (/wrong answer/.test(t)) return "WA";
  if (/time limit/.test(t)) return "TLE";
  if (/memory limit/.test(t)) return "MLE";
  if (/runtime error|run-time error/.test(t)) return "RE";
  if (/compilation error|compile error/.test(t)) return "CE";
  return null;
}

function sendVerdict(verdict) {
  const now = Date.now();
  if (verdict === _lastVerdict && now - _lastSentAt < DEDUP_MS) return;
  _lastVerdict = verdict;
  _lastSentAt = now;
  chrome.runtime.sendMessage({ type: "VERDICT_DETECTED", verdict, url: window.location.href }, (res) => {
    if (res?.show && window.__cpSenseiShowVerdict) {
      window.__cpSenseiShowVerdict({ verdict: res.verdict, nudge: res.nudge });
    }
  });
}

function watchLeetCode() {
  const SELECTORS = [
    "[data-e2e-locator='submission-result']",
    "[data-e2e-locator='submission-detail-status']",
    ".text-green-s",
    ".text-red-s",
  ];

  const check = () => {
    for (const sel of SELECTORS) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const verdict = normalizeVerdict(el.innerText);
      if (verdict) { sendVerdict(verdict); return; }
    }
  };

  const observer = new MutationObserver(check);
  observer.observe(document.body, { childList: true, subtree: true });
  check();
}

function watchCodeforces() {
  const check = () => {
    const accepted = document.querySelector(".verdict-accepted");
    if (accepted) { sendVerdict("AC"); return; }

    const cell = document.querySelector(".status-verdict-cell");
    if (cell) {
      const verdict = normalizeVerdict(cell.innerText);
      if (verdict) sendVerdict(verdict);
    }
  };

  const observer = new MutationObserver(check);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  check();
}

function watchGeeksForGeeks() {
  const check = () => {
    const el = document.querySelector(".verdict, [class*='verdict'], .result-box, [class*='result']");
    if (!el) return;
    const verdict = normalizeVerdict(el.innerText);
    if (verdict) sendVerdict(verdict);
  };

  const observer = new MutationObserver(check);
  observer.observe(document.body, { childList: true, subtree: true });
  check();
}

(function init() {
  const platform = window.__cpDetectPlatform?.();
  if (platform === "leetcode") watchLeetCode();
  else if (platform === "codeforces") watchCodeforces();
  else if (platform === "geeksforgeeks") watchGeeksForGeeks();
})();
