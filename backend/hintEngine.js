import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import Anthropic from "@anthropic-ai/sdk";

config({ path: join(dirname(fileURLToPath(import.meta.url)), ".env") });

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const HINT_PROMPTS = {
  1: "Only tell the user which topic or algorithm category this problem belongs to. Nothing more.",
  2: "Give a high-level approach in 1-2 sentences. No code. No specifics.",
  3: "Give a concrete direction — what data structure or technique to use and why. Still no code.",
  4: "Give a pseudocode outline. No actual code.",
  5: "Give the full solution with a clear explanation.",
};

function buildPrompt(problemData, level) {
  const statementPreview =
    problemData.statement?.slice(0, 800) ?? "Not available";
  return `You are CP Sensei, an expert competitive programming mentor.
Be concise and pedagogical. Never give more than what is asked.

Problem: ${problemData.title}
Platform: ${problemData.platform}    
Statement: ${statementPreview}

Hint Level ${level}/5 instruction: ${HINT_PROMPTS[level]}`;
}

async function getHint(problemData, level = 1) {
  const prompt = buildPrompt(problemData, level);
  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    return response.content[0].text.trim();
  } catch (err) {
    throw new Error("Hint generation failed: " + err.message);
  }
}

export { getHint };
