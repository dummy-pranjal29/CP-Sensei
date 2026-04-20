import "dotenv/config";
import { getUpcomingContests as getLCContests } from "./lcApi.js";
import { getUpcomingContests as getCFContests } from "./cfApi.js";
import { sendAlert } from "./alerter.js";
import { solveContest } from "./solver.js";
import { solveCFContest } from "./cfSolver.js";

const POLL_MS       = 10 * 60 * 1000;
const ALERT_BEFORE  = 35 * 60;

const alerted = new Set();
const solved  = new Set();

async function tick() {
  let contests;
  try {
    const [lc, cf] = await Promise.allSettled([getLCContests(), getCFContests()]);
    contests = [
      ...(lc.status === "fulfilled" ? lc.value : []),
      ...(cf.status === "fulfilled" ? cf.value : []),
    ];
    if (lc.status === "rejected") console.error("[PA] LC fetch failed:", lc.reason.message);
    if (cf.status === "rejected") console.error("[PA] CF fetch failed:", cf.reason.message);
  } catch (err) {
    console.error("[PA] Failed to fetch contests:", err.message);
    return;
  }

  const now = Date.now() / 1000;

  for (const c of contests) {
    const startsIn = c.startTime - now;
    const isLive   = startsIn <= 0 && startsIn > -c.duration;

    if (startsIn > 0 && startsIn <= ALERT_BEFORE && !alerted.has(c.titleSlug)) {
      alerted.add(c.titleSlug);
      sendAlert(c).catch((err) => console.error("[PA] Alert failed:", err.message));
    }

    if (isLive && !solved.has(c.titleSlug)) {
      solved.add(c.titleSlug);
      if (c.platform === "leetcode") {
        solveContest(c).catch((err) => console.error("[PA] LC solver failed:", err.message));
      } else if (c.platform === "codeforces") {
        solveCFContest(c).catch((err) => console.error("[PA] CF solver failed:", err.message));
      }
    }
  }
}

console.log("[PA] CP Sensei Personal Assistant started");
console.log("[PA] Polling every 10 minutes for upcoming LeetCode and Codeforces contests\n");

tick();
setInterval(tick, POLL_MS);
