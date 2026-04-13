function bootstrap() {
  if (typeof window.__cpSenseiInit === "function") {
    window.__cpSenseiInit();
  }
}

document.readyState === "loading"
  ? document.addEventListener("DOMContentLoaded", bootstrap)
  : bootstrap();
