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
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
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
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
