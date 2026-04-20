import puppeteer from "puppeteer-core";
import "dotenv/config";

const MODEL     = "claude-haiku-4-5-20251001";
const CPP_LANG  = "73";

const DIV_CONFIG = {
  1: null,
  2: { problems: ["A", "B"], maxAttempts: 2 },
  3: { problems: ["A", "B", "C"], maxAttempts: 1 },
  4: { problems: ["A", "B", "C"], maxAttempts: 1 },
};

const DELAYS = {
  1: [2, 5],
  2: [5, 10],
  3: [8, 14],
};

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function randomDelay(problemIndex) {
  const rank = ["A","B","C"].indexOf(problemIndex) + 1;
  const [min, max] = DELAYS[rank] ?? DELAYS[2];
  const ms = (min + Math.random() * (max - min)) * 60 * 1000;
  console.log(`[CF] Waiting ~${Math.round(ms / 60000)} min before submitting...`);
  await sleep(ms);
}

function detectDivision(name) {
  if (/div\.?\s*4/i.test(name)) return 4;
  if (/div\.?\s*3/i.test(name)) return 3;
  if (/div\.?\s*2/i.test(name)) return 2;
  if (/div\.?\s*1/i.test(name)) return 1;
  return 2;
}

function getChromePath() {
  return (
    process.env.CHROME_PATH ??
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
  );
}

async function callClaude(prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic HTTP ${res.status}`);
  const data = await res.json();
  return data.content[0].text.trim();
}

function buildPrompt(title, statement, retryNote = "") {
  return `You are an expert competitive programmer. Solve this Codeforces problem.

Problem: ${title}
Statement:
${statement.slice(0, 2500)}
${retryNote}
Rules:
- Use #include<bits/stdc++.h> and using namespace std;
- Use int main() with cin/cout.
- Handle multiple test cases if the problem asks for it.
- Return ONLY the solution inside a single \`\`\`cpp code block.
- No explanation, no comments.`;
}

function extractCode(text) {
  const m = text.match(/```(?:cpp)?\n?([\s\S]*?)```/);
  return m ? m[1].trim() : text.trim();
}

async function launchBrowser() {
  return puppeteer.launch({
    executablePath: getChromePath(),
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}

async function setAuth(page) {
  await page.setCookie({
    name: "Codeforces_session",
    value: process.env.CF_SESSION,
    domain: "codeforces.com",
    path: "/",
  });
}

async function fetchStatement(page, contestId, index) {
  await page.goto(
    `https://codeforces.com/contest/${contestId}/problem/${index}`,
    { waitUntil: "networkidle2", timeout: 30000 }
  );

  const loggedIn = await page.$("a[href*='/logout']").then((el) => !!el);
  if (!loggedIn) throw new Error("CF session expired — update CF_SESSION in .env");

  const title = await page
    .$eval(".title", (el) => el.textContent.trim())
    .catch(() => `Problem ${index}`);

  const statement = await page
    .$eval(".problem-statement", (el) => el.innerText.trim())
    .catch(() => null);

  return { title, statement };
}

async function submitSolution(page, contestId, index, code) {
  await page.goto(
    `https://codeforces.com/contest/${contestId}/submit`,
    { waitUntil: "networkidle2", timeout: 30000 }
  );

  await page.select("select[name='submittedProblemIndex']", index);
  await page.select("select[name='programTypeId']", CPP_LANG);

  await page.evaluate((src) => {
    const cm = document.querySelector(".CodeMirror");
    if (cm?.CodeMirror) { cm.CodeMirror.setValue(src); return; }
    const ta = document.querySelector("textarea[name='source']");
    if (ta) ta.value = src;
  }, code);

  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }),
    page.click("input[type='submit']"),
  ]);
}

async function pollVerdict(contestId, timeoutMs = 90000) {
  const handle = process.env.CF_HANDLE;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    await sleep(5000);
    try {
      const res = await fetch(
        `https://codeforces.com/api/contest.status?contestId=${contestId}&handle=${handle}&from=1&count=1`
      );
      const data = await res.json();
      const sub = data?.result?.[0];
      if (!sub) continue;
      if (sub.verdict && sub.verdict !== "TESTING") return sub.verdict;
    } catch {}
  }
  return "UNKNOWN";
}

export async function solveCFContest(contest) {
  const div = detectDivision(contest.title);
  const config = DIV_CONFIG[div];

  if (!config) {
    console.log(`[CF] Skipping ${contest.title} — Div. 1`);
    return;
  }

  console.log(`\n[CF] Starting solver: ${contest.title} (Div. ${div})`);

  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    );
    await setAuth(page);

    for (const index of config.problems) {
      console.log(`\n[CF] Problem ${index}`);

      let title, statement;
      try {
        ({ title, statement } = await fetchStatement(page, contest.titleSlug, index));
      } catch (err) {
        console.log(`[CF] Fetch error: ${err.message}`);
        break;
      }

      if (!statement) { console.log(`[CF] No statement found, skipping`); continue; }

      let code;
      try {
        code = extractCode(await callClaude(buildPrompt(title, statement)));
      } catch (err) {
        console.log(`[CF] Claude error: ${err.message}`); continue;
      }

      await randomDelay(index);

      let accepted = false;
      for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
        console.log(`[CF] Submitting attempt ${attempt}/${config.maxAttempts}...`);
        try {
          await submitSolution(page, contest.titleSlug, index, code);
        } catch (err) {
          console.log(`[CF] Submit error: ${err.message}`); break;
        }

        const verdict = await pollVerdict(contest.titleSlug);
        console.log(`[CF] ${index} verdict: ${verdict}`);

        if (verdict === "OK") { accepted = true; break; }

        if (verdict === "WRONG_ANSWER" && attempt < config.maxAttempts) {
          console.log(`[CF] WA — regenerating with edge case note...`);
          const retry = "\nNote: A previous attempt got Wrong Answer. Think carefully about edge cases and input parsing.";
          try {
            code = extractCode(await callClaude(buildPrompt(title, statement, retry)));
          } catch (err) {
            console.log(`[CF] Claude retry error: ${err.message}`); break;
          }
          await sleep(30000);
        }
      }

      if (!accepted) console.log(`[CF] Could not solve ${index}, moving on`);
    }
  } finally {
    await browser.close();
  }

  console.log(`[CF] Done: ${contest.title}`);
}
