"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const learn_by_doing_1 = require("../learn-by-doing");
const router = (0, express_1.Router)();
router.post("/", async (req, res) => {
    try {
        const prompt = (0, learn_by_doing_1.sanitizeLearnByDoingPrompt)(req.body?.prompt);
        const text = await (0, learn_by_doing_1.generateLearnByDoingText)(prompt);
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders?.();
        res.write(text);
        res.end();
    }
    catch (error) {
        console.error("[LearnByDoing] Error:", error);
        if (!res.headersSent) {
            res.status(500).json({ error: "Failed to generate learn-by-doing content" });
            return;
        }
        res.end();
    }
});
exports.default = router;
