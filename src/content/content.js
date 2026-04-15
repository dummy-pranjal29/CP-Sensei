function bootstrap() {
  window.__cpSenseiInit();

  const platform = window.__cpDetectPlatform();
  console.log("[CP Sensei] Platform:", platform);

  if (!platform) return;

  const problemData = window.__cpExtractProblem(platform);
  console.log("[CP Sensei] Problem:", problemData);
}

document.readyState === "loading"
  ? document.addEventListener("DOMContentLoaded", bootstrap)
  : bootstrap();
