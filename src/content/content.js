function sendProblemToBackground(problemData) {
  chrome.runtime.sendMessage(
    {
      type: "PROBLEM_DETECTED",
      payload: problemData,
    },
    (response) => {
      console.log("[CP Sensei] BG response:", response);
    },
  );
}

function bootstrap() {
  window.__cpSenseiInit();

  const platform = window.__cpDetectPlatform();
  console.log("[CP Sensei] Platform:", platform);

  if (!platform) return;

  const problemData = window.__cpExtractProblem(platform);
  console.log("[CP Sensei] Problem:", problemData);

  sendProblemToBackground(problemData);
}

document.readyState === "loading"
  ? document.addEventListener("DOMContentLoaded", bootstrap)
  : bootstrap();
