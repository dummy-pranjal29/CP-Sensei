import "dotenv/config";
import { getContestProblems, getProblemDetails, submitSolution, checkSubmission } from "./lcApi.js";

const MODEL = "claude-haiku-4-5-20251001";

const DELAYS = {
  Easy:   [3, 6],
  Medium: [6, 12],
  Hard:   [12, 20],
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function randomDelay(minMin, maxMin) {
  const ms = (minMin + Math.random() * (maxMin - minMin)) * 60 * 1000;
  const label = Math.round(ms / 60000);
  console.log(`[PA] Waiting ~${label} min before submitting...`);
  await sleep(ms);
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
  if (!res.ok) throw new Error(`Anthropic error: ${res.status}`);
  const data = await res.json();
  return data.content[0].text.trim();
}

function buildPrompt(problem) {
  const statement = (problem.content ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2000);

  const defaultSnippet = problem.codeSnippets?.find((s) => s.langSlug === "cpp")?.code ?? "";

  return `You are an expert competitive programmer solving a LeetCode contest problem.

Problem: ${problem.title}
Difficulty: ${problem.difficulty}

Statement:
${statement}

Default code snippet:
${defaultSnippet}

Rules:
- Use the EXACT method signature from the default code snippet above.
- Do NOT write a main() function.
- Do NOT add test code or input/output handling.
- Return ONLY the complete solution inside a single \`\`\`cpp code block.
- No explanation, no comments.`;
}

function extractCode(text) {
  const match = text.match(/```(?:cpp)?\n?([\s\S]*?)```/);
  return match ? match[1].trim() : text.trim();
}

async function waitForVerdict(submissionId, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await sleep(3000);
    const result = await checkSubmission(submissionId);
    if (result.state === "SUCCESS") return result;
  }
  return null;
}

export async function solveContest(contest) {
  console.log(`\n[PA] Solver started for: ${contest.title}`);

  await sleep(10000);

  const problems = await getContestProblems(contest.titleSlug);
  if (!problems.length) {
    console.log("[PA] No problems found — will retry in next tick");
    return;
  }

  console.log(`[PA] ${problems.length} problems found`);

  for (let i = 0; i < Math.min(problems.length, 3); i++) {
    const p = problems[i];
    console.log(`\n[PA] Problem ${i + 1}: ${p.title} (${p.difficulty})`);

    let details;
    try {
      details = await getProblemDetails(p.titleSlug);
    } catch (err) {
      console.log(`[PA] Failed to fetch details: ${err.message}`);
      continue;
    }

    if (!details) { console.log("[PA] No details returned, skipping"); continue; }

    let code;
    try {
      const response = await callClaude(buildPrompt(details));
      code = extractCode(response);
    } catch (err) {
      console.log(`[PA] Claude error: ${err.message}`);
      continue;
    }

    const [minDelay, maxDelay] = DELAYS[p.difficulty] ?? DELAYS.Medium;
    await randomDelay(minDelay, maxDelay);

    let submissionId;
    try {
      submissionId = await submitSolution(contest.titleSlug, p.titleSlug, details.questionId, code);
    } catch (err) {
      console.log(`[PA] Submit error: ${err.message}`);
      continue;
    }

    console.log(`[PA] Submitted. Checking verdict...`);
    const verdict = await waitForVerdict(submissionId);
    const status = verdict?.status_msg ?? "unknown";
    console.log(`[PA] Verdict: ${status}`);

    if (status !== "Accepted") {
      console.log(`[PA] Non-AC on ${p.title}, moving to next problem`);
    }
  }

  console.log(`\n[PA] Finished: ${contest.title}`);
}
