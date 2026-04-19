console.log("CP Sensei background service worker started");

const BACKEND_URL = "http://localhost:3000";

let storedProblem = null;
let currentLevel = 1;

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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "PROBLEM_DETECTED") {
    console.log("[CP Sensei BG] Problem received:", message.payload);
    storedProblem = message.payload;
    currentLevel = 1;
    sendResponse({ success: true });
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
        sendResponse({ success: true, analysis: data.analysis });
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
