const PLATFORMS = {
  codeforces: "codeforces.com",
  leetcode: "leetcode.com",
  geeksforgeeks: "geeksforgeeks.org",
};

function detectPlatform() {
  const hostname = window.location.hostname;

  for (const [name, domain] of Object.entries(PLATFORMS)) {
    if (hostname.includes(domain)) {
      return name;
    }
  }

  return null;
}

window.__cpDetectPlatform = detectPlatform;
