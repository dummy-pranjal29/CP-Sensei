function sendProblemToBackground(problemData) {
  chrome.runtime.sendMessage(
    { type: "PROBLEM_DETECTED", payload: problemData },
    (response) => {
      console.log("[CP Sensei] BG response:", response);
    },
  );
}

function extractAndSend(platform) {
  window.__cpExtractProblem(platform, (problemData) => {
    if (!problemData) return;
    console.log("[CP Sensei] Problem:", problemData);
    sendProblemToBackground(problemData);
  });
}

function bootstrap() {
  window.__cpSenseiInit();

  const platform = window.__cpDetectPlatform();
  console.log("[CP Sensei] Platform:", platform);

  if (!platform) return;

  extractAndSend(platform);
}

function observeNavigation() {
  let lastURL = window.location.href;

  const observer = new MutationObserver(() => {
    if (window.location.href !== lastURL) {
      lastURL = window.location.href;
      const platform = window.__cpDetectPlatform();
      if (platform) extractAndSend(platform);
    }
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

bootstrap();
observeNavigation();
