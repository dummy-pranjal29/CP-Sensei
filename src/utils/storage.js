const STORAGE_KEY = "cpSenseiSubmissions";
const MAX_ENTRIES = 20;

async function saveSubmission(entry) {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const existing = Array.isArray(result[STORAGE_KEY]) ? result[STORAGE_KEY] : [];
  const updated = [entry, ...existing].slice(0, MAX_ENTRIES);
  await chrome.storage.local.set({ [STORAGE_KEY]: updated });
}

async function getHistory() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return Array.isArray(result[STORAGE_KEY]) ? result[STORAGE_KEY] : [];
}

window.__cpStorage = { saveSubmission, getHistory };
