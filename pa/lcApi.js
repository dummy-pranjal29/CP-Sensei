import "dotenv/config";

const GQL = "https://leetcode.com/graphql";

function authHeaders() {
  return {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Referer": "https://leetcode.com/",
    "Origin": "https://leetcode.com",
    "Cookie": `LEETCODE_SESSION=${process.env.LC_SESSION}; csrftoken=${process.env.LC_CSRF}`,
    "X-CSRFToken": process.env.LC_CSRF,
  };
}

async function gql(query, variables = {}) {
  const res = await fetch(GQL, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`LC GraphQL error: HTTP ${res.status}`);
  const data = await res.json();
  if (data.errors) throw new Error(data.errors[0].message);
  return data.data;
}

export async function getUpcomingContests() {
  const data = await gql(`{
    allContests {
      title
      titleSlug
      startTime
      duration
    }
  }`);
  const now = Date.now() / 1000;
  return (data?.allContests ?? [])
    .filter((c) => c.startTime > now)
    .map((c) => ({ ...c, platform: "leetcode", url: `https://leetcode.com/contest/${c.titleSlug}/` }));
}

export async function getContestProblems(contestSlug) {
  const data = await gql(
    `query ($titleSlug: String!) {
      contest(titleSlug: $titleSlug) {
        questions {
          title
          titleSlug
          difficulty
        }
      }
    }`,
    { titleSlug: contestSlug }
  );
  return data?.contest?.questions ?? [];
}

export async function getProblemDetails(titleSlug) {
  const data = await gql(
    `query ($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        questionId
        title
        content
        difficulty
        codeSnippets {
          lang
          langSlug
          code
        }
      }
    }`,
    { titleSlug }
  );
  return data?.question ?? null;
}

export async function submitSolution(contestSlug, questionSlug, questionId, code) {
  const url = `https://leetcode.com/contest/${contestSlug}/problems/${questionSlug}/submit/`;
  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      lang: "cpp",
      question_id: String(questionId),
      typed_code: code,
    }),
  });
  if (!res.ok) throw new Error(`Submission HTTP error: ${res.status}`);
  const data = await res.json();
  return data?.submission_id ?? null;
}

export async function checkSubmission(submissionId) {
  const res = await fetch(
    `https://leetcode.com/submissions/detail/${submissionId}/check/`,
    { headers: authHeaders() }
  );
  return res.json();
}
