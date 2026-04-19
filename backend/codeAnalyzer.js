import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import Anthropic from "@anthropic-ai/sdk";

config({ path: join(dirname(fileURLToPath(import.meta.url)), ".env") });

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildAnalysisPrompt(problemData, code) {
  return `
You are CP Sensei, an expert competitive programming mentor.

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
${code}
`.trim();
}

async function analyzeCode(problemData, code) {
  try {
    const prompt = buildAnalysisPrompt(problemData, code);

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    return response.content[0].text.trim();
  } catch (err) {
    throw new Error("Analysis failed: " + err.message);
  }
}

export { analyzeCode };
