import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import express from "express";
import cors from "cors";
import { getHint } from "./hintEngine.js";
import { analyzeCode } from "./codeAnalyzer.js";

config({ path: join(dirname(fileURLToPath(import.meta.url)), ".env") });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.post("/api/hint", async (req, res) => {
  const { problemData, level } = req.body;

  try {
    if (!problemData) {
      return res.status(400).json({ error: "problemData is required" });
    }
    const hint = await getHint(problemData, level);
    return res.json({ hint });
  } catch (err) {
    console.error("[CP Sensei] /api/hint error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.post("/api/analyze", async (req, res) => {
  const { problemData, code } = req.body;
  if (!problemData || !code)
    return res.status(400).json({ error: "problemData and code are required" });

  try {
    const analysis = await analyzeCode(problemData, code);
    return res.json({ analysis });
  } catch (err) {
    console.error("[CP Sensei] /api/analyze error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`CP Sensei backend running on http://localhost:${PORT}`);
});
