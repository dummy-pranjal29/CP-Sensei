import nodemailer from "nodemailer";
import "dotenv/config";

export async function sendAlert(contest) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.ALERT_EMAIL_FROM,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const startDate = new Date(contest.startTime * 1000);
  const durationMin = Math.floor(contest.duration / 60);

  await transporter.sendMail({
    from: `CP Sensei PA <${process.env.ALERT_EMAIL_FROM}>`,
    to: process.env.ALERT_EMAIL_TO,
    subject: `Contest in 30 min: ${contest.title}`,
    text: [
      `Contest: ${contest.title}`,
      `Starts: ${startDate.toLocaleString()}`,
      `Duration: ${durationMin} minutes`,
      ``,
      `CP Sensei PA will auto-solve the first 3 problems for you.`,
      `Link: https://leetcode.com/contest/${contest.titleSlug}/`,
    ].join("\n"),
  });

  console.log(`[PA] Alert sent for: ${contest.title}`);
}
