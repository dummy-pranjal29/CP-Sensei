console.log("🚀 CP Sensei background service worker started");

// Optional: listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log("✅ CP Sensei installed successfully");
});

// Future: message passing, API calls, hint engine trigger
