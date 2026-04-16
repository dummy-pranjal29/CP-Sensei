console.log("CP Sensei background service worker started");

chrome.runtime.onInstalled.addListener(() => {
  console.log("CP Sensei installed successfully");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "PROBLEM_DETECTED") {
    console.log("[CP Sensei BG] Problem received:", message.payload);

    sendResponse({
      success: true,
      message: "Problem received",
    });
  } else {
    sendResponse({
      success: false,
      message: "Unknown message type",
    });
  }

  return true;
});
