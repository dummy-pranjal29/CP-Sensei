console.log("CP Sensei background service worker started");

const SUBMISSIONS_KEY = "cpSenseiSubmissions";
const API_KEY_STORAGE  = "cpSenseiApiKey";
const MAX_ENTRIES = 20;
const MODEL = "claude-haiku-4-5-20251001";

const PROBLEM_KEY = "cpSenseiProblem";
let storedProblem = null;

chrome.runtime.onInstalled.addListener(() => {
  console.log("CP Sensei installed successfully");
});

async function getProblem() {
  if (storedProblem) return storedProblem;
  const result = await chrome.storage.local.get(PROBLEM_KEY);
  return result[PROBLEM_KEY] ?? null;
}

async function getApiKey() {
  const result = await chrome.storage.local.get(API_KEY_STORAGE);
  return result[API_KEY_STORAGE] ?? null;
}

async function callClaude(prompt, maxTokens = 512) {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error("NO_API_KEY");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text.trim();
}

const HINT_PROMPTS = {
  1: "Only tell the user which topic or algorithm category this problem belongs to. Nothing more.",
  2: "Give a high-level approach in 1-2 sentences. No code. No specifics.",
  3: "Give a concrete direction — what data structure or technique to use and why. Still no code.",
  4: "Give a pseudocode outline. No actual code.",
};

const LEVEL_5_PROMPTS = {
  leetcode: `Give the complete working solution.
Rules:
- Use the exact class Solution { public: ... } format LeetCode expects.
- Match the method signature from the problem statement exactly.
- Do NOT write a main() function.
- Wrap the code in a single \`\`\`cpp code block.
- After the code block, give a brief explanation of the approach.`,
  codeforces: `Give the complete working solution.
Rules:
- Use standard competitive programming format with #include<bits/stdc++.h> and int main().
- Wrap the code in a single \`\`\`cpp code block.
- After the code block, give a brief explanation of the approach.`,
  geeksforgeeks: `Give the complete working solution.
Rules:
- Use the class/function signature format GeeksForGeeks expects — no standalone main().
- Wrap the code in a single \`\`\`cpp code block.
- After the code block, give a brief explanation of the approach.`,
  default: `Give the complete working solution.
Rules:
- Wrap the code in a single \`\`\`cpp code block.
- After the code block, give a brief explanation of the approach.`,
};

function buildProfileSection(profiles) {
  if (!profiles || profiles.length === 0) return "";
  const langs = [...new Set(profiles.map((p) => p.lang).filter(Boolean))];
  const style = profiles[0]?.style ?? "standard";
  const experienceLevel = profiles[0]?.level ?? "intermediate";
  const allPatterns = profiles.flatMap((p) => p.patterns ?? []);
  const freq = allPatterns.reduce((acc, p) => { acc[p] = (acc[p] || 0) + 1; return acc; }, {});
  const topPatterns = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([p]) => p);
  const complexity = profiles.map((p) => p.complexity).filter(Boolean)[0] ?? null;
  const lines = [
    `Language: ${langs.join(", ")}`,
    `Style: ${style}`,
    `Experience: ${experienceLevel}`,
    topPatterns.length ? `Frequent patterns: ${topPatterns.join(", ")}` : null,
    complexity ? `Typical complexity: ${complexity}` : null,
  ].filter(Boolean);
  return `\nUser profile (from ${profiles.length} past submission(s)):\n${lines.map((l) => `- ${l}`).join("\n")}\nTailor the hint to match this user's level and style.\n`;
}

function buildHintPrompt(problemData, level, profiles = []) {
  const statementPreview = problemData.statement?.slice(0, 800) ?? "Not available";
  const profileSection = buildProfileSection(profiles);
  const platform = problemData.platform ?? "default";
  const levelInstruction = level === 5
    ? (LEVEL_5_PROMPTS[platform] ?? LEVEL_5_PROMPTS.default)
    : HINT_PROMPTS[level];

  return `You are CP Sensei, an expert competitive programming mentor.
Be concise and pedagogical. Never give more than what is asked.
Do not use markdown bold (**), italic (*), or heading (#) syntax in your response. Write plain text only.
${profileSection}
Problem: ${problemData.title}
Platform: ${platform}
Statement: ${statementPreview}

Hint Level ${level}/5 instruction: ${levelInstruction}`;
}

function buildAnalysisPrompt(problemData, code) {
  return `You are CP Sensei, an expert competitive programming mentor.

Analyze the user's code for the given problem.

Respond in EXACTLY this format with these section headers:

⏱ COMPLEXITY
[Time and space complexity. If it will TLE given the constraints, say so explicitly.]

🐛 CORRECTNESS
[Any logical bugs or wrong answer scenarios. Be specific.]

💥 FAILING TEST CASE
[One concrete input that breaks the code, with expected vs actual output. If correct, write NONE.]

💡 IMPROVEMENT
[One specific, actionable suggestion. No full solutions.]

Problem: ${problemData.title}
Platform: ${problemData.platform}
Statement:
${problemData.statement?.slice(0, 600) ?? "Not available"}

User's Code:
${code}`.trim();
}

async function saveSubmission(entry) {
  const result = await chrome.storage.local.get(SUBMISSIONS_KEY);
  const existing = Array.isArray(result[SUBMISSIONS_KEY]) ? result[SUBMISSIONS_KEY] : [];
  const updated = [entry, ...existing].slice(0, MAX_ENTRIES);
  await chrome.storage.local.set({ [SUBMISSIONS_KEY]: updated });
}

async function getHistory() {
  const result = await chrome.storage.local.get(SUBMISSIONS_KEY);
  return Array.isArray(result[SUBMISSIONS_KEY]) ? result[SUBMISSIONS_KEY] : [];
}

function extractProfile(code, analysis) {
  const lang =
    code.includes("#include") || /vector<|class Solution\s*\{|public:|namespace std/.test(code) ? "cpp"
    : code.includes("import java") || /public\s+class|System\.out/.test(code) ? "java"
    : /def |import |print\(/.test(code) ? "python"
    : /function |const |let |var /.test(code) ? "js"
    : "unknown";
  const style = code.includes("bits/stdc++") ? "competitive"
    : code.includes("public class") ? "academic"
    : "standard";
  const usesSTL = /vector|map|set|unordered|priority_queue|stack|queue/.test(code);
  const patterns = [];
  if (/for[^;]+for/.test(code))               patterns.push("nested-loops");
  if (/while\s*\(/.test(code))                patterns.push("while-loop");
  if (/void\s+\w+\(|int\s+\w+\(/.test(code) && /return\s+\w+\(/.test(code)) patterns.push("recursion");
  if (/sort\(|\.sort\(/.test(code))           patterns.push("sorting");
  if (/unordered_map|HashMap|dict\[/.test(code)) patterns.push("hashing");
  if (/left|right|mid/.test(code))            patterns.push("binary-search");
  if (/dp\[|memo\[/.test(code))               patterns.push("dp");
  const complexityMatch = analysis.match(/O\([^)]+\)/);
  const complexity = complexityMatch ? complexityMatch[0] : null;
  const level =
    patterns.includes("dp") || patterns.includes("binary-search") ? "advanced"
    : patterns.length >= 2 || usesSTL ? "intermediate"
    : "beginner";
  return { lang, style, usesSTL, patterns, complexity, level };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "PROBLEM_DETECTED") {
    console.log("[CP Sensei BG] Problem received:", message.payload);
    storedProblem = message.payload;
    chrome.storage.local.set({ [PROBLEM_KEY]: message.payload });
    sendResponse({ success: true });

  } else if (message.type === "SET_API_KEY") {
    chrome.storage.local.set({ [API_KEY_STORAGE]: message.apiKey })
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;

  } else if (message.type === "GET_HINT") {
    const level = message.level ?? 1;
    Promise.all([getProblem(), getHistory()]).then(([problem, history]) => {
      if (!problem) throw new Error("No problem loaded. Open a problem page first.");
      const profiles = history.filter((s) => s.profile).slice(0, 5).map((s) => s.profile);
      const prompt = buildHintPrompt(problem, level, profiles);
      return callClaude(prompt, level === 5 ? 1024 : 512);
    }).then((hint) => {
      sendResponse({ success: true, hint, level });
    }).catch((err) => {
      sendResponse({ success: false, error: err.message });
    });
    return true;

  } else if (message.type === "ANALYZE_CODE") {
    getProblem().then((problem) => {
      if (!problem) throw new Error("No problem loaded. Open a problem page first.");
      const prompt = buildAnalysisPrompt(problem, message.code);
      return callClaude(prompt, 1024).then((analysis) => {
        const profile = extractProfile(message.code, analysis);
        saveSubmission({
          title: problem.title,
          platform: problem.platform,
          url: problem.url,
          code: message.code,
          savedAt: new Date().toISOString(),
          profile,
        });
        return analysis;
      });
    }).then((analysis) => {
      sendResponse({ success: true, analysis });
    }).catch((err) => {
      sendResponse({ success: false, error: err.message });
    });
    return true;

  } else if (message.type === "VERDICT_DETECTED") {
    getHistory().then((history) => {
      if (history.length > 0) {
        history[0].verdict = message.verdict;
        history[0].verdictAt = new Date().toISOString();
        chrome.storage.local.set({ [SUBMISSIONS_KEY]: history });
      }
      const verdict = message.verdict;
      let nudge = null;
      if (verdict === "TLE") {
        const complexity = history[0]?.profile?.complexity ?? null;
        nudge = complexity
          ? `Your solution runs at ${complexity}. Consider a more efficient approach — binary search, greedy, or DP may help.`
          : "Time limit exceeded. Look for a more efficient algorithm.";
      } else if (verdict === "WA") {
        nudge = "Wrong answer. Check edge cases: empty input, negative numbers, overflow, or off-by-one errors.";
      } else if (verdict === "MLE") {
        nudge = "Memory limit exceeded. Check for large arrays, unnecessary copies, or deep recursion.";
      } else if (verdict === "RE") {
        nudge = "Runtime error. Check for out-of-bounds access, division by zero, or null pointer dereferences.";
      }
      sendResponse({ show: true, verdict, nudge });
    });
    return true;

  } else if (message.type === "SAVE_SUBMISSION") {
    saveSubmission(message.entry)
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;

  } else {
    sendResponse({ success: false, error: "Unknown message type" });
  }

  return true;
});
