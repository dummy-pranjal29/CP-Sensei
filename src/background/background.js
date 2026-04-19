console.log("CP Sensei background service worker started");

const BACKEND_URL = "http://localhost:3000";
const SUBMISSIONS_STORAGE_KEY = "cpSenseiSubmissions";

let storedProblem = null;
let currentLevel = 1;

function buildEntry(problemData) {
  const timestamp = new Date().toISOString();

  return {
    id: `${problemData.platform || "unknown"}:${problemData.url || problemData.title || timestamp}`,
    platform: problemData.platform || null,
    title: problemData.title || null,
    difficulty: problemData.difficulty || null,
    timeLimit: problemData.timeLimit || null,
    statement: problemData.statement || null,
    url: problemData.url || null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

chrome.runtime.onInstalled.addListener(() => {
  console.log("CP Sensei installed successfully");
});

function extractProfile(code, analysis) {
  const lang =
    code.includes("#include") || /vector<|class Solution\s*\{|public:|namespace std/.test(code) ? "cpp"
    : code.includes("import java") || /public\s+class|System\.out/.test(code) ? "java"
    : /def |import |print\(/.test(code) ? "python"
    : /function |const |let |var /.test(code) ? "js"
    : "unknown";

  const style = code.includes("bits/stdc++") ? "competitive"
    : code.includes("public class") ? "academic"
    : "standard";

  const usesSTL = /vector|map|set|unordered|priority_queue|stack|queue/.test(code);

  const patterns = [];
  if (/for[^;]+for/.test(code))               patterns.push("nested-loops");
  if (/while\s*\(/.test(code))                patterns.push("while-loop");
  if (/void\s+\w+\(|int\s+\w+\(/.test(code) && /return\s+\w+\(/.test(code)) patterns.push("recursion");
  if (/sort\(|\.sort\(/.test(code))           patterns.push("sorting");
  if (/unordered_map|HashMap|dict\[/.test(code)) patterns.push("hashing");
  if (/left|right|mid/.test(code))            patterns.push("binary-search");
  if (/dp\[|memo\[/.test(code))               patterns.push("dp");

  const complexityMatch = analysis.match(/O\([^)]+\)/);
  const complexity = complexityMatch ? complexityMatch[0] : null;

  const level =
    patterns.includes("dp") || patterns.includes("binary-search") ? "advanced"
    : patterns.length >= 2 || usesSTL ? "intermediate"
    : "beginner";

  return { lang, style, usesSTL, patterns, complexity, level };
}

async function fetchHint(problemData, level, profiles = []) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/hint`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ problemData, level, profiles }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    return data.hint;
  } catch (err) {
    console.error("[CP Sensei BG] Fetch error:", err.message);
    return null;
  }
}

const MAX_ENTRIES = 20;

async function saveSubmission(entry) {
  const result = await chrome.storage.local.get(SUBMISSIONS_STORAGE_KEY);
  const existing = Array.isArray(result[SUBMISSIONS_STORAGE_KEY])
    ? result[SUBMISSIONS_STORAGE_KEY]
    : [];
  const updated = [entry, ...existing].slice(0, MAX_ENTRIES);
  await chrome.storage.local.set({ [SUBMISSIONS_STORAGE_KEY]: updated });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "PROBLEM_DETECTED") {
    const entry = buildEntry(message.payload);
    console.log("[CP Sensei BG] Problem received:", entry);
    storedProblem = entry;
    currentLevel = 1;
    sendResponse({ success: true, entry });
  } else if (message.type === "GET_HINT") {
    if (!storedProblem) {
      sendResponse({
        success: false,
        message: "No problem loaded",
      });
      return;
    }
    const requestedLevel = message.level ?? currentLevel;
    chrome.storage.local.get(SUBMISSIONS_STORAGE_KEY).then((result) => {
      const history = Array.isArray(result[SUBMISSIONS_STORAGE_KEY])
        ? result[SUBMISSIONS_STORAGE_KEY]
        : [];
      const profiles = history
        .filter((s) => s.profile)
        .slice(0, 5)
        .map((s) => s.profile);

      return fetchHint(storedProblem, requestedLevel, profiles);
    }).then((hint) => {
      sendResponse({ success: true, hint, level: requestedLevel });
    });
  } else if (message.type === "ANALYZE_CODE") {
    if (!storedProblem) {
      sendResponse({
        success: false,
        error: "No problem loaded",
      });
      return;
    }

    fetch(`${BACKEND_URL}/api/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        problemData: storedProblem,
        code: message.code,
      }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`);
        return r.json();
      })
      .then((data) => {
        const profile = extractProfile(message.code, data.analysis);
        saveSubmission({
          title: storedProblem.title,
          platform: storedProblem.platform,
          url: storedProblem.url,
          code: message.code,
          savedAt: new Date().toISOString(),
          profile,
        });
        sendResponse({ success: true, analysis: data.analysis });
      })
      .catch((err) => {
        sendResponse({ success: false, error: err.message });
      });

    return true;
  } else if (message.type === "SAVE_SUBMISSION") {
    saveSubmission(message.entry)
      .then((submission) => {
        sendResponse({ success: true, submission });
      })
      .catch((err) => {
        sendResponse({ success: false, error: err.message });
      });

    return true;
  } else {
    sendResponse({
      success: false,
      message: "Unknown message type",
    });
  }

  return true;
});
