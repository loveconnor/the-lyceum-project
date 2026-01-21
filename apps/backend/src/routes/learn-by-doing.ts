import { Router } from "express";
import { generateLearnByDoingText, sanitizeLearnByDoingPrompt } from "../learn-by-doing";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const prompt = sanitizeLearnByDoingPrompt(req.body?.prompt);
    const text = await generateLearnByDoingText(prompt);

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    res.write(text);
    res.end();
  } catch (error: any) {
    console.error("[LearnByDoing] Error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to generate learn-by-doing content" });
      return;
    }
    res.end();
  }
});

export default router;
