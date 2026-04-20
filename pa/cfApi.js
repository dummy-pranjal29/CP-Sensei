export async function getUpcomingContests() {
  const res = await fetch("https://codeforces.com/api/contest.list?gym=false");
  if (!res.ok) throw new Error(`CF API error: HTTP ${res.status}`);
  const data = await res.json();
  if (data.status !== "OK") throw new Error(`CF API: ${data.comment}`);

  const now = Date.now() / 1000;
  return data.result
    .filter((c) => c.phase === "BEFORE")
    .map((c) => ({
      title: c.name,
      titleSlug: String(c.id),
      startTime: c.startTimeSeconds,
      duration: c.durationSeconds,
      platform: "codeforces",
      url: `https://codeforces.com/contest/${c.id}`,
    }))
    .filter((c) => c.startTime > now);
}
