import "dotenv/config";
import { getUpcomingContests } from "./lcApi.js";
import { sendAlert } from "./alerter.js";
import { solveContest } from "./solver.js";

const POLL_MS       = 10 * 60 * 1000;
const ALERT_BEFORE  = 35 * 60;

const alerted = new Set();
const solved  = new Set();

async function tick() {
  let contests;
  try {
    contests = await getUpcomingContests();
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
      solveContest(c).catch((err) => console.error("[PA] Solver failed:", err.message));
    }
  }
}

console.log("[PA] CP Sensei Personal Assistant started");
console.log("[PA] Polling every 10 minutes for upcoming LeetCode contests\n");

tick();
setInterval(tick, POLL_MS);
