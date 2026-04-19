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

async function fetchHint(problemData, level) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/hint`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ problemData, level }),
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
    fetchHint(storedProblem, currentLevel).then((hint) => {
      const level = currentLevel;
      if (currentLevel < 5) currentLevel++;
      sendResponse({
        success: true,
        hint,
        level,
      });
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
        saveSubmission({
          title: storedProblem.title,
          platform: storedProblem.platform,
          url: storedProblem.url,
          code: message.code,
          savedAt: new Date().toISOString(),
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
