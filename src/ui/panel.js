const PANEL_ID = "cp-sensei-host";

function createPanelHTML() {
  return `
    <div id="cp-sensei-container">
      <div id="cp-sensei-panel" class="hidden">
        <div class="panel-header">
          <div class="panel-header-left">
            <div class="status-dot"></div>
            <div>
              <div class="panel-title">CP Sensei</div>
              <div class="panel-subtitle">AI Competitive Programming Coach</div>
            </div>
          </div>
          <button class="panel-close" id="cp-sensei-close">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="panel-body">
          <div class="panel-placeholder">
            <div class="panel-placeholder-icon">🧠</div>
            <div class="panel-placeholder-text">Analyzing problem...<br/>Your AI mentor is ready.</div>
          </div>
        </div>
        <div class="panel-footer">
          <button class="btn btn-primary" id="btn-hint">Get Hint</button>
          <button class="btn btn-ghost" id="btn-analyze">Analyze Code</button>
        </div>
      </div>

      <button id="cp-sensei-toggle">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
        </svg>
      </button>
    </div>
  `;
}

function loadCSS(shadowRoot) {
  const style = document.createElement("style");
  style.textContent = `
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    :host {
      all: initial;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    }
    #cp-sensei-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 12px;
    }
    #cp-sensei-toggle {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 24px rgba(99, 102, 241, 0.45);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      flex-shrink: 0;
    }
    #cp-sensei-toggle:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 32px rgba(99, 102, 241, 0.6);
    }
    #cp-sensei-toggle svg {
      width: 26px;
      height: 26px;
      fill: #ffffff;
    }
    #cp-sensei-panel {
      width: 340px;
      background: #0f0f13;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(99, 102, 241, 0.15);
      overflow: hidden;
      transform-origin: bottom right;
      transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease;
    }
    #cp-sensei-panel.hidden {
      transform: scale(0.85) translateY(8px);
      opacity: 0;
      pointer-events: none;
    }
    #cp-sensei-panel.visible {
      transform: scale(1) translateY(0);
      opacity: 1;
      pointer-events: all;
    }
    .panel-header {
      padding: 16px 20px;
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.1));
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .panel-header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .panel-title {
      font-size: 14px;
      font-weight: 600;
      color: #e2e8f0;
      letter-spacing: 0.01em;
    }
    .panel-subtitle {
      font-size: 11px;
      color: #6b7280;
      margin-top: 1px;
    }
    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 8px rgba(34, 197, 94, 0.6);
    }
    .panel-close {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: transparent;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #6b7280;
      transition: background 0.15s ease, color 0.15s ease;
    }
    .panel-close:hover {
      background: rgba(255, 255, 255, 0.07);
      color: #e2e8f0;
    }
    .panel-body {
      padding: 20px;
      min-height: 120px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .panel-placeholder {
      text-align: center;
    }
    .panel-placeholder-icon {
      font-size: 32px;
      margin-bottom: 10px;
    }
    .panel-placeholder-text {
      font-size: 13px;
      color: #4b5563;
      line-height: 1.5;
    }
    .panel-footer {
      padding: 12px 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      display: flex;
      gap: 8px;
    }
    .btn {
      flex: 1;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      border: none;
      transition: background 0.15s ease, transform 0.1s ease;
    }
    .btn:active {
      transform: scale(0.97);
    }
    .btn-primary {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: #ffffff;
    }
    .btn-primary:hover {
      background: linear-gradient(135deg, #5558e8, #7c4def);
    }
    .btn-ghost {
      background: rgba(255, 255, 255, 0.05);
      color: #9ca3af;
      border: 1px solid rgba(255, 255, 255, 0.07);
    }
    .btn-ghost:hover {
      background: rgba(255, 255, 255, 0.09);
      color: #d1d5db;
    }
  `;
  shadowRoot.appendChild(style);
}

function initPanel() {
  if (document.getElementById(PANEL_ID)) return;

  const host = document.createElement("div");
  host.id = PANEL_ID;
  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = createPanelHTML();
  loadCSS(shadow);
  document.body.appendChild(host);
  attachToggleListeners(shadow);
}

function attachToggleListeners(shadow) {
  const toggle = shadow.getElementById("cp-sensei-toggle");
  const panel = shadow.getElementById("cp-sensei-panel");
  const close = shadow.getElementById("cp-sensei-close");

  toggle.addEventListener("click", () => {
    panel.classList.remove("hidden");
    panel.classList.add("visible");
  });
  close.addEventListener("click", () => {
    panel.classList.remove("visible");
    panel.classList.add("hidden");
  });
}

window.__cpSenseiInit = initPanel;
