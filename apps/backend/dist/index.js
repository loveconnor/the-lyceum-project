"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./loadEnv");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_1 = require("./auth");
const ai_1 = __importDefault(require("./routes/ai"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const labs_1 = __importDefault(require("./routes/labs"));
const paths_1 = __importDefault(require("./routes/paths"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const waitlist_1 = __importDefault(require("./routes/waitlist"));
const registry_1 = __importDefault(require("./routes/registry"));
const learn_by_doing_1 = __importDefault(require("./routes/learn-by-doing"));
const app = (0, express_1.default)();
const port = process.env.PORT || 8080;
const registryEnabled = process.env.ENABLE_SOURCE_REGISTRY === 'true';
app.use((0, cors_1.default)());
// Increase body size limit to 50MB for file uploads (PDFs encoded as base64)
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ limit: '50mb', extended: true }));
app.get('/', (req, res) => {
    res.json({ message: 'Hello from backend!' });
});
app.get('/protected', auth_1.requireAuth, (req, res) => {
    res.json({ message: 'Hello from protected route!', user: req.user });
});
// AI routes (Gemini Flash 2.x)
app.use('/ai', auth_1.requireAuth, ai_1.default);
app.use('/dashboard', auth_1.requireAuth, dashboard_1.default);
app.use('/labs', auth_1.requireAuth, labs_1.default);
app.use('/paths', auth_1.requireAuth, paths_1.default);
app.use('/notifications', auth_1.requireAuth, notifications_1.default);
// Waitlist (public)
app.use('/waitlist', waitlist_1.default);
// Learn-by-doing (public streaming endpoint)
app.use('/learn-by-doing', learn_by_doing_1.default);
// Source Registry (no auth - service/admin only in production)
if (registryEnabled) {
    app.use('/registry', registry_1.default);
}
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
